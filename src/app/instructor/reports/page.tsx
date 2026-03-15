'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Users,
    AlertTriangle, CheckCircle2, Download, Calendar,
    Loader2, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ClassReport {
    id: string;
    name: string;
    cefrLevel: string;
    studentCount: number;
    attendanceRate: number;
    atRiskStudentIds: string[];
    quizAvg: number | null;
    skills: Record<string, number | null>;
    trend: 'up' | 'down' | 'stable';
}

interface MonthlyPoint {
    month: string;
    avg: number;
    count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SkillBar({ skill, value }: { skill: string; value: number | null }) {
    if (value === null) return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 capitalize">{skill}</span>
                <span className="text-gray-400">—</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full" />
        </div>
    );
    const color = value >= 80 ? 'bg-green-500' : value >= 65 ? 'bg-amber-500' : 'bg-red-500';
    const textColor = value >= 80 ? 'text-green-700' : value >= 65 ? 'text-amber-700' : 'text-red-700';
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 capitalize">{skill}</span>
                <span className={`font-bold ${textColor}`}>{value}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
    const { user } = useAuth();
    const supabase = createClient();

    const [classReports, setClassReports] = useState<ClassReport[]>([]);
    const [monthlyTrend, setMonthlyTrend] = useState<MonthlyPoint[]>([]);
    const [overallAvg, setOverallAvg] = useState<number | null>(null);
    const [atRiskCount, setAtRiskCount] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [avgAttendance, setAvgAttendance] = useState<number | null>(null);
    const [activeClassId, setActiveClassId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const load = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setLoadError('');
        try {
            // ── 1. Get instructor's classes ──────────────────────────────────
            const allClasses = await fetchApi<any[]>('/classes');
            const myClasses = (Array.isArray(allClasses) ? allClasses : [])
                .filter((c: any) => c.teacher?.id === user.id || c.teacherId === user.id);

            if (myClasses.length === 0) {
                setClassReports([]);
                setLoading(false);
                return;
            }

            // ── 2. Parallel: detailed class (students) + attendance per class ─
            const [detailResults, attendanceResults] = await Promise.all([
                Promise.allSettled(myClasses.map(c => fetchApi<any>(`/classes/${c.id}`))),
                Promise.allSettled(myClasses.map(c => fetchApi<any[]>(`/attendance/class/${c.id}`))),
            ]);

            const detailed = detailResults.map((r, i) =>
                r.status === 'fulfilled' ? r.value : { ...myClasses[i], students: [] }
            );
            const attendanceData = attendanceResults.map(r =>
                r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []
            );

            // ── 3. All graded submissions from Supabase ────────────────────
            const { data: allSubs } = await supabase
                .from('submissions')
                .select('student_id, submission_type, score, graded_at')
                .eq('status', 'graded')
                .not('score', 'is', null);
            const subs = allSubs ?? [];

            // ── 4. Build per-class reports ─────────────────────────────────
            const reports: ClassReport[] = detailed.map((cls, i) => {
                const studentIds = new Set<string>((cls.students || []).map((s: any) => s.id));
                const attRecords: any[] = attendanceData[i];

                // Per-student attendance
                const byStudent: Record<string, { total: number; present: number }> = {};
                for (const r of attRecords) {
                    if (!r.studentId) continue;
                    if (!byStudent[r.studentId]) byStudent[r.studentId] = { total: 0, present: 0 };
                    byStudent[r.studentId].total++;
                    if (r.isPresent) byStudent[r.studentId].present++;
                }
                const attRates = Object.values(byStudent)
                    .filter(d => d.total > 0)
                    .map(d => Math.round((d.present / d.total) * 100));
                const attendanceRate = attRates.length > 0
                    ? Math.round(attRates.reduce((a, b) => a + b, 0) / attRates.length)
                    : 0;
                const atRiskStudentIds = Object.entries(byStudent)
                    .filter(([, d]) => d.total > 0 && Math.round((d.present / d.total) * 100) < 70)
                    .map(([id]) => id);

                // Submissions for students in this class
                const classSubs = subs.filter(s => studentIds.has(s.student_id));
                const quizAvg = classSubs.length > 0
                    ? Math.round(classSubs.reduce((a, s) => a + Number(s.score), 0) / classSubs.length)
                    : null;

                // Skill breakdown: group by submission_type
                const byType: Record<string, number[]> = {};
                for (const s of classSubs) {
                    const skill = s.submission_type === 'writing' ? 'writing'
                        : s.submission_type === 'audio' ? 'speaking'
                            : s.submission_type;
                    if (!byType[skill]) byType[skill] = [];
                    byType[skill].push(Number(s.score));
                }
                const avg = (arr: number[]) => arr.length > 0
                    ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
                    : null;
                const skills: Record<string, number | null> = {
                    speaking:  avg(byType['speaking']  ?? []),
                    listening: avg(byType['listening'] ?? []),
                    reading:   avg(byType['reading']   ?? []),
                    writing:   avg(byType['writing']   ?? []),
                };

                // Trend heuristic: quizAvg vs 75 threshold, or stable if no data
                const trend: 'up' | 'down' | 'stable' = quizAvg === null ? 'stable'
                    : quizAvg >= 75 ? 'up' : 'down';

                return {
                    id: cls.id,
                    name: cls.name,
                    cefrLevel: cls.cefrLevel,
                    studentCount: (cls.students || []).length,
                    attendanceRate,
                    atRiskStudentIds,
                    quizAvg,
                    skills,
                    trend,
                };
            });

            // ── 5. Aggregate KPIs ────────────────────────────────────────
            const totalStu = reports.reduce((a, c) => a + c.studentCount, 0);
            const reportsWithAttendance = reports.filter(c => c.attendanceRate > 0);
            const avgAtt = reportsWithAttendance.length > 0
                ? Math.round(reportsWithAttendance.reduce((a, c) => a + c.attendanceRate, 0) / reportsWithAttendance.length)
                : null;
            const reportsWithQuiz = reports.filter(c => c.quizAvg !== null);
            const overall = reportsWithQuiz.length > 0
                ? Math.round(reportsWithQuiz.reduce((a, c) => a + c.quizAvg!, 0) / reportsWithQuiz.length)
                : null;
            const atRisk = new Set(reports.flatMap(c => c.atRiskStudentIds)).size;

            // ── 6. Monthly trend from all graded submissions ───────────────
            const monthlyMap: Record<string, number[]> = {};
            for (const s of subs) {
                if (!s.graded_at) continue;
                const d = new Date(s.graded_at);
                const key = d.toLocaleDateString('en-US', { month: 'short' });
                if (!monthlyMap[key]) monthlyMap[key] = [];
                monthlyMap[key].push(Number(s.score));
            }
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const currentMonth = new Date().getMonth(); // 0-indexed
            // Build last 5 months (including current)
            const last5: MonthlyPoint[] = [];
            for (let i = 4; i >= 0; i--) {
                const idx = (currentMonth - i + 12) % 12;
                const name = MONTHS[idx];
                const scores = monthlyMap[name] ?? [];
                if (scores.length > 0) {
                    last5.push({ month: name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length });
                }
            }

            setClassReports(reports);
            setTotalStudents(totalStu);
            setAvgAttendance(avgAtt);
            setOverallAvg(overall);
            setAtRiskCount(atRisk);
            setMonthlyTrend(last5);
            setActiveClassId(reports[0]?.id ?? null);

        } catch (err: any) {
            setLoadError(err?.message || 'Failed to load reports.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { if (user) load(); }, [user?.id, load]);

    const activeClass = classReports.find(c => c.id === activeClassId) ?? classReports[0] ?? null;
    const maxTrend = monthlyTrend.length > 0 ? Math.max(...monthlyTrend.map(t => t.avg)) + 5 : 100;

    // Trend summary for monthly chart
    const trendSummary = monthlyTrend.length >= 2
        ? (() => {
            const first = monthlyTrend[0].avg;
            const last = monthlyTrend[monthlyTrend.length - 1].avg;
            const diff = last - first;
            return diff > 0 ? `+${diff}% over ${monthlyTrend.length} months` : `${diff}% over ${monthlyTrend.length} months`;
        })()
        : null;

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <p className="text-sm font-medium">Loading reports…</p>
            </div>
        </div>
    );

    if (loadError) return (
        <div className="flex items-center justify-center h-96 flex-col gap-4">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-gray-600">{loadError}</p>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors">
                <RefreshCw className="w-4 h-4" /> Retry
            </button>
        </div>
    );

    if (classReports.length === 0) return (
        <div className="flex items-center justify-center h-96 flex-col gap-4 text-gray-400">
            <BarChart3 className="w-12 h-12 opacity-30" />
            <p className="text-sm">No classes found. Create a class to see reports.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto py-8 px-6 lg:px-8 space-y-8">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-500 mt-1">Performance analytics across all your classes.</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-4 h-4" /> Export PDF
                </button>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Students',    value: totalStudents,                                   icon: <Users className="w-5 h-5 text-brand-primary" />,   bg: 'bg-brand-primary/10' },
                    { label: 'Overall Quiz Avg',  value: overallAvg != null ? `${overallAvg}%` : '—',    icon: <BarChart3 className="w-5 h-5 text-blue-600" />,     bg: 'bg-blue-50'          },
                    { label: 'Avg Attendance',    value: avgAttendance != null ? `${avgAttendance}%` : '—', icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bg: 'bg-green-50'         },
                    { label: 'At-Risk Students',  value: atRiskCount,                                     icon: <AlertTriangle className="w-5 h-5 text-red-600" />,  bg: 'bg-red-50'           },
                ].map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
                        <div className={`${kpi.bg} p-2.5 rounded-xl shrink-0`}>{kpi.icon}</div>
                        <div>
                            <p className="text-xs text-gray-500">{kpi.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Skill Breakdown ── */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h3 className="font-bold text-gray-900">Skill Breakdown by Class</h3>
                        {classReports.length > 1 && (
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                                {classReports.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setActiveClassId(c.id)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${activeClassId === c.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {c.cefrLevel}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {activeClass && (
                        <>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{activeClass.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {activeClass.studentCount} student{activeClass.studentCount !== 1 ? 's' : ''} ·{' '}
                                        Attendance: {activeClass.attendanceRate > 0 ? `${activeClass.attendanceRate}%` : '—'}
                                    </p>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5">
                                    {activeClass.trend === 'up' ? (
                                        <><TrendingUp className="w-4 h-4 text-green-500" />
                                            <span className="text-xs font-semibold text-green-600">Improving</span></>
                                    ) : activeClass.trend === 'down' ? (
                                        <><TrendingDown className="w-4 h-4 text-red-500" />
                                            <span className="text-xs font-semibold text-red-600">Needs Focus</span></>
                                    ) : (
                                        <span className="text-xs font-semibold text-gray-400">No data yet</span>
                                    )}
                                </div>
                            </div>

                            {/* Skill bars */}
                            {Object.values(activeClass.skills).every(v => v === null) ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-300 gap-2">
                                    <BarChart3 className="w-8 h-8" />
                                    <p className="text-xs text-gray-400 text-center">
                                        Skill data will appear after student submissions are graded.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(activeClass.skills).map(([skill, val]) => (
                                        <SkillBar key={skill} skill={skill} value={val} />
                                    ))}
                                </div>
                            )}

                            {/* Weakest / Strongest callout */}
                            {Object.values(activeClass.skills).some(v => v !== null) && (() => {
                                const withData = Object.entries(activeClass.skills).filter(([, v]) => v !== null) as [string, number][];
                                const weakest = withData.sort((a, b) => a[1] - b[1])[0];
                                const strongest = withData.sort((a, b) => b[1] - a[1])[0];
                                if (!weakest || !strongest) return null;
                                return (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1">Weakest Skill</p>
                                            <p className="text-sm font-bold text-red-800 capitalize">{weakest[0]} — {weakest[1]}%</p>
                                            <p className="text-[10px] text-red-600 mt-0.5">Focus area this week</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Strongest Skill</p>
                                            <p className="text-sm font-bold text-green-800 capitalize">{strongest[0]} — {strongest[1]}%</p>
                                            <p className="text-[10px] text-green-600 mt-0.5">Class is excelling</p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>

                {/* ── Monthly Trend + Class Comparison ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-1">Monthly Trend</h3>
                    <p className="text-xs text-gray-400 mb-5">Average quiz score — all classes</p>

                    {monthlyTrend.length > 0 ? (
                        <>
                            <div className="flex items-end justify-between gap-2 h-40">
                                {monthlyTrend.map((m, i) => {
                                    const isLast = i === monthlyTrend.length - 1;
                                    const height = Math.round((m.avg / maxTrend) * 100);
                                    return (
                                        <div key={m.month} className="flex flex-col items-center gap-1.5 flex-1">
                                            <span className="text-[10px] font-bold text-gray-600">{m.avg}%</span>
                                            <div className="w-full rounded-t-lg transition-all duration-700"
                                                style={{ height: `${height}%`, background: isLast ? '#0F6B3E' : '#0F6B3E33' }}
                                            />
                                            <span className="text-[10px] text-gray-400 font-medium">{m.month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {trendSummary && (
                                <div className="mt-4 p-3 bg-brand-primary/5 border border-brand-primary/10 rounded-xl">
                                    <p className="text-xs font-semibold text-brand-primary flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5" /> {trendSummary}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Based on {monthlyTrend.reduce((a, m) => a + m.count, 0)} graded submissions
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-300 gap-2">
                            <BarChart3 className="w-8 h-8" />
                            <p className="text-xs text-gray-400 text-center">No graded submissions yet</p>
                        </div>
                    )}

                    {/* Quiz avg by class */}
                    <div className="mt-5 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quiz Avg by Class</p>
                        {classReports.map(c => (
                            <div key={c.id}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600 font-medium truncate max-w-[120px]">{c.name}</span>
                                    <span className="font-bold text-gray-800 shrink-0 ml-1">
                                        {c.quizAvg != null ? `${c.quizAvg}%` : '—'}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-primary rounded-full transition-all duration-700"
                                        style={{ width: c.quizAvg != null ? `${c.quizAvg}%` : '0%' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Attendance Summary Table ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Attendance Summary</h3>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Class</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Students</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Attendance Rate</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Quiz Avg</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">At Risk</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Trend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {classReports.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setActiveClassId(c.id)}>
                                <td className="px-5 py-4">
                                    <p className="font-semibold text-gray-900">{c.name}</p>
                                    <p className="text-xs text-gray-400">{c.cefrLevel}</p>
                                </td>
                                <td className="px-5 py-4 text-gray-600">{c.studentCount}</td>
                                <td className="px-5 py-4">
                                    {c.attendanceRate > 0 ? (
                                        <div className="flex items-center gap-3">
                                            <span className={`font-bold ${c.attendanceRate >= 85 ? 'text-green-600' : c.attendanceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {c.attendanceRate}%
                                            </span>
                                            <div className="flex-1 max-w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${c.attendanceRate >= 85 ? 'bg-green-500' : c.attendanceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${c.attendanceRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm">—</span>
                                    )}
                                </td>
                                <td className="px-5 py-4 font-semibold text-gray-700">
                                    {c.quizAvg != null ? `${c.quizAvg}%` : '—'}
                                </td>
                                <td className="px-5 py-4">
                                    {c.atRiskStudentIds.length > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                            <AlertTriangle className="w-3 h-3" /> {c.atRiskStudentIds.length}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 className="w-3 h-3" /> None
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    {c.trend === 'up'
                                        ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><TrendingUp className="w-3.5 h-3.5" /> Improving</span>
                                        : c.trend === 'down'
                                            ? <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><TrendingDown className="w-3.5 h-3.5" /> Needs Focus</span>
                                            : <span className="text-xs text-gray-400">—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
