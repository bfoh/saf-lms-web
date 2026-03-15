'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    CalendarDays, Clock, BookOpen, CreditCard,
    TrendingUp, CheckCircle2, AlertTriangle, Video,
    Headphones, FileText, Mic, ChevronRight,
    BarChart3, Award, Loader2, RefreshCw, MessageSquare,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { fetchApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SKILL_COLORS: Record<string, string> = {
    Listening: 'bg-brand-primary/60',
    Reading:   'bg-brand-primary',
    Writing:   'bg-brand-primary/45',
    Speaking:  'bg-brand-primary/80',
};

const RESOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
    'Audio':       <Headphones className="w-4 h-4" />,
    'Video':       <Video className="w-4 h-4" />,
    'Article':     <BookOpen className="w-4 h-4" />,
    'Lesson Plan': <BookOpen className="w-4 h-4" />,
    'Worksheet':   <FileText className="w-4 h-4" />,
    'Reference':   <FileText className="w-4 h-4" />,
    'Exam Prep':   <Zap className="w-4 h-4" />,
};

const RESOURCE_TYPE_COLOR: Record<string, string> = {
    'Audio':       'text-purple-600 bg-purple-50',
    'Video':       'text-red-600 bg-red-50',
    'Article':     'text-blue-600 bg-blue-50',
    'Lesson Plan': 'text-brand-primary bg-brand-primary/10',
    'Worksheet':   'text-blue-600 bg-blue-50',
    'Reference':   'text-green-600 bg-green-50',
    'Exam Prep':   'text-orange-600 bg-orange-50',
};

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function cefrProgress(level: string): number {
    const idx = CEFR_LEVELS.indexOf(level);
    return idx >= 0 ? Math.round(((idx + 1) / CEFR_LEVELS.length) * 100) : 0;
}
function formatDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function formatDay(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
}
function formatTime(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, iconBg, note, noteColor }: {
    label: string; value: string | number; icon: React.ReactNode;
    iconBg: string; note?: string; noteColor?: string;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`${iconBg} p-3 rounded-lg shrink-0`}>{icon}</div>
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {note && <p className={`text-xs mt-0.5 ${noteColor || 'text-gray-400'}`}>{note}</p>}
            </div>
        </div>
    );
}

function SectionHeader({ title, href, linkLabel = 'View all' }: { title: string; href: string; linkLabel?: string }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <Link href={href} className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline">
                {linkLabel} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function StudentDashboard() {
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const supabase = createClient();

    const [profile, setProfile] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [enrolledClassIds, setEnrolledClassIds] = useState<Set<string>>(new Set());
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [attendanceStats, setAttendanceStats] = useState<{ totalSessions: number; presentSessions: number; attendanceRate: number } | null>(null);
    const [skillScores, setSkillScores] = useState<Record<string, number> | null>(null);
    const [libraryPicks, setLibraryPicks] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Student';

    const load = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setLoadError('');

            // ── REST API calls ──
            const [profileRes, assignmentsRes, classesRes, invoicesRes, convsRes, attendanceRes] = await Promise.allSettled([
                fetchApi<any>(`/users/${user.id}`),
                fetchApi<any[]>('/assignments'),
                fetchApi<any[]>('/classes'),
                fetchApi<any[]>('/billing'),
                fetchApi<any[]>('/messages/conversations'),
                fetchApi<any>('/attendance/me'),
            ]);

            const profileData = profileRes.status === 'fulfilled' ? profileRes.value : null;
            setProfile(profileData);

            const cefrLevel = profileData?.cefrLevel || user?.user_metadata?.cefr_level || 'A1';

            if (assignmentsRes.status === 'fulfilled')
                setAssignments(Array.isArray(assignmentsRes.value) ? assignmentsRes.value : []);
            if (classesRes.status === 'fulfilled')
                setClasses(Array.isArray(classesRes.value) ? classesRes.value : []);
            if (convsRes.status === 'fulfilled')
                setConversations(Array.isArray(convsRes.value) ? convsRes.value.slice(0, 3) : []);
            if (attendanceRes.status === 'fulfilled' && attendanceRes.value)
                setAttendanceStats(attendanceRes.value);

            // Filter invoices to this student
            if (invoicesRes.status === 'fulfilled') {
                const all = Array.isArray(invoicesRes.value) ? invoicesRes.value : [];
                const mine = all.filter((inv: any) =>
                    inv.student?.id === user.id || inv.studentId === user.id
                );
                setInvoices(mine.length > 0 ? mine : []);
            }

            // ── Supabase queries (parallel) ──
            const [enrollResult, submissionsResult, resourcesResult] = await Promise.allSettled([
                // Classes this student is enrolled in
                supabase.from('class_enrollments').select('class_id').eq('student_id', user.id),
                // Submissions to compute skill scores and update assignment status
                supabase.from('submissions')
                    .select('*')
                    .eq('student_id', user.id),
                // Library picks matching student CEFR level
                supabase.from('resources')
                    .select('id, title, type, cefr_level, file_url')
                    .eq('cefr_level', cefrLevel)
                    .order('created_at', { ascending: false })
                    .limit(3),
            ]);

            // Enrolled class IDs
            if (enrollResult.status === 'fulfilled' && !enrollResult.value.error) {
                const ids = new Set<string>((enrollResult.value.data ?? []).map((r: any) => r.class_id));
                setEnrolledClassIds(ids);
            }

            // Skill scores and submission data
            if (submissionsResult.status === 'fulfilled' && !submissionsResult.value.error) {
                const subs = submissionsResult.value.data ?? [];
                setSubmissions(subs);
                
                const gradedSubs = subs.filter((s: any) => s.status === 'graded' && s.score !== null);
                const byType: Record<string, number[]> = {};
                for (const s of gradedSubs) {
                    const skill = s.submission_type === 'writing' ? 'Writing'
                        : s.submission_type === 'audio' ? 'Speaking'
                            : 'Writing';
                    if (!byType[skill]) byType[skill] = [];
                    byType[skill].push(Number(s.score));
                }
                const computed: Record<string, number> = {};
                for (const [skill, scores] of Object.entries(byType)) {
                    computed[skill] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                }
                setSkillScores(computed);
            }

            // Library picks
            if (resourcesResult.status === 'fulfilled' && !resourcesResult.value.error) {
                setLibraryPicks(resourcesResult.value.data ?? []);
            }

            // ── Live Classroom checks ──
            if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)) {
                const sessionResults = await Promise.allSettled(
                    classesRes.value.map(c => fetchApi<any>(`/live-classroom/class/${c.id}/active`))
                );
                const sessions: Record<string, string> = {};
                classesRes.value.forEach((cls, i) => {
                    const res = sessionResults[i];
                    if (res.status === 'fulfilled' && res.value?.id) {
                        sessions[cls.id] = res.value.id;
                    }
                });
                setActiveSessions(sessions);
            }

        } catch {
            setLoadError('Failed to load dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { 
        if (user) load(); 

        // Real-time listener for grade updates
        if (user?.id) {
            const channel = supabase
                .channel('student-dashboard-submissions')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'submissions',
                        filter: `student_id=eq.${user.id}`,
                    },
                    () => {
                        load();
                    }
                )
                .subscribe();

            const sessionChannel = supabase
                .channel('student-dashboard-sessions')
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
                supabase.removeChannel(channel);
                supabase.removeChannel(sessionChannel);
            };
        }
    }, [user?.id, load]);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <p className="text-sm font-medium">Loading your dashboard…</p>
            </div>
        </div>
    );

    if (loadError) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <p className="text-sm text-gray-600">{loadError}</p>
                <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        </div>
    );

    // ── Derived data ──────────────────────────────────────────────────────────
    const cefrLevel = profile?.cefrLevel || user?.user_metadata?.cefr_level || 'A1';
    const attendanceRate = attendanceStats?.attendanceRate ?? null;
    const totalSessions = attendanceStats?.totalSessions ?? 0;
    // Approximate hours: each session ≈ 2 hours
    const hoursLogged = totalSessions * 2;

    // Merge assignments with submission status
    const mergedAssignments = assignments.map((a: any) => {
        const sub = submissions.find((s: any) => s.assignment_id === a.id);
        if (sub) {
            return {
                ...a,
                status: sub.status,
                score: sub.score
            };
        }
        return a;
    });

    const recentAssignments = mergedAssignments.slice(0, 3);
    const pendingCount = mergedAssignments.filter((a: any) => !a.status || a.status === 'pending' || a.status === 'assigned').length;

    // Filter classes to enrolled ones, then show active/enrolling
    const myClasses = enrolledClassIds.size > 0
        ? classes.filter((c: any) => enrolledClassIds.has(c.id))
        : classes; // fallback: show all if enrollment data unavailable
    const upcomingClasses = myClasses
        .filter((c: any) => {
            const s = (c.status || '').toLowerCase();
            return s === 'active' || s === 'enrolling';
        })
        .sort((a, b) => {
            const aLive = activeSessions[a.id] ? 1 : 0;
            const bLive = activeSessions[b.id] ? 1 : 0;
            return bLive - aLive;
        })
        .slice(0, 3);
    const nextClass = upcomingClasses[0] ?? null;

    const totalDue = invoices
        .filter((inv: any) => {
            const s = (inv.status || '').toLowerCase();
            return s === 'unpaid' || s === 'overdue' || s === 'pending';
        })
        .reduce((sum: number, inv: any) => sum + (parseFloat(inv.amount) || 0), 0);

    // Skill performance: use real computed scores, fill in missing skills with dashes
    const SKILL_NAMES = ['Listening', 'Reading', 'Writing', 'Speaking'];
    const effectiveSkills: Record<string, number | null> = {};
    for (const sk of SKILL_NAMES) {
        effectiveSkills[sk] = skillScores?.[sk] ?? null;
    }
    const hasRealSkills = skillScores && Object.keys(skillScores).length > 0;
    const skillValues = Object.values(effectiveSkills).filter(v => v !== null) as number[];
    const maxSkill = skillValues.length > 0 ? Math.max(...skillValues) + 10 : 100;
    const lowestSkill = skillValues.length > 0
        ? Object.entries(effectiveSkills)
            .filter(([, v]) => v !== null)
            .sort((a, b) => (a[1] as number) - (b[1] as number))[0]
        : null;

    // Overall average from graded assignments
    const gradedAssignments = assignments.filter((a: any) => a.status === 'graded' && a.score != null);
    const calcAverage = gradedAssignments.length > 0
        ? Math.round(gradedAssignments.reduce((sum: number, a: any) => sum + parseFloat(a.score || 0), 0) / gradedAssignments.length)
        : null;
    const overallAverage = profile?.overallAverage ?? calcAverage;

    return (
        <div className="p-6 lg:p-8 space-y-7">

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName} 👋</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {cefrLevel} German Learner ·{' '}
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-brand-primary/10 text-brand-primary text-xs font-bold px-3 py-1.5 rounded-full">
                    <Award className="w-4 h-4" />
                    {cefrLevel} Level · {cefrProgress(cefrLevel)}% to C2
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard
                    label="Attendance Rate"
                    value={attendanceRate !== null ? `${attendanceRate}%` : '—'}
                    icon={<CheckCircle2 className="w-6 h-6 text-brand-primary" />}
                    iconBg="bg-brand-primary/10"
                    note={attendanceRate === null
                        ? 'No records yet'
                        : attendanceRate >= 85
                            ? 'Above 85% requirement'
                            : 'Below 85% — please attend more'}
                    noteColor={attendanceRate === null ? 'text-gray-400' : attendanceRate >= 85 ? 'text-green-600' : 'text-red-500'}
                />
                <KpiCard
                    label="Pending Assignments"
                    value={pendingCount}
                    icon={<FileText className="w-6 h-6 text-blue-600" />}
                    iconBg="bg-blue-50"
                    note={pendingCount > 0 ? 'Action required' : 'All caught up!'}
                    noteColor={pendingCount > 0 ? 'text-amber-600' : 'text-green-600'}
                />
                <KpiCard
                    label="Hours Logged"
                    value={hoursLogged}
                    icon={<Clock className="w-6 h-6 text-purple-600" />}
                    iconBg="bg-purple-50"
                    note={totalSessions > 0 ? `${totalSessions} sessions attended` : 'This semester'}
                />
                <KpiCard
                    label="Balance Due"
                    value={`GHS ${totalDue.toFixed(2)}`}
                    icon={<CreditCard className="w-6 h-6 text-orange-600" />}
                    iconBg="bg-orange-50"
                    note={totalDue > 0 ? 'Outstanding invoice(s)' : 'No outstanding balance'}
                    noteColor={totalDue > 0 ? 'text-orange-600' : 'text-green-600'}
                />
            </div>

            {/* ── Row 1: Skill Chart + Upcoming Class ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Skill Performance */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Skill Performance</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Your {cefrLevel} proficiency breakdown</p>
                        </div>
                        <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full">
                            {cefrLevel} Level
                        </span>
                    </div>

                    {hasRealSkills ? (
                        <div className="flex items-end justify-between gap-3 h-40">
                            {SKILL_NAMES.map(skill => {
                                const val = effectiveSkills[skill];
                                const heightPct = val !== null ? Math.round((val / maxSkill) * 100) : 0;
                                return (
                                    <div key={skill} className="flex flex-col items-center gap-1.5 flex-1">
                                        <span className="text-xs font-bold text-gray-700">
                                            {val !== null ? `${val}%` : '—'}
                                        </span>
                                        <div
                                            className={`w-full rounded-t-lg ${val !== null ? (SKILL_COLORS[skill] || 'bg-brand-primary') : 'bg-gray-100'}`}
                                            style={{ height: val !== null ? `${heightPct}%` : '8px' }}
                                        />
                                        <span className="text-xs text-gray-500 font-medium">{skill}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40 flex-col gap-3 text-gray-300">
                            <BarChart3 className="w-10 h-10" />
                            <p className="text-xs text-gray-400 text-center">
                                Skill scores will appear after your assignments are graded.
                            </p>
                        </div>
                    )}

                    {lowestSkill && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800">
                                <span className="font-semibold">{lowestSkill[0]} ({lowestSkill[1]}%)</span> is your weakest area. Focus on targeted exercises to improve this week.
                            </p>
                        </div>
                    )}
                </div>

                {/* Upcoming Class + Quick Access */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex-1">
                        <h2 className="text-base font-semibold text-gray-900 mb-3">Upcoming Class</h2>
                        {nextClass ? (
                            <div className="p-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5">
                                <p className="text-sm font-bold text-gray-900 mb-1">{nextClass.name}</p>
                                <div className="space-y-1.5 text-xs text-gray-500">
                                    <span className="flex items-center gap-1.5">
                                        <CalendarDays className="w-3.5 h-3.5 text-brand-primary" />
                                        {nextClass.startDate ? formatDate(nextClass.startDate) : 'TBD'}
                                        {nextClass.startDate ? ` · ${formatTime(nextClass.startDate)}` : ''}
                                    </span>
                                    {nextClass.teacher && (
                                        <span className="flex items-center gap-1.5">
                                            <BookOpen className="w-3.5 h-3.5 text-brand-primary" />
                                            {nextClass.teacher.firstName} {nextClass.teacher.lastName}
                                        </span>
                                    )}
                                    {nextClass.branch && (
                                        <span className="flex items-center gap-1.5">
                                            <Award className="w-3.5 h-3.5 text-brand-primary" />
                                            {nextClass.branch.name}
                                        </span>
                                    )}
                                </div>
                                {nextClass.zoomLink || nextClass.zoom_link ? (
                                    <a
                                        href={nextClass.zoomLink || nextClass.zoom_link}
                                        target="_blank" rel="noopener noreferrer"
                                        className="mt-3 flex items-center justify-center gap-2 w-full bg-brand-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
                                    >
                                        <Video className="w-3.5 h-3.5" /> Join Class
                                    </a>
                                ) : activeSessions[nextClass.id] ? (
                                    <Link href={`/student/classroom/${activeSessions[nextClass.id]}`}
                                        className="mt-3 flex items-center justify-center gap-2 w-full bg-brand-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
                                    >
                                        <Video className="w-3.5 h-3.5" /> Join Live Session
                                    </Link>
                                ) : (
                                    <Link href="/student/schedule"
                                        className="mt-3 flex items-center justify-center gap-2 w-full bg-brand-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
                                    >
                                        <CalendarDays className="w-3.5 h-3.5" /> View Schedule
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
                                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">No upcoming classes scheduled</p>
                                <Link href="/student/schedule" className="mt-2 inline-block text-xs text-brand-primary font-medium hover:underline">
                                    View full schedule →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Quick Access */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Access</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Courses',     icon: <BookOpen className="w-4 h-4 text-brand-primary" />, bg: 'bg-brand-primary/10', href: '/student/courses' },
                                { label: 'Assignments', icon: <FileText className="w-4 h-4 text-blue-600" />,      bg: 'bg-blue-50',          href: '/student/assignments' },
                                { label: 'My Grades',   icon: <BarChart3 className="w-4 h-4 text-purple-600" />,   bg: 'bg-purple-50',        href: '/student/grades' },
                                { label: 'Library',     icon: <Headphones className="w-4 h-4 text-amber-600" />,   bg: 'bg-amber-50',         href: '/student/library' },
                            ].map(action => (
                                <Link key={action.label} href={action.href}
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <div className={`${action.bg} p-1.5 rounded-lg shrink-0`}>{action.icon}</div>
                                    <span className="text-xs font-medium text-gray-700">{action.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Grades Snapshot + Schedule ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Grades Snapshot */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <SectionHeader title="Grades & Performance" href="/student/grades" />
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                            { label: 'Overall Average', value: overallAverage != null ? `${overallAverage}%` : '—', icon: <BarChart3 className="w-4 h-4 text-brand-primary" />, bg: 'bg-brand-primary/10' },
                            { label: 'Current Level',   value: cefrLevel,                                              icon: <Award className="w-4 h-4 text-purple-600" />,       bg: 'bg-purple-50'         },
                            { label: 'Assignments Done', value: gradedAssignments.length,                              icon: <TrendingUp className="w-4 h-4 text-blue-600" />,     bg: 'bg-blue-50'           },
                            { label: 'Attendance',      value: attendanceRate != null ? `${attendanceRate}%` : '—',   icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,  bg: 'bg-green-50'          },
                        ].map(stat => (
                            <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <div className={`${stat.bg} p-2 rounded-lg shrink-0`}>{stat.icon}</div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-medium">{stat.label}</p>
                                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link href="/student/grades"
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-brand-primary/20 transition-colors"
                    >
                        <div>
                            <p className="text-xs font-semibold text-gray-700">View detailed grade report</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">All assignments, quizzes & exams</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                </div>

                {/* Weekly Schedule */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <SectionHeader title="This Week's Classes" href="/student/schedule" linkLabel="Full schedule" />
                    {upcomingClasses.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingClasses.map((cls: any) => (
                                <div key={cls.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-brand-primary/20 hover:bg-brand-primary/5 transition-all">
                                    <div className="text-center bg-brand-primary/10 rounded-xl px-3 py-2 shrink-0">
                                        <p className="text-[10px] font-bold text-brand-primary uppercase">
                                            {cls.startDate ? formatDay(cls.startDate) : 'TBD'}
                                        </p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {cls.startDate ? new Date(cls.startDate).getDate() : '—'}
                                        </p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{cls.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {cls.startDate ? formatTime(cls.startDate) : 'Time TBD'}
                                            </span>
                                            {cls.cefrLevel && (
                                                <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-full">
                                                    {cls.cefrLevel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {cls.zoomLink || cls.zoom_link ? (
                                        <a href={cls.zoomLink || cls.zoom_link} target="_blank" rel="noopener noreferrer"
                                            className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-white bg-brand-primary px-2.5 py-1.5 rounded-lg hover:bg-brand-primary/90 transition-colors"
                                        >
                                            <Video className="w-3 h-3" /> Join
                                        </a>
                                    ) : activeSessions[cls.id] ? (
                                        <Link href={`/student/classroom/${activeSessions[cls.id]}`}
                                            className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-white bg-brand-primary px-2.5 py-1.5 rounded-lg hover:bg-brand-primary/90 transition-colors"
                                        >
                                            <Video className="w-3 h-3" /> Join Live
                                        </Link>
                                    ) : (
                                        <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full shrink-0">Active</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No classes scheduled yet</p>
                            <Link href="/student/schedule" className="mt-2 inline-block text-xs text-brand-primary font-medium hover:underline">
                                View schedule →
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 3: Assignments Table ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-semibold text-gray-900">Recent Assignments</h2>
                        {pendingCount > 0 && (
                            <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                                {pendingCount} pending
                            </span>
                        )}
                    </div>
                    <Link href="/student/assignments" className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline">
                        View all <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                {recentAssignments.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Assignment</th>
                                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Due Date</th>
                                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                                <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentAssignments.map((a: any) => (
                                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-brand-primary/10 rounded-lg shrink-0">
                                                <FileText className="w-3.5 h-3.5 text-brand-primary" />
                                            </div>
                                            <span className="font-medium text-gray-900 text-sm">{a.title || a.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-gray-500 text-sm hidden sm:table-cell">
                                        {a.dueDate || a.due_date ? formatDate(a.dueDate || a.due_date) : '—'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {a.status === 'graded' || a.status === 'submitted' ? (
                                            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full w-fit">
                                                <CheckCircle2 className="w-3 h-3" /> {a.status === 'graded' ? 'Graded' : 'Submitted'}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                                                <Clock className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        {a.score != null
                                            ? <span className="text-sm font-bold text-gray-900">{a.score}%</span>
                                            : <span className="text-sm text-gray-400">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-10">
                        <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No assignments yet</p>
                        <Link href="/student/courses" className="mt-2 inline-block text-xs text-brand-primary font-medium hover:underline">
                            Browse your courses →
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Row 4: Messages + Library ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Messages Preview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-gray-900">Messages</h2>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold bg-brand-primary text-white px-1.5 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <Link href="/student/messages" className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline">
                            Open inbox <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    {conversations.length > 0 ? (
                        <div className="space-y-2">
                            {conversations.map((conv: any) => {
                                const other = conv.otherUser || {};
                                const initials = `${other.firstName?.[0] || ''}${other.lastName?.[0] || ''}`.toUpperCase() || '?';
                                const name = `${other.firstName || ''} ${other.lastName || ''}`.trim() || other.email || 'Unknown';
                                const preview = conv.lastMessage?.content || 'No messages yet';
                                const time = conv.lastMessage?.createdAt ? formatDate(conv.lastMessage.createdAt) : '';
                                return (
                                    <Link key={conv.otherId} href="/student/messages"
                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-primary/20 hover:bg-brand-primary/5 transition-all"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                                            <p className="text-xs text-gray-400 truncate">{preview}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            {time && <span className="text-[10px] text-gray-400">{time}</span>}
                                            {conv.unreadCount > 0 && (
                                                <span className="min-w-[16px] h-4 px-1 text-[10px] font-bold bg-brand-primary text-white rounded-full flex items-center justify-center">
                                                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                            <Link href="/student/messages"
                                className="mt-1 flex items-center justify-center gap-1 text-xs text-brand-primary font-medium hover:underline"
                            >
                                Open full inbox <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center mb-3">
                                <MessageSquare className="w-6 h-6 text-brand-primary" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">Check your inbox</p>
                            <p className="text-xs text-gray-400 mt-1">Connect with instructors and peers</p>
                            <Link href="/student/messages"
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors"
                            >
                                Open Messages <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Library Picks */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <SectionHeader title="Recommended Resources" href="/student/library" linkLabel="Browse library" />
                    {libraryPicks.length > 0 ? (
                        <div className="space-y-3">
                            {libraryPicks.map((res: any) => (
                                <Link key={res.id} href="/student/library"
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-primary/20 hover:bg-brand-primary/5 transition-all group"
                                >
                                    <div className={`p-2 rounded-lg shrink-0 ${RESOURCE_TYPE_COLOR[res.type] || 'text-gray-600 bg-gray-100'}`}>
                                        {RESOURCE_TYPE_ICONS[res.type] || <FileText className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{res.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-full">
                                                {res.cefr_level}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{res.type}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-primary transition-colors shrink-0" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-gray-300">
                            <BookOpen className="w-10 h-10 mb-2" />
                            <p className="text-xs text-gray-400">No resources for your level yet.</p>
                            <Link href="/student/library" className="mt-2 text-xs text-brand-primary font-medium hover:underline">
                                Browse all resources →
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Billing Summary ── */}
            {invoices.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <SectionHeader title="Billing Overview" href="/student/billing" linkLabel="View all invoices" />
                    <div className="space-y-2">
                        {invoices.slice(0, 3).map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{inv.cohortName || inv.description || `Invoice #${inv.id?.slice(0, 8)}`}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {inv.dateIssued ? `Issued: ${formatDate(inv.dateIssued)}` : 'No date'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-900">GHS {parseFloat(inv.amount || 0).toFixed(2)}</span>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                        (inv.status || '').toLowerCase() === 'paid'
                                            ? 'text-green-700 bg-green-50'
                                            : (inv.status || '').toLowerCase() === 'overdue'
                                                ? 'text-red-700 bg-red-50'
                                                : 'text-amber-700 bg-amber-50'
                                    }`}>
                                        {(inv.status || 'Pending').charAt(0).toUpperCase() + (inv.status || 'Pending').slice(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {totalDue > 0 && (
                        <Link href="/student/billing"
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-primary/90 transition-colors"
                        >
                            <CreditCard className="w-4 h-4" /> Pay Outstanding Balance · GHS {totalDue.toFixed(2)}
                        </Link>
                    )}
                </div>
            )}

        </div>
    );
}
