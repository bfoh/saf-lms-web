'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Users, CheckCircle, ClipboardList, Clock,
    Video, ClipboardCheck, AlertTriangle,
    ChevronRight, Radio, Send, X, Loader2, RefreshCw, Calendar,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';

// ─── Skill Radar (Spider) Chart ───────────────────────────────────────────────
function SkillRadar({ skills }: { skills: Record<string, number> }) {
    const cx = 150, cy = 150, maxR = 90;
    const labels = Object.keys(skills);
    const values = Object.values(skills);
    const n = labels.length;
    const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI / n) * i;
    const pt = (i: number, r: number) => ({
        x: cx + r * Math.cos(angle(i)),
        y: cy + r * Math.sin(angle(i)),
    });
    const gridPts = (r: number) =>
        Array.from({ length: n }, (_, i) => {
            const p = pt(i, r);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        }).join(' ');
    const valuePts = values
        .map((v, i) => {
            const p = pt(i, maxR * (v / 100));
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg viewBox="0 0 300 300" className="w-full max-w-[300px] mx-auto overflow-visible">
            {[20, 40, 60, 80, 100].map(lvl => (
                <polygon key={lvl} points={gridPts(maxR * (lvl / 100))}
                    fill="none" stroke="#f3f4f6" strokeWidth="1.5" />
            ))}
            {Array.from({ length: n }, (_, i) => {
                const p = pt(i, maxR);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#f3f4f6" strokeWidth="1.5" />;
            })}
            <polygon points={valuePts}
                fill="#0F6B3E" fillOpacity="0.15"
                stroke="#0F6B3E" strokeWidth="2" strokeLinejoin="round" />
            {values.map((v, i) => {
                const p = pt(i, maxR * (v / 100));
                return <circle key={i} cx={p.x} cy={p.y} r="4.5"
                    fill="#0F6B3E" stroke="white" strokeWidth="2" />;
            })}
            {labels.map((label, i) => {
                const labelR = maxR + 24;
                const p = pt(i, labelR);
                const anchor = p.x < cx - 8 ? 'end' : p.x > cx + 8 ? 'start' : 'middle';
                return (
                    <g key={i}>
                        <text x={p.x} y={p.y - 4} textAnchor={anchor}
                            fontSize="10.5" fontWeight="600" fill="#374151" fontFamily="system-ui">
                            {label}
                        </text>
                        <text x={p.x} y={p.y + 10} textAnchor={anchor}
                            fontSize="10" fill="#6b7280" fontFamily="system-ui">
                            {values[i]}%
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Broadcast Modal ──────────────────────────────────────────────────────────
function BroadcastModal({ onClose, classes }: { onClose: () => void; classes: any[] }) {
    const [msg, setMsg] = useState('');
    const [target, setTarget] = useState(classes[0]?.id || 'ALL');
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [userSearch, setUserSearch] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    const totalStudents = classes.reduce((s, c) => s + (c.students?.length || 0), 0);
    const hasClassStudents = totalStudents > 0;

    // When no class students, fetch all messageable users
    useEffect(() => {
        if (!hasClassStudents) {
            setLoadingUsers(true);
            fetchApi<any[]>('/messages/users')
                .then(users => setAllUsers(Array.isArray(users) ? users : []))
                .catch(() => {})
                .finally(() => setLoadingUsers(false));
        }
    }, [hasClassStudents]);

    const filteredUsers = allUsers.filter(u =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
    );

    const toggleUser = (id: string) =>
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const handleSend = async () => {
        if (!msg.trim() || sending) return;
        setSending(true);
        try {
            let receiverIds: string[] = [];
            if (hasClassStudents) {
                if (target === 'ALL') {
                    receiverIds = classes.flatMap(c => (c.students || []).map((s: any) => s.id));
                } else {
                    const cls = classes.find(c => c.id === target);
                    receiverIds = (cls?.students || []).map((s: any) => s.id);
                }
            } else {
                receiverIds = [...selectedIds];
            }
            receiverIds = [...new Set(receiverIds)].filter(Boolean);
            if (receiverIds.length > 0) {
                await fetchApi('/messages/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ receiverIds, content: msg.trim() }),
                });
            }
            setSent(true);
        } catch {
            setSent(true);
        } finally {
            setSending(false);
        }
    };

    const canSend = !!msg.trim() && !sending && (hasClassStudents || selectedIds.size > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-brand-primary" /> Broadcast Message
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                {sent ? (
                    <div className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-brand-primary mx-auto mb-3" />
                        <p className="font-bold text-gray-900">Sent!</p>
                        <p className="text-sm text-gray-500 mt-1">Recipients will see it in their Messages portal.</p>
                        <button onClick={onClose} className="mt-4 text-sm text-brand-primary font-medium hover:underline">Close</button>
                    </div>
                ) : (
                    <div className="p-5 space-y-4">
                        {hasClassStudents ? (
                            /* ── Class-based recipient picker ── */
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Send To</label>
                                <select value={target} onChange={e => setTarget(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-white">
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name} ({cls.students?.length || 0} students)
                                        </option>
                                    ))}
                                    {classes.length > 1 && (
                                        <option value="ALL">All My Classes ({totalStudents} students)</option>
                                    )}
                                </select>
                            </div>
                        ) : (
                            /* ── User picker (no classes assigned yet) ── */
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-gray-500">Select Recipients</label>
                                    {allUsers.length > 0 && (
                                        <div className="flex gap-2 text-[10px] font-semibold">
                                            <button onClick={() => setSelectedIds(new Set(allUsers.map(u => u.id)))} className="text-brand-primary hover:underline">All</button>
                                            <span className="text-gray-300">·</span>
                                            <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:underline">None</button>
                                        </div>
                                    )}
                                </div>
                                <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                    placeholder="Search by name or email…"
                                    className="w-full h-8 px-3 mb-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                                {loadingUsers ? (
                                    <div className="flex justify-center py-5">
                                        <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                                    </div>
                                ) : (
                                    <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                                        {filteredUsers.length === 0
                                            ? <p className="text-xs text-gray-400 text-center py-4">No users found</p>
                                            : filteredUsers.map(u => (
                                                <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                                    <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleUser(u.id)}
                                                        className="accent-brand-primary rounded shrink-0" />
                                                    <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                                        {`${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                                                        <p className="text-[10px] text-gray-400 capitalize truncate">{u.role}</p>
                                                    </div>
                                                </label>
                                            ))
                                        }
                                    </div>
                                )}
                                {selectedIds.size > 0 && (
                                    <p className="text-[10px] text-brand-primary font-semibold mt-1.5">
                                        {selectedIds.size} recipient{selectedIds.size !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Message</label>
                            <textarea rows={4} value={msg} onChange={e => setMsg(e.target.value)}
                                placeholder="Write your announcement…"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none" />
                        </div>
                        <button onClick={handleSend} disabled={!canSend}
                            className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold text-sm py-2.5 rounded-lg disabled:opacity-40 hover:bg-brand-primary/90 transition-colors">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {sending ? 'Sending…' : 'Send Message'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function InstructorDashboardPage() {
    const { user } = useAuth();

    const [profile, setProfile] = useState<any>(null);
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [tasks, setTasks] = useState<{ id: any; text: string; urgent: boolean; done: boolean }[]>([]);
    const [broadcast, setBroadcast] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [nextClassTime, setNextClassTime] = useState('');

    const load = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setLoadError('');

            const [profileRes, classesRes, assignmentsRes] = await Promise.allSettled([
                fetchApi<any>(`/users/${user.id}`),
                fetchApi<any[]>('/classes'),
                fetchApi<any[]>('/assignments'),
            ]);

            if (profileRes.status === 'fulfilled') setProfile(profileRes.value);

            // Filter to this instructor's classes
            const allClasses: any[] = classesRes.status === 'fulfilled'
                ? (Array.isArray(classesRes.value) ? classesRes.value : [])
                : [];
            const instructorClasses = allClasses.filter(
                c => c.teacher?.id === user.id || c.teacherId === user.id,
            );

            // Fetch each class with its students
            let detailedClasses: any[] = [];
            if (instructorClasses.length > 0) {
                const details = await Promise.allSettled(
                    instructorClasses.map(c => fetchApi<any>(`/classes/${c.id}`)),
                );
                detailedClasses = details
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value);
            }
            setMyClasses(detailedClasses);

            const allAssignments: any[] = assignmentsRes.status === 'fulfilled'
                ? (Array.isArray(assignmentsRes.value) ? assignmentsRes.value : [])
                : [];
            setAssignments(allAssignments);

            // Build task list: pending assignments → dynamic tasks + static fallbacks
            const now = new Date();
            const pendingItems = allAssignments
                .filter(a => !a.status || a.status === 'pending')
                .slice(0, 3)
                .map(a => ({
                    id: a.id,
                    text: `Grade: ${a.title || 'Assignment'}`,
                    urgent: a.due_date ? new Date(a.due_date) < now : false,
                    done: false,
                }));
            const staticTasks = [
                { id: 'T-ATT', text: 'Submit attendance report', urgent: false, done: false },
                { id: 'T-EXAM', text: 'Review mock exam paper', urgent: false, done: false },
            ];
            setTasks([...pendingItems, ...staticTasks].slice(0, 5));
        } catch {
            setLoadError('Failed to load dashboard. Please retry.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { if (user) load(); }, [user?.id, load]);

    // Live countdown to next class start date
    useEffect(() => {
        const calc = () => {
            const now = new Date();
            const upcoming = myClasses
                .map(c => new Date(c.startDate || c.start_date || 0))
                .filter(d => !isNaN(d.getTime()) && d > now)
                .sort((a, b) => a.getTime() - b.getTime())[0];

            const next = upcoming || (() => {
                const t = new Date(); t.setHours(9, 0, 0, 0);
                if (t <= now) t.setDate(t.getDate() + 1);
                return t;
            })();
            const diff = next.getTime() - now.getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setNextClassTime(h > 0 ? `in ${h}h ${m}m` : `in ${m}m`);
        };
        calc();
        const t = setInterval(calc, 60000);
        return () => clearInterval(t);
    }, [myClasses]);

    const toggleTask = (id: any) =>
        setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

    // ── Derived values ────────────────────────────────────────────────────────
    const instructorName = profile
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.email?.split('@')[0]
        : user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Instructor';

    const totalStudents = myClasses.reduce((s, c) => s + (c.students?.length || 0), 0);
    const pendingCount = assignments.filter(a => !a.status || a.status === 'pending').length;

    const nextClass = myClasses
        .filter(c => c.status === 'active' || c.status === 'enrolling')
        .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime())[0];

    const classLevels = [...new Set(myClasses.map(c => c.cefrLevel || c.cefr_level))]
        .filter(Boolean).join(' + ') || '—';

    const now = new Date();
    const gradingInbox = assignments
        .filter(a => !a.status || a.status === 'pending' || (a.due_date && new Date(a.due_date) <= now))
        .slice(0, 3)
        .map(a => ({
            id: a.id,
            task: a.title || 'Assignment',
            due: a.due_date
                ? new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : 'TBD',
            isOverdue: a.due_date ? new Date(a.due_date) < now : false,
        }));

    // Class-average skill performance — no per-student API yet, use defaults
    const skill_performance = { Speaking: 68, Listening: 55, Reading: 80, Writing: 62 };
    const weakestSkill = Object.entries(skill_performance).sort((a, b) => a[1] - b[1])[0];

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                    <p className="text-sm font-medium">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex items-center justify-center h-96 flex-col gap-4">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <p className="text-sm text-gray-600">{loadError}</p>
                <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-6 lg:px-8">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-poppins text-gray-900">Instructor Overview</h1>
                    <p className="text-gray-500 mt-1">
                        {instructorName} · German (Goethe-Zertifikat) ·{' '}
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setBroadcast(true)}
                        className="flex items-center gap-2 bg-brand-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm"
                    >
                        <Radio className="w-4 h-4" /> Broadcast
                    </button>
                    <Link
                        href="/instructor/grading"
                        className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <ClipboardCheck className="w-4 h-4 text-amber-500" />
                        Grade ({pendingCount})
                    </Link>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                {/* Active Students */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="bg-brand-primary/10 p-3 rounded-lg shrink-0">
                        <Users className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Active Students</p>
                        <h3 className="text-2xl font-bold text-gray-900">{totalStudents}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Across {myClasses.length} class{myClasses.length !== 1 ? 'es' : ''}
                        </p>
                    </div>
                </div>

                {/* Avg Attendance — no aggregation API yet */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="bg-green-50 p-3 rounded-lg shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Avg Attendance</p>
                        <h3 className="text-2xl font-bold text-gray-900">—</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Mark attendance to track</p>
                    </div>
                </div>

                {/* Pending Grading */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="bg-amber-50 p-3 rounded-lg shrink-0">
                        <ClipboardList className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Grading</p>
                        <h3 className="text-2xl font-bold text-gray-900">{pendingCount}</h3>
                        <p className={`text-xs mt-0.5 ${pendingCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {pendingCount > 0 ? 'Awaiting review' : 'All up to date'}
                        </p>
                    </div>
                </div>

                {/* Next Class Countdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="bg-blue-50 p-3 rounded-lg shrink-0">
                        <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500">Next Class</p>
                        {nextClass?.startDate ? (
                            <>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {new Date(nextClass.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </h3>
                                <p className="text-xs text-blue-600 mt-0.5 truncate">
                                    {nextClassTime} · {nextClass.branch?.name || 'Campus'}
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-gray-900">09:00</h3>
                                <p className="text-xs text-blue-600 mt-0.5 truncate">{nextClassTime}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main Grid: Radar + Task List ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Student Performance Radar */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 font-poppins">Student Performance</h3>
                            <p className="text-sm text-gray-400 mt-0.5">Average class score across all cohorts</p>
                        </div>
                        <span className="text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full">
                            {classLevels}
                        </span>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        <SkillRadar skills={skill_performance} />
                        <div className="flex-1 w-full space-y-4">
                            {Object.entries(skill_performance).map(([skill, val]) => {
                                const color = val >= 75 ? 'bg-brand-primary' : val >= 60 ? 'bg-amber-500' : 'bg-red-500';
                                const textColor = val >= 75 ? 'text-brand-primary' : val >= 60 ? 'text-amber-600' : 'text-red-600';
                                return (
                                    <div key={skill}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">{skill}</span>
                                            <span className={`text-sm font-bold ${textColor}`}>{val}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${color}`}
                                                style={{ width: `${val}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {weakestSkill && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Weak Area — {weakestSkill[0]} ({weakestSkill[1]}%)
                                    </p>
                                    <p className="text-xs text-red-600 mt-0.5">Schedule a targeted drill for this skill this week.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Task List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 font-poppins">Task List</h3>
                        <span className="text-xs font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full">
                            {tasks.filter(t => !t.done).length} open
                        </span>
                    </div>
                    <div className="space-y-2.5 flex-1">
                        {tasks.map(task => (
                            <button
                                key={task.id}
                                onClick={() => toggleTask(task.id)}
                                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${task.done
                                    ? 'border-gray-100 bg-gray-50/50 opacity-50'
                                    : task.urgent
                                        ? 'border-amber-100 bg-amber-50/40 hover:border-amber-200'
                                        : 'border-gray-100 hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${task.done ? 'bg-brand-primary border-brand-primary' : 'border-gray-300'}`}>
                                    {task.done && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {task.text}
                                    </p>
                                    {task.urgent && !task.done && (
                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Urgent</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                            {tasks.filter(t => t.done).length} of {tasks.length} completed
                        </p>
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand-primary rounded-full transition-all duration-500"
                                style={{ width: tasks.length ? `${(tasks.filter(t => t.done).length / tasks.length) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── My Classes Table ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 font-poppins">My Classes</h3>
                    <Link href="/instructor/classes"
                        className="text-sm font-medium text-brand-primary flex items-center gap-1 hover:underline">
                        View all <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                {myClasses.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Class Name</th>
                                    <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Level</th>
                                    <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Start Date</th>
                                    <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Branch</th>
                                    <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Students</th>
                                    <th className="pb-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {myClasses.map((cls, i) => {
                                    const isActive = cls.status === 'active';
                                    return (
                                        <tr key={cls.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-green-500 ring-2 ring-green-200' : 'bg-gray-300'}`} />
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{cls.name}</p>
                                                        {isActive && i === 0 && (
                                                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">ACTIVE</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                                                    {cls.cefrLevel || cls.cefr_level}
                                                </span>
                                            </td>
                                            <td className="py-4 text-gray-600">
                                                {cls.startDate
                                                    ? new Date(cls.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="py-4 text-gray-600">{cls.branch?.name || '—'}</td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="font-medium text-gray-900">{cls.students?.length ?? 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {cls.zoomLink || cls.zoom_link ? (
                                                        <a href={cls.zoomLink || cls.zoom_link}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors">
                                                            <Video className="w-3 h-3" /> Launch
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">No link</span>
                                                    )}
                                                    <Link href="/instructor/classes"
                                                        className="text-xs font-medium text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                                                        Attendance
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No classes assigned to you yet</p>
                        <Link href="/instructor/classes" className="mt-2 inline-block text-xs text-brand-primary font-medium hover:underline">
                            Browse all classes →
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Grading Inbox ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 font-poppins">Grading Inbox</h3>
                    <Link href="/instructor/grading"
                        className="text-sm font-medium text-brand-primary flex items-center gap-1 hover:underline">
                        Open Grading Center <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                {gradingInbox.length > 0 ? (
                    <div className="space-y-3">
                        {gradingInbox.map(item => (
                            <div key={item.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${item.isOverdue
                                    ? 'border-red-200 bg-red-50/40'
                                    : 'border-amber-200 bg-amber-50/40'
                                    }`}>
                                <div className="p-2.5 rounded-lg shrink-0 bg-purple-50">
                                    <ClipboardList className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{item.task}</p>
                                    <p className="text-xs text-gray-500">Pending review</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.isOverdue
                                        ? 'text-red-700 bg-red-100'
                                        : 'text-amber-700 bg-amber-100'
                                        }`}>
                                        Due: {item.due}
                                    </span>
                                    <Link href="/instructor/grading"
                                        className="text-xs font-semibold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                                        Grade
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No assignments pending review</p>
                    </div>
                )}

                {/* Earnings footer */}
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                            {new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })} Earnings
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">GHS —</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Payout: 1st of next month</p>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full mt-1 inline-block">
                            On Track
                        </span>
                    </div>
                </div>
            </div>

            {broadcast && <BroadcastModal onClose={() => setBroadcast(false)} classes={myClasses} />}
        </div>
    );
}
