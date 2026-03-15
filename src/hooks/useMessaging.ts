'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { fetchApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const WS_URL = API_URL.replace(/\/api\/?$/, '');

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AttachmentInfo {
    url: string;
    name: string;
    size: number;
    type: string;
}

export interface RawMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    sender?: { id: string; firstName: string; lastName: string; email: string };
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentSize?: number | null;
    attachmentType?: string | null;
}

export interface Conversation {
    otherId: string;
    otherUser: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    lastMessage: RawMessage;
    unreadCount: number;
}

export interface UserRecord {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMessaging() {
    const { user } = useAuth();
    const { refreshUnread } = useNotifications();
    const myId = user?.id ?? '';

    // ── State ──────────────────────────────────────────────────────────────────
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [thread, setThread] = useState<RawMessage[]>([]);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewConv, setShowNewConv] = useState(false);
    const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
    const [socketConnected, setSocketConnected] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const activeConvRef = useRef<Conversation | null>(null);
    // Always-current refs — avoids stale closures inside socket event handlers
    const myIdRef = useRef(myId);
    const fetchConversationsRef = useRef<() => Promise<void>>(() => Promise.resolve());

    // Keep refs in sync on every render
    useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
    useEffect(() => { myIdRef.current = myId; }, [myId]);
    // fetchConversationsRef is assigned directly after fetchConversations is defined below

    // ── Computed ───────────────────────────────────────────────────────────────
    const totalUnread = useMemo(
        () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        [conversations],
    );

    const filteredConvos = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const q = searchQuery.toLowerCase();
        return conversations.filter(c => {
            const name = `${c.otherUser?.firstName || ''} ${c.otherUser?.lastName || ''}`.toLowerCase();
            const preview = (c.lastMessage?.content || '').toLowerCase();
            return name.includes(q) || preview.includes(q);
        });
    }, [conversations, searchQuery]);

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    const fetchConversations = useCallback(async () => {
        setLoadingConvs(true);
        try {
            const data = await fetchApi<Conversation[]>('/messages/conversations');
            // Filter out any conversation where the "other" user is ourselves (defensive guard)
            const convs = Array.isArray(data)
                ? data.filter(c => c.otherId !== myId)
                : [];
            setConversations(convs);
        } catch {
            // silent — user may not be authenticated yet
        } finally {
            setLoadingConvs(false);
        }
    }, [myId]);
    // Direct assignment (no effect needed) — safe for "latest callback" refs
    fetchConversationsRef.current = fetchConversations;

    const fetchUsers = useCallback(async () => {
        try {
            const data = await fetchApi<UserRecord[]>('/messages/users');
            // Always filter out the current user — the backend should already do this,
            // but we guard here too in case of auth edge cases in dev mode.
            const filtered = Array.isArray(data)
                ? data.filter(u => u.id !== myId)
                : [];
            setAllUsers(filtered);
        } catch { /* silent */ }
    }, [myId]);

    const fetchThread = useCallback(async (otherId: string, cursor?: string) => {
        if (!cursor) setLoadingThread(true);
        else setLoadingMore(true);

        try {
            const qs = cursor
                ? `/messages/thread/${otherId}?cursor=${encodeURIComponent(cursor)}`
                : `/messages/thread/${otherId}`;
            const data = await fetchApi<{ messages: RawMessage[]; hasMore: boolean }>(qs);
            const raw = data?.messages ?? (Array.isArray(data as any) ? (data as any) : []);
            const more = data?.hasMore ?? false;
            // Always sort ascending by createdAt for stable display order
            const msgs = [...raw].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            if (cursor) {
                setThread(prev => [...msgs, ...prev]);
            } else {
                setThread(msgs);
            }
            setHasMoreMessages(more);
        } catch {
            if (!cursor) setThread([]);
        } finally {
            setLoadingThread(false);
            setLoadingMore(false);
        }
    }, []);

    // ── Socket setup ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        let active = true;

        const connect = async () => {
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token || !active) return;

            // Sanity check: ensure the session belongs to the expected user.
            // If another browser tab logged in as a different user, the session
            // cookie gets overwritten. Connecting with the wrong JWT would route
            // all real-time messages to the wrong socket room.
            const sessionUserId = data.session?.user?.id;
            if (sessionUserId && myIdRef.current && sessionUserId !== myIdRef.current) {
                console.warn('[useMessaging] Session user mismatch — session:', sessionUserId, ', expected:', myIdRef.current, '. Skipping socket connection.');
                return;
            }

            const socket = io(`${WS_URL}/messages`, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
            });

            // Refresh JWT on reconnect
            socket.io.on('reconnect_attempt', async () => {
                const { data } = await createClient().auth.getSession();
                const fresh = data.session?.access_token;
                if (fresh) socket.auth = { token: fresh };
            });

            socket.on('connect', () => {
                setSocketConnected(true);
                // Hydrate initial online presence
                socket.emit('get_online_users');
            });

            socket.on('disconnect', () => setSocketConnected(false));

            // ── Presence ────────────────────────────────────────────────────────
            socket.on('online_users', ({ userIds }: { userIds: string[] }) => {
                setOnlineUsers(new Set(userIds));
            });

            socket.on('user_online', ({ userId }: { userId: string }) => {
                setOnlineUsers(prev => new Set([...prev, userId]));
            });

            socket.on('user_offline', ({ userId }: { userId: string }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            });

            // ── Messages ────────────────────────────────────────────────────────
            socket.on('new_message', (msg: RawMessage) => {
                // If we're in the active conversation with this sender, append the message
                const conv = activeConvRef.current;
                if (conv && (msg.senderId === conv.otherId || msg.receiverId === conv.otherId)) {
                    setThread(prev => [...prev, msg]);
                    // Auto mark-read since we're viewing this thread
                    if (msg.senderId === conv.otherId) {
                        socket.emit('mark_read', { senderId: conv.otherId });
                    }
                }

                // Update conversation list (bump to top, update last message)
                setConversations(prev => {
                    const otherId = msg.senderId === myIdRef.current ? msg.receiverId : msg.senderId;
                    const existing = prev.find(c => c.otherId === otherId);
                    const isActive = activeConvRef.current?.otherId === otherId;

                    if (existing) {
                        const updated: Conversation = {
                            ...existing,
                            lastMessage: msg,
                            unreadCount: isActive ? 0 : existing.unreadCount + 1,
                        };
                        return [updated, ...prev.filter(c => c.otherId !== otherId)];
                    }
                    // New conversation — refresh full list to get user details
                    fetchConversationsRef.current();
                    return prev;
                });
            });

            socket.on('message_sent', (msg: RawMessage) => {
                // Replace the optimistic message with the real one
                setThread(prev => {
                    // Find the last optimistic message for this receiver (safe ES2017 version)
                    let optIdx = -1;
                    for (let i = prev.length - 1; i >= 0; i--) {
                        if (prev[i].id.startsWith('opt-') && prev[i].receiverId === msg.receiverId) {
                            optIdx = i;
                            break;
                        }
                    }
                    if (optIdx === -1) return [...prev, msg];
                    return prev.map((m, i) => (i === optIdx ? msg : m));
                });

                // Update conversation list
                setConversations(prev => {
                    const existing = prev.find(c => c.otherId === msg.receiverId);
                    if (existing) {
                        const updated: Conversation = { ...existing, lastMessage: msg };
                        return [updated, ...prev.filter(c => c.otherId !== msg.receiverId)];
                    }
                    return prev;
                });
            });

            socket.on('messages_read', ({ by }: { by: string }) => {
                // Mark all our sent messages to this user as read
                setThread(prev =>
                    prev.map(m => (m.senderId === myIdRef.current && m.receiverId === by ? { ...m, isRead: true } : m))
                );
                refreshUnread();
            });

            // ── Typing ──────────────────────────────────────────────────────────
            socket.on('user_typing', ({ senderId, isTyping }: { senderId: string; isTyping: boolean }) => {
                setTypingUsers(prev => ({ ...prev, [senderId]: isTyping }));

                // Auto-clear after 3s in case the off event is missed
                if (isTyping) {
                    clearTimeout(typingTimersRef.current[senderId]);
                    typingTimersRef.current[senderId] = setTimeout(() => {
                        setTypingUsers(prev => ({ ...prev, [senderId]: false }));
                    }, 3000);
                }
            });

            socketRef.current = socket;
        };

        connect();

        return () => {
            active = false;
            socketRef.current?.disconnect();
            socketRef.current = null;
            setSocketConnected(false);
        };
    }, [user?.id]);

    // ── Initial data load ──────────────────────────────────────────────────────
    useEffect(() => {
        if (user) {
            fetchConversations();
            fetchUsers();
        }
    }, [user?.id]);

    // ── Actions ────────────────────────────────────────────────────────────────
    const selectConversation = useCallback(async (conv: Conversation) => {
        setActiveConv(conv);
        setThread([]);
        setHasMoreMessages(false);
        // Persist so we can restore when user navigates back
        if (myIdRef.current && typeof window !== 'undefined') {
            localStorage.setItem(`msg_active_${myIdRef.current}`, conv.otherId);
        }
        await fetchThread(conv.otherId);

        // Mark messages as read
        socketRef.current?.emit('mark_read', { senderId: conv.otherId });

        // Clear unread count in local list
        setConversations(prev =>
            prev.map(c => (c.otherId === conv.otherId ? { ...c, unreadCount: 0 } : c))
        );
        refreshUnread();
    }, [fetchThread, refreshUnread]);

    // ── Auto-restore last active conversation after conversations load ──────────
    const hasRestoredRef = useRef(false);
    useEffect(() => {
        if (hasRestoredRef.current || loadingConvs || conversations.length === 0 || activeConv) return;
        const savedId = typeof window !== 'undefined'
            ? localStorage.getItem(`msg_active_${myId}`)
            : null;
        if (savedId) {
            const conv = conversations.find(c => c.otherId === savedId);
            if (conv) {
                hasRestoredRef.current = true;
                selectConversation(conv);
            }
        }
    }, [conversations, loadingConvs, myId, activeConv, selectConversation]);

    const sendMessage = useCallback((content: string, attachment?: AttachmentInfo | null) => {
        const trimmed = content.trim();
        if (!trimmed && !attachment) return;
        if (!activeConv || !socketRef.current) return;

        const optimistic: RawMessage = {
            id: `opt-${Date.now()}`,
            senderId: myId,
            receiverId: activeConv.otherId,
            content: trimmed,
            isRead: false,
            createdAt: new Date().toISOString(),
            sender: {
                id: myId,
                firstName: user?.user_metadata?.first_name || '',
                lastName: user?.user_metadata?.last_name || '',
                email: user?.email || '',
            },
            ...(attachment && {
                attachmentUrl: attachment.url,
                attachmentName: attachment.name,
                attachmentSize: attachment.size,
                attachmentType: attachment.type,
            }),
        };

        setThread(prev => [...prev, optimistic]);
        socketRef.current.emit('send_message', {
            receiverId: activeConv.otherId,
            content: trimmed,
            ...(attachment && { attachment }),
        });
    }, [activeConv, myId, user]);

    const startNewConversation = useCallback((targetUser: UserRecord) => {
        // Check if conversation already exists
        const existing = conversations.find(c => c.otherId === targetUser.id);
        if (existing) {
            selectConversation(existing);
            setShowNewConv(false);
            return;
        }

        // Create a virtual conversation entry
        const virtualConv: Conversation = {
            otherId: targetUser.id,
            otherUser: targetUser,
            lastMessage: null as any,
            unreadCount: 0,
        };
        setConversations(prev => [virtualConv, ...prev]);
        selectConversation(virtualConv);
        setShowNewConv(false);
    }, [conversations, selectConversation]);

    const setTyping = useCallback((isTyping: boolean) => {
        if (!activeConv || !socketRef.current) return;
        socketRef.current.emit('typing', { receiverId: activeConv.otherId, isTyping });
    }, [activeConv]);

    const loadMoreMessages = useCallback(async () => {
        if (!activeConv || !hasMoreMessages || loadingMore || thread.length === 0) return;
        await fetchThread(activeConv.otherId, thread[0].createdAt);
    }, [activeConv, hasMoreMessages, loadingMore, thread, fetchThread]);

    return {
        // State
        user,
        conversations,
        activeConv,
        thread,
        hasMoreMessages,
        onlineUsers,
        typingUsers,
        totalUnread,
        loadingConvs,
        loadingThread,
        loadingMore,
        searchQuery,
        showNewConv,
        allUsers,
        socketConnected,
        myId,
        // Computed
        filteredConvos,
        // Actions
        setSearchQuery,
        setShowNewConv,
        selectConversation,
        sendMessage,
        startNewConversation,
        setTyping,
        loadMoreMessages,
    };
}
