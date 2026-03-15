'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Search, Paperclip, MoreVertical,
    CheckCheck, Check, MessageSquare, UserPlus,
    X, Loader2, ChevronUp, FileText, Download, Image as ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useMessaging, type RawMessage, type Conversation, type UserRecord, type AttachmentInfo } from '@/hooks/useMessaging';

// ─── Attachment Upload ─────────────────────────────────────────────────────────
const BUCKET = 'message-attachments';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

async function uploadAttachment(file: File, userId: string): Promise<AttachmentInfo> {
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw new Error(error.message);

    const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

    return { url: publicUrl, name: file.name, size: file.size, type: file.type };
}

// ─── Attachment Display ────────────────────────────────────────────────────────
function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Renders message text with URLs converted to clickable links.
// Recording URLs (.webm / .mp4) get an inline Download button.
function MessageContent({ content, isSent }: { content: string; isSent: boolean }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return (
        <p className="text-sm leading-relaxed break-all whitespace-pre-wrap" style={{ color: isSent ? '#ffffff' : '#1f2937' }}>
            {parts.map((part, i) => {
                if (/^https?:\/\/[^\s]+$/.test(part)) {
                    const isRecording = /\.(webm|mp4)([?#].*)?$/i.test(part);
                    return (
                        <span key={i} className="inline-flex flex-wrap items-center gap-1.5">
                            <a
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 break-all"
                                style={{ color: isSent ? '#C7F000' : '#0F6B3E' }}
                                onClick={e => e.stopPropagation()}
                            >
                                {part}
                            </a>
                            {isRecording && (
                                <a
                                    href={part}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold no-underline flex-shrink-0"
                                    style={{
                                        background: isSent ? 'rgba(199,240,0,0.2)' : 'rgba(15,107,62,0.1)',
                                        color: isSent ? '#C7F000' : '#0F6B3E',
                                        border: `1px solid ${isSent ? 'rgba(199,240,0,0.4)' : 'rgba(15,107,62,0.3)'}`,
                                    }}
                                >
                                    <Download className="w-2.5 h-2.5" />
                                    Download
                                </a>
                            )}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </p>
    );
}

function AttachmentBubble({
    url, name, size, type, isSent,
}: { url: string; name: string; size: number; type: string; isSent: boolean }) {
    const isImage = type.startsWith('image/');

    if (isImage) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
                <img
                    src={url}
                    alt={name}
                    className="max-w-full rounded-xl"
                    style={{ maxHeight: '220px', objectFit: 'cover' }}
                />
                <p className={`text-[10px] mt-1 ${isSent ? 'text-white/60' : 'text-gray-400'}`}>{name}</p>
            </a>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={name}
            className="flex items-center gap-2.5 mt-1.5 px-3 py-2.5 rounded-xl no-underline transition-all"
            style={{
                background: isSent ? 'rgba(255,255,255,0.15)' : 'rgba(15,107,62,0.06)',
                border: isSent ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(15,107,62,0.15)',
            }}
        >
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: isSent ? 'rgba(255,255,255,0.2)' : 'rgba(15,107,62,0.1)' }}
            >
                <FileText className="w-4 h-4" style={{ color: isSent ? '#fff' : '#0F6B3E' }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isSent ? 'text-white' : 'text-gray-800'}`}>{name}</p>
                <p className={`text-[10px] ${isSent ? 'text-white/60' : 'text-gray-400'}`}>{formatBytes(size)}</p>
            </div>
            <Download className="w-3.5 h-3.5 shrink-0" style={{ color: isSent ? 'rgba(255,255,255,0.7)' : '#0F6B3E' }} />
        </a>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(u?: { firstName?: string; lastName?: string; email?: string } | null) {
    if (!u) return 'A';
    const initialsStr = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
    if (initialsStr) return initialsStr;
    return u.email?.[0]?.toUpperCase() || 'A';
}

function roleBadge(role?: string) {
    const map: Record<string, string> = {
        admin: 'Admin', superadmin: 'Admin',
        instructor: 'Instructor', teacher: 'Teacher',
        student: 'Student',
    };
    return role ? (map[role] || role) : '';
}

function formatConvTime(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatMsgTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getDateLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDate(messages: RawMessage[]) {
    const groups: { date: string; messages: RawMessage[] }[] = [];
    let current = '';
    for (const m of messages) {
        const label = getDateLabel(m.createdAt);
        if (label !== current) {
            current = label;
            groups.push({ date: label, messages: [] });
        }
        groups[groups.length - 1].messages.push(m);
    }
    return groups;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
    'linear-gradient(135deg,#0F6B3E,#1a8a50)',
    'linear-gradient(135deg,#2563eb,#3b82f6)',
    'linear-gradient(135deg,#7c3aed,#a78bfa)',
    'linear-gradient(135deg,#dc2626,#f87171)',
    'linear-gradient(135deg,#d97706,#fbbf24)',
    'linear-gradient(135deg,#0891b2,#22d3ee)',
];

function avatarGradient(id?: string) {
    if (!id) return AVATAR_GRADIENTS[0];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function Avatar({
    user,
    size = 10,
    isOnline = false,
}: {
    user?: { id?: string; firstName?: string; lastName?: string } | null;
    size?: number;
    isOnline?: boolean;
}) {
    return (
        <div className="relative shrink-0">
            <div
                className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-semibold`}
                style={{
                    background: avatarGradient(user?.id),
                    fontSize: size <= 8 ? '0.7rem' : '0.875rem',
                    width: `${size * 4}px`,
                    height: `${size * 4}px`,
                }}
            >
                {initials(user)}
            </div>
            {isOnline && (
                <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ background: '#22c55e' }}
                />
            )}
        </div>
    );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingBubble() {
    return (
        <div className="flex items-end gap-2 mb-2">
            <div
                className="flex items-center gap-1 px-4 py-3 rounded-[18px_18px_18px_4px] bg-white"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            >
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── New Conversation Modal ───────────────────────────────────────────────────
function NewConvModal({
    users,
    onSelect,
    onClose,
}: {
    users: UserRecord[];
    onSelect: (u: UserRecord) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    const filtered = users.filter(u => {
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return name.includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase());
    });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">New Conversation</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            autoFocus
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search by name or email…"
                            className="w-full h-10 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                            style={{ '--tw-ring-color': 'rgba(15,107,62,0.25)' } as any}
                        />
                    </div>
                </div>

                {/* User list */}
                <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                    {filtered.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">No users found</p>
                    ) : (
                        filtered.map(u => (
                            <button
                                key={u.id}
                                onClick={() => onSelect(u)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                                <Avatar user={u} size={9} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {u.firstName || u.lastName 
                                            ? `${u.firstName} ${u.lastName}`.trim() 
                                            : (u.role === 'admin' ? 'Administrator' : u.email.split('@')[0])
                                        }
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                </div>
                                {u.role && (
                                    <span
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                                        style={{ background: 'rgba(15,107,62,0.1)', color: '#0F6B3E' }}
                                    >
                                        {roleBadge(u.role)}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MessagesPage() {
    const {
        user,
        filteredConvos,
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
        setSearchQuery,
        setShowNewConv,
        selectConversation,
        sendMessage,
        startNewConversation,
        setTyping,
        loadMoreMessages,
    } = useMessaging();

    const myFirstName = (user?.user_metadata?.first_name as string) || '';
    const myLastName = (user?.user_metadata?.last_name as string) || '';
    const myRole = (user?.app_metadata?.role as string) || '';
    const myDisplayName = [myFirstName, myLastName].filter(Boolean).join(' ') || user?.email || '';

    const [input, setInput] = useState('');
    const [pendingAttachment, setPendingAttachment] = useState<AttachmentInfo | null>(null);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');
    const [uploadError, setUploadError] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when new messages arrive
    const prevThreadLen = useRef(0);
    useEffect(() => {
        if (thread.length > prevThreadLen.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevThreadLen.current = thread.length;
    }, [thread.length]);

    // File picker handler
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!e.target) return;
        (e.target as HTMLInputElement).value = '';
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setUploadError(`File too large (max 25 MB)`);
            return;
        }
        setUploadError('');
        setUploadState('uploading');
        try {
            const info = await uploadAttachment(file, myId || 'anon');
            setPendingAttachment(info);
            setUploadState('idle');
        } catch (err: any) {
            setUploadState('error');
            setUploadError(err?.message || 'Upload failed');
        }
    }, [myId]);

    // Typing debounce
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
        // Typing indicator
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 2000);
    };

    const handleSend = useCallback(() => {
        if (!input.trim() && !pendingAttachment) return;
        if (uploadState === 'uploading') return;
        sendMessage(input.trim(), pendingAttachment);
        setInput('');
        setPendingAttachment(null);
        setUploadError('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        setTyping(false);
        if (typingTimer.current) clearTimeout(typingTimer.current);
    }, [input, pendingAttachment, uploadState, sendMessage, setTyping]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const grouped = groupByDate(thread);
    const otherIsTyping = activeConv ? !!typingUsers[activeConv.otherId] : false;
    const otherIsOnline = activeConv ? onlineUsers.has(activeConv.otherId) : false;

    // Dot-grid background pattern for main chat area
    const dotGridStyle = {
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        background: '#F6F9F3',
    } as React.CSSProperties;

    return (
        <div className="h-full flex overflow-hidden" style={{ background: '#F6F9F3' }}>
            {/* ── New Conversation Modal ─────────────────────────────────────── */}
            {showNewConv && (
                <NewConvModal
                    users={allUsers}
                    onSelect={startNewConversation}
                    onClose={() => setShowNewConv(false)}
                />
            )}

            {/* ── Sidebar ───────────────────────────────────────────────────── */}
            <aside
                className="w-[320px] shrink-0 flex flex-col bg-white border-r border-gray-100"
                style={{ boxShadow: '2px 0 12px rgba(0,0,0,0.04)' }}
            >
                {/* Sidebar Header */}
                <div className="px-5 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Messages</h1>
                            {totalUnread > 0 && (
                                <span
                                    className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center"
                                    style={{ background: '#0F6B3E' }}
                                >
                                    {totalUnread}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowNewConv(true)}
                            title="New conversation"
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                            style={{ background: '#0F6B3E' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#0a5030')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#0F6B3E')}
                        >
                            <UserPlus className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search conversations…"
                            className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all"
                            style={{ '--tw-ring-color': 'rgba(15,107,62,0.2)' } as any}
                        />
                    </div>

                    {/* Logged-in identity */}
                    {myDisplayName && (
                        <div className="flex items-center gap-1.5 mt-3 px-1">
                            <div
                                className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ background: '#0F6B3E', fontSize: '0.45rem', fontWeight: 700 }}
                            >
                                {myFirstName?.[0]}{myLastName?.[0]}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">
                                Messaging as <span className="font-semibold text-gray-600">{myDisplayName}</span>
                                {myRole && <span className="ml-1 capitalize text-gray-400">· {myRole}</span>}
                            </p>
                        </div>
                    )}
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto py-1">
                    {loadingConvs ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                        </div>
                    ) : filteredConvos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                                style={{ background: '#F0FDF4' }}
                            >
                                <MessageSquare className="w-5 h-5" style={{ color: '#0F6B3E' }} />
                            </div>
                            <p className="text-sm font-medium text-gray-500">No conversations yet</p>
                            <p className="text-xs text-gray-400 mt-1">Start a new message above</p>
                        </div>
                    ) : (
                        filteredConvos.map(c => {
                            const isActive = activeConv?.otherId === c.otherId;
                            const isOnline = onlineUsers.has(c.otherId);
                            return (
                                <button
                                    key={c.otherId}
                                    onClick={() => selectConversation(c)}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 transition-all relative"
                                    style={{
                                        background: isActive ? 'rgba(15,107,62,0.06)' : 'transparent',
                                        borderLeft: isActive ? '3px solid #0F6B3E' : '3px solid transparent',
                                    }}
                                >
                                    <Avatar user={c.otherUser} size={10} isOnline={isOnline} />

                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-gray-900 truncate">
                                                {c.otherUser?.firstName} {c.otherUser?.lastName}
                                            </span>
                                            {c.lastMessage && (
                                                <span className="text-[11px] text-gray-400 shrink-0">
                                                    {formatConvTime(c.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                            <p className="text-xs text-gray-500 truncate">
                                                {c.lastMessage?.content || 'Start a conversation'}
                                            </p>
                                            {c.unreadCount > 0 && (
                                                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shrink-0">
                                                    {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* ── Main Chat Panel ───────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {!activeConv ? (
                    /* Empty state */
                    <div
                        className="flex-1 flex flex-col items-center justify-center"
                        style={dotGridStyle}
                    >
                        <div
                            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                            style={{ background: 'rgba(15,107,62,0.08)' }}
                        >
                            <MessageSquare className="w-9 h-9" style={{ color: '#0F6B3E' }} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-700 mb-1">Your Messages</h2>
                        <p className="text-sm text-gray-400 text-center max-w-xs">
                            Select a conversation from the left, or start a new one.
                        </p>
                        <button
                            onClick={() => setShowNewConv(true)}
                            className="mt-5 h-10 px-5 rounded-xl text-sm font-semibold text-white transition-all"
                            style={{ background: '#0F6B3E' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#0a5030')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#0F6B3E')}
                        >
                            Start a conversation
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 bg-white border-b border-gray-100 flex items-center gap-3 px-5 shrink-0"
                            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <Avatar
                                user={activeConv.otherUser}
                                size={10}
                                isOnline={otherIsOnline}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 leading-none">
                                    {activeConv.otherUser?.firstName} {activeConv.otherUser?.lastName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {activeConv.otherUser?.role && (
                                        <span
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                            style={{ background: 'rgba(15,107,62,0.1)', color: '#0F6B3E' }}
                                        >
                                            {roleBadge(activeConv.otherUser.role)}
                                        </span>
                                    )}
                                    <span className={`text-[11px] font-medium ${otherIsOnline ? 'text-green-500' : 'text-gray-400'}`}>
                                        {otherIsOnline ? '● Online' : '○ Offline'}
                                    </span>
                                </div>
                            </div>
                            <button className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollAreaRef}
                            className="flex-1 overflow-y-auto px-5 py-4"
                            style={dotGridStyle}
                        >
                            {/* Load older messages */}
                            {hasMoreMessages && (
                                <div className="flex justify-center mb-4">
                                    <button
                                        onClick={loadMoreMessages}
                                        disabled={loadingMore}
                                        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {loadingMore ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        )}
                                        Load older messages
                                    </button>
                                </div>
                            )}

                            {loadingThread ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                                </div>
                            ) : thread.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                                        style={{ background: 'rgba(15,107,62,0.06)' }}
                                    >
                                        <MessageSquare className="w-6 h-6" style={{ color: '#0F6B3E' }} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">No messages yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Say hello to start the conversation!</p>
                                </div>
                            ) : (
                                grouped.map(group => (
                                    <div key={group.date}>
                                        {/* Date separator */}
                                        <div className="flex items-center gap-3 my-4">
                                            <div className="flex-1 h-px bg-gray-200" />
                                            <span className="text-[11px] font-medium text-gray-400 shrink-0 px-2">
                                                {group.date}
                                            </span>
                                            <div className="flex-1 h-px bg-gray-200" />
                                        </div>

                                        {group.messages.map(msg => {
                                            const isSent = msg.senderId === myId;
                                            const isOpt = msg.id.startsWith('opt-');

                                            // Derive the true sender name from the message payload
                                            const senderUser = msg.sender ?? activeConv.otherUser;
                                            const senderName = !isSent
                                                ? [senderUser?.firstName, senderUser?.lastName].filter(Boolean).join(' ')
                                                : '';

                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex mb-1.5 ${isSent ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    {!isSent && (
                                                        <div className="mr-2 mt-auto mb-1">
                                                            <Avatar user={senderUser} size={7} />
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col max-w-[70%]">
                                                        {/* Sender name label — shows who actually sent each received message */}
                                                        {!isSent && senderName && (
                                                            <span
                                                                className="text-[10px] font-semibold mb-0.5 ml-1"
                                                                style={{ color: '#0F6B3E' }}
                                                            >
                                                                {senderName}
                                                            </span>
                                                        )}

                                                        <div
                                                            className="px-3.5 py-2.5"
                                                            style={isSent ? {
                                                                background: 'linear-gradient(135deg,#0F6B3E,#1a8a50)',
                                                                borderRadius: '18px 18px 4px 18px',
                                                                opacity: isOpt ? 0.7 : 1,
                                                            } : {
                                                                background: '#ffffff',
                                                                borderRadius: '18px 18px 18px 4px',
                                                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                                            }}
                                                        >
                                                            {msg.content && (
                                                                <MessageContent
                                                                    content={msg.content}
                                                                    isSent={isSent}
                                                                />
                                                            )}
                                                            {msg.attachmentUrl && msg.attachmentName && (
                                                                <AttachmentBubble
                                                                    url={msg.attachmentUrl}
                                                                    name={msg.attachmentName}
                                                                    size={msg.attachmentSize ?? 0}
                                                                    type={msg.attachmentType ?? 'application/octet-stream'}
                                                                    isSent={isSent}
                                                                />
                                                            )}
                                                            <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                                                                <span
                                                                    className="text-[10px]"
                                                                    style={{ color: isSent ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}
                                                                >
                                                                    {formatMsgTime(msg.createdAt)}
                                                                </span>
                                                                {isSent && !isOpt && (
                                                                    msg.isRead ? (
                                                                        <CheckCheck className="w-3 h-3" style={{ color: '#C7F000' }} />
                                                                    ) : (
                                                                        <CheckCheck className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
                                                                    )
                                                                )}
                                                                {isSent && isOpt && (
                                                                    <Check className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}

                            {/* Typing indicator */}
                            {otherIsTyping && <TypingBubble />}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Composer */}
                        <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.mp4,.mp3"
                                onChange={handleFileChange}
                            />

                            {!socketConnected && (
                                <p className="text-[11px] text-amber-500 text-center mb-2 font-medium">
                                    Reconnecting…
                                </p>
                            )}

                            {/* Pending attachment chip */}
                            {(pendingAttachment || uploadState === 'uploading') && (
                                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50">
                                    {uploadState === 'uploading' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: '#0F6B3E' }} />
                                            <span className="text-xs text-gray-500 truncate flex-1">Uploading…</span>
                                        </>
                                    ) : pendingAttachment && (
                                        <>
                                            {pendingAttachment.type.startsWith('image/') ? (
                                                <ImageIcon className="w-4 h-4 shrink-0" style={{ color: '#0F6B3E' }} />
                                            ) : (
                                                <FileText className="w-4 h-4 shrink-0" style={{ color: '#0F6B3E' }} />
                                            )}
                                            <span className="text-xs font-medium text-gray-700 truncate flex-1">{pendingAttachment.name}</span>
                                            <span className="text-[10px] text-gray-400 shrink-0">{formatBytes(pendingAttachment.size)}</span>
                                            <button
                                                onClick={() => setPendingAttachment(null)}
                                                className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Upload error */}
                            {uploadError && (
                                <p className="text-[11px] text-red-500 mb-2 px-1">{uploadError}</p>
                            )}

                            <div
                                className="flex items-end gap-2 rounded-2xl border border-gray-200 px-3 py-2"
                                style={{ background: '#f9fafb' }}
                            >
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadState === 'uploading'}
                                    title="Attach file (max 25 MB)"
                                    className="transition-colors mb-1 shrink-0 disabled:opacity-40"
                                    style={{ color: pendingAttachment ? '#0F6B3E' : undefined }}
                                    onMouseEnter={e => !pendingAttachment && ((e.currentTarget as HTMLElement).style.color = '#0F6B3E')}
                                    onMouseLeave={e => !pendingAttachment && ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                                >
                                    <Paperclip
                                        className="w-4 h-4"
                                        style={{ color: pendingAttachment ? '#0F6B3E' : '#9ca3af' }}
                                    />
                                </button>
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={pendingAttachment ? 'Add a caption… (optional)' : 'Type a message…'}
                                    rows={1}
                                    className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none py-0.5 max-h-24 leading-relaxed"
                                    style={{ minHeight: '22px' }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!input.trim() && !pendingAttachment) || !socketConnected || uploadState === 'uploading'}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0 transition-all disabled:opacity-40 mb-0.5"
                                    style={{
                                        background: ((input.trim() || pendingAttachment) && socketConnected && uploadState !== 'uploading')
                                            ? 'linear-gradient(135deg,#0F6B3E,#1a8a50)'
                                            : '#e5e7eb',
                                    }}
                                >
                                    <Send
                                        className="w-3.5 h-3.5"
                                        style={{ color: ((input.trim() || pendingAttachment) && socketConnected) ? '#fff' : '#9ca3af' }}
                                    />
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-300 text-center mt-1.5">
                                Enter to send · Shift+Enter for new line · 📎 max 25 MB
                            </p>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
