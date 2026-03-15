'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';
import { fetchApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const WS_URL = API_URL.replace(/\/api\/?$/, '');

// ─── Types ────────────────────────────────────────────────────────────────────
interface MsgToast {
    id: string;
    senderName: string;
    senderInitials: string;
    preview: string;
    href: string;
}

interface LiveToast {
    id: string;
    className: string;
    instructorName: string;
    href: string;
}

interface NotificationContextValue {
    unreadCount: number;
    refreshUnread: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
    unreadCount: 0,
    refreshUnread: async () => {},
});

// ─── Toast item ───────────────────────────────────────────────────────────────
function MsgToastItem({ toast, onDismiss }: { toast: MsgToast; onDismiss: () => void }) {
    return (
        <div className="animate-toast-in flex items-start gap-3 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 w-72">
            <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: '#0F6B3E' }}
            >
                {toast.senderInitials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{toast.senderName}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{toast.preview}</p>
                <Link
                    href={toast.href}
                    onClick={onDismiss}
                    className="text-xs font-semibold mt-2 inline-block"
                    style={{ color: '#0F6B3E' }}
                >
                    View message →
                </Link>
            </div>
            <button
                onClick={onDismiss}
                className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5 shrink-0"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState<MsgToast[]>([]);
    const [liveToasts, setLiveToasts] = useState<LiveToast[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const classroomSocketRef = useRef<Socket | null>(null);
    // Ref so the socket handler always sees the current value without re-connecting
    const isOnMessagesPageRef = useRef(false);
    const isOnClassroomPageRef = useRef(false);

    // Keep the ref in sync with navigation
    useEffect(() => {
        const onMessages = !!pathname?.includes('/messages');
        isOnMessagesPageRef.current = onMessages;
        if (onMessages) {
            // Dismiss any toasts and re-sync count when user opens the messages page
            setToasts([]);
        }
        isOnClassroomPageRef.current = !!pathname?.includes('/classroom');
        if (isOnClassroomPageRef.current) setLiveToasts([]);
    }, [pathname]);

    // ── Refresh unread count from the API ──────────────────────────────────────
    const refreshUnread = useCallback(async () => {
        try {
            const convs = await fetchApi<Array<{ unreadCount: number }>>('/messages/conversations');
            if (Array.isArray(convs)) {
                setUnreadCount(convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
            }
        } catch {
            // silent — user may not be authenticated yet
        }
    }, []);

    // Load initial count when user signs in, reset on sign-out
    useEffect(() => {
        if (user) {
            refreshUnread();
        } else {
            setUnreadCount(0);
            setToasts([]);
        }
    }, [user?.id, refreshUnread]);

    // Refresh count when navigating to the messages page
    useEffect(() => {
        if (pathname?.includes('/messages') && user) {
            refreshUnread();
        }
    }, [pathname, user, refreshUnread]);

    // ── Global notification socket ────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        let active = true;

        // Derive the messages page href from the user's role
        const role = (user.app_metadata?.role as string) || 'student';
        const messagesHref =
            role === 'admin' || role === 'superadmin'
                ? '/admin/messages'
                : role === 'instructor' || role === 'teacher'
                    ? '/instructor/messages'
                    : '/student/messages';

        const connect = async () => {
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token || !active) return;

            const socket = io(`${WS_URL}/messages`, {
                auth: { token },
                transports: ['websocket', 'polling'],
            });

            socket.io.on('reconnect_attempt', async () => {
                const { data } = await createClient().auth.getSession();
                const fresh = data.session?.access_token;
                if (fresh) socket.auth = { token: fresh };
            });

            socket.on('new_message', (msg: {
                id: string;
                senderId: string;
                content: string;
                sender?: { firstName: string; lastName: string };
            }) => {
                // Bump the unread badge immediately
                setUnreadCount(n => n + 1);

                // Only toast when not already viewing messages
                if (!isOnMessagesPageRef.current) {
                    const firstName = msg.sender?.firstName || '';
                    const lastName = msg.sender?.lastName || '';
                    const senderName = `${firstName} ${lastName}`.trim() || 'New message';
                    const senderInitials =
                        `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';

                    const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    const preview = msg.content.length > 65
                        ? msg.content.slice(0, 62) + '…'
                        : msg.content;

                    setToasts(prev => [
                        ...prev.slice(-2), // cap at 3 toasts
                        { id: toastId, senderName, senderInitials, preview, href: messagesHref },
                    ]);

                    // Auto-dismiss after 5 s
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.id !== toastId));
                    }, 5000);
                }
            });

            // When the recipient reads messages from you, decrement your count
            socket.on('messages_read', () => {
                refreshUnread();
            });

            socketRef.current = socket;
        };

        connect();

        return () => {
            active = false;
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [user?.id, refreshUnread]);

    // ── Classroom live-session notifications (students only) ──────────────────
    useEffect(() => {
        if (!user) return;
        const role = (user.app_metadata?.role as string) || 'student';
        // Only students receive live-class notifications
        if (role !== 'student') return;

        let active = true;

        const connectClassroom = async () => {
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token || !active) return;

            const socket = io(`${WS_URL}/classroom`, {
                auth: { token },
                transports: ['websocket', 'polling'],
            });

            socket.on('class_live', (payload: { sessionId: string; className: string; instructorName: string }) => {
                if (!active || isOnClassroomPageRef.current) return;
                const toastId = `live-${Date.now()}`;
                setLiveToasts(prev => [...prev.slice(-1), {
                    id: toastId,
                    className: payload.className,
                    instructorName: payload.instructorName,
                    href: `/student/classroom/${payload.sessionId}`,
                }]);
                setTimeout(() => {
                    setLiveToasts(prev => prev.filter(t => t.id !== toastId));
                }, 10000);
            });

            classroomSocketRef.current = socket;
        };

        connectClassroom();

        return () => {
            active = false;
            classroomSocketRef.current?.disconnect();
            classroomSocketRef.current = null;
        };
    }, [user?.id]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const dismissLiveToast = useCallback((id: string) => {
        setLiveToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnread }}>
            {children}

            {/* Toast container — bottom-right, above everything */}
            {toasts.length > 0 && (
                <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 items-end">
                    {toasts.map(toast => (
                        <MsgToastItem
                            key={toast.id}
                            toast={toast}
                            onDismiss={() => dismissToast(toast.id)}
                        />
                    ))}
                </div>
            )}

            {/* Live classroom toast — bottom-left */}
            {liveToasts.length > 0 && (
                <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2.5 items-start">
                    {liveToasts.map(lt => (
                        <div key={lt.id}
                            className="animate-toast-in flex items-start gap-3 bg-white border border-green-200 shadow-xl rounded-2xl p-4 w-80">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shrink-0"
                                style={{ background: 'linear-gradient(135deg,#0F6B3E,#1a8a50)' }}>
                                📹
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {lt.className} is live!
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {lt.instructorName} has started a live class
                                </p>
                                <Link
                                    href={lt.href}
                                    onClick={() => dismissLiveToast(lt.id)}
                                    className="text-xs font-semibold mt-2 inline-block"
                                    style={{ color: '#0F6B3E' }}>
                                    Join Now →
                                </Link>
                            </div>
                            <button onClick={() => dismissLiveToast(lt.id)}
                                className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5 shrink-0">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
