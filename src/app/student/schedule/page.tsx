'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
    CalendarDays, Video, User, Clock, Loader2,
    AlertCircle, InboxIcon, CheckCircle2, BookOpen,
    GraduationCap, Loader,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClassSession {
    id: string;
    name: string;
    cefrLevel: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'enrolling' | 'completed' | string;
    teacher?: { firstName: string; lastName: string };
    branch?: { name: string };
    zoomLink: string | null;
}

type StatusFilter = 'all' | 'active' | 'enrolling' | 'completed';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayLabel(dateStr: string) {
    const d = new Date(dateStr);
    return DAYS[d.getDay()];
}

function getDayShort(dateStr: string) {
    const d = new Date(dateStr);
    return DAY_SHORT[d.getDay()];
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function CefrBadge({ level }: { level: string }) {
    const colors: Record<string, string> = {
        A1: 'bg-blue-50 text-blue-700 border-blue-200',
        A2: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        B1: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
        B2: 'bg-purple-50 text-purple-700 border-purple-200',
        C1: 'bg-rose-50 text-rose-700 border-rose-200',
        C2: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    const cls = colors[level] ?? 'bg-gray-100 text-gray-600 border-gray-200';
    return (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
            {level}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'active') {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Active
            </span>
        );
    }
    if (status === 'enrolling') {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <BookOpen className="w-3 h-3" /> Enrolling
            </span>
        );
    }
    if (status === 'completed') {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full capitalize">
            {status}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [activeSessions, setActiveSessions] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchApi<ClassSession[]>('/classes');
                setClasses(data);

                if (Array.isArray(data)) {
                    const sessionResults = await Promise.allSettled(
                        data.map(c => fetchApi<any>(`/live-classroom/class/${c.id}/active`))
                    );
                    const sessions: Record<string, string> = {};
                    data.forEach((cls, i) => {
                        const res = sessionResults[i];
                        if (res.status === 'fulfilled' && res.value?.id) {
                            sessions[cls.id] = res.value.id;
                        }
                    });
                    setActiveSessions(sessions);
                }
            } catch (err: any) {
                setError(err.message ?? 'Failed to load class schedule.');
            } finally {
                setLoading(false);
            }
        };

        load();

        const sessionChannel = supabase
            .channel('student-schedule-sessions')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_sessions',
                },
                () => {
                    load();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sessionChannel);
        };
    }, []);

    const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'active', label: 'Active' },
        { key: 'enrolling', label: 'Enrolling' },
        { key: 'completed', label: 'Completed' },
    ];

    const filtered =
        statusFilter === 'all'
            ? classes
            : classes.filter((c) => c.status === statusFilter);

    // Group by day of week based on startDate
    const grouped: Record<string, ClassSession[]> = {};
    for (const cls of filtered) {
        const day = getDayLabel(cls.startDate);
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(cls);
    }

    const orderedDays = DAYS.filter((d) => grouped[d]);

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Class Schedule</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {!loading && !error
                            ? `${filtered.length} class${filtered.length !== 1 ? 'es' : ''} found`
                            : 'View your enrolled classes by day.'}
                    </p>
                </div>

                {/* Status filter pills */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                statusFilter === f.key
                                    ? 'bg-white text-brand-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
                    <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No classes found.</p>
                    <p className="text-gray-400 text-sm mt-1">
                        {statusFilter !== 'all'
                            ? 'Try selecting a different filter.'
                            : 'You are not enrolled in any classes yet.'}
                    </p>
                </div>
            )}

            {/* Week view grouped by day */}
            {!loading && !error && orderedDays.length > 0 && (
                <div className="space-y-6">
                    {orderedDays.map((day) => (
                        <div key={day}>
                            {/* Day heading */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-brand-primary text-white text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg">
                                    {DAY_SHORT[DAYS.indexOf(day)]}
                                </div>
                                <h2 className="text-sm font-bold text-gray-700">{day}</h2>
                                <div className="flex-1 h-px bg-gray-100" />
                            </div>

                            {/* Classes for this day */}
                            <div className="space-y-3">
                                {grouped[day].map((cls) => {
                                    const isCompleted = cls.status === 'completed';
                                    const hasZoom = !!(cls.zoomLink && cls.zoomLink.trim());

                                    return (
                                        <div
                                            key={cls.id}
                                            className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                                                isCompleted
                                                    ? 'border-gray-100 opacity-65'
                                                    : 'border-brand-primary/20 hover:shadow-md'
                                            }`}
                                        >
                                            {/* Date column */}
                                            <div
                                                className={`text-center rounded-xl px-4 py-3 shrink-0 w-16 sm:w-auto ${
                                                    isCompleted ? 'bg-gray-100' : 'bg-brand-primary/10'
                                                }`}
                                            >
                                                <p
                                                    className={`text-[10px] font-bold uppercase ${
                                                        isCompleted ? 'text-gray-400' : 'text-brand-primary'
                                                    }`}
                                                >
                                                    {getDayShort(cls.startDate)}
                                                </p>
                                                <p
                                                    className={`text-xl font-bold ${
                                                        isCompleted ? 'text-gray-400' : 'text-gray-900'
                                                    }`}
                                                >
                                                    {new Date(cls.startDate).getDate()}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(cls.startDate).toLocaleString('en', {
                                                        month: 'short',
                                                    })}
                                                </p>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                    <p className="font-semibold text-gray-900 truncate">
                                                        {cls.name}
                                                    </p>
                                                    <CefrBadge level={cls.cefrLevel} />
                                                    <StatusBadge status={cls.status} />
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTime(cls.startDate)} – {formatTime(cls.endDate)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : 'TBA'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <GraduationCap className="w-3 h-3" />
                                                        {cls.branch?.name || 'Main Campus'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Join button */}
                                            {!isCompleted && hasZoom ? (
                                                <a
                                                    href={cls.zoomLink!}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors shrink-0"
                                                >
                                                    <Video className="w-3.5 h-3.5" /> Join
                                                </a>
                                            ) : activeSessions[cls.id] && !isCompleted ? (
                                                <Link
                                                    href={`/student/classroom/${activeSessions[cls.id]}`}
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors shrink-0"
                                                >
                                                    <Video className="w-3.5 h-3.5" /> Join Live
                                                </Link>
                                            ) : !isCompleted ? (
                                                <button
                                                    disabled
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-100 px-4 py-2 rounded-lg cursor-not-allowed shrink-0"
                                                >
                                                    <Video className="w-3.5 h-3.5" /> No link
                                                </button>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 shrink-0">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
