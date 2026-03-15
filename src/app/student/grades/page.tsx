'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
    BarChart3, CheckCircle2, Clock, Loader2,
    AlertCircle, InboxIcon, FileText, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    status: 'pending' | 'submitted' | 'graded';
    score: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
    const color =
        score >= 75
            ? 'bg-green-500'
            : score >= 50
            ? 'bg-amber-500'
            : 'bg-red-500';
    const textColor =
        score >= 75
            ? 'text-green-600'
            : score >= 50
            ? 'text-amber-600'
            : 'text-red-600';

    return (
        <div className="flex items-center gap-3 min-w-[160px]">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-500`}
                    style={{ width: `${score}%` }}
                />
            </div>
            <span className={`text-sm font-bold ${textColor} w-10 text-right shrink-0`}>
                {score}%
            </span>
        </div>
    );
}

function StatusBadge({ status }: { status: Assignment['status'] }) {
    if (status === 'graded') {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Graded
            </span>
        );
    }
    if (status === 'submitted') {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Submitted
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Pending
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GradesPage() {
    const { user } = useAuth();
    const supabase = createClient();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [assignmentsData, submissionsData] = await Promise.all([
                fetchApi<Assignment[]>('/assignments'),
                supabase.from('submissions').select('*').eq('student_id', user.id)
            ]);
            
            setAssignments(assignmentsData);
            setSubmissions(submissionsData.data || []);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load grades.');
        } finally {
            setLoading(false);
        }
    }, [user?.id, supabase]);

    useEffect(() => {
        load();
        
        if (!user?.id) return;

        // Subscribe to real-time updates for submissions
        const channel = supabase
            .channel('student-submissions')
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, load, supabase]);

    // Merge assignments with submission status/score
    const mergedAssignments = assignments.map(a => {
        const sub = submissions.find(s => s.assignment_id === a.id);
        if (sub) {
            return {
                ...a,
                status: sub.status as Assignment['status'],
                score: sub.score
            };
        }
        return a;
    });

    const graded = mergedAssignments.filter((a) => a.status === 'graded' && a.score !== null);
    const pending = mergedAssignments.filter((a) => a.status !== 'graded');

    const average =
        graded.length > 0
            ? Math.round(graded.reduce((sum, a) => sum + (a.score ?? 0), 0) / graded.length)
            : null;

    const avgColor =
        average === null
            ? 'text-gray-400'
            : average >= 75
            ? 'text-green-600'
            : average >= 50
            ? 'text-amber-600'
            : 'text-red-600';

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Track your performance across all assignments.
                </p>
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

            {!loading && !error && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            {
                                label: 'Overall Average',
                                value: average !== null ? `${average}%` : 'N/A',
                                valueColor: avgColor,
                                icon: <BarChart3 className="w-5 h-5 text-brand-primary" />,
                                bg: 'bg-brand-primary/10',
                            },
                            {
                                label: 'Graded',
                                value: graded.length,
                                valueColor: 'text-green-600',
                                icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
                                bg: 'bg-green-50',
                            },
                            {
                                label: 'Pending',
                                value: pending.length,
                                valueColor: 'text-amber-600',
                                icon: <Clock className="w-5 h-5 text-amber-600" />,
                                bg: 'bg-amber-50',
                            },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
                            >
                                <div className={`${stat.bg} p-3 rounded-xl shrink-0`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                                    <p className={`text-2xl font-bold ${stat.valueColor}`}>
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty state */}
                    {assignments.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
                            <InboxIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">No assignments yet.</p>
                            <p className="text-gray-400 text-sm mt-1">
                                Your grades will appear here once assignments are posted.
                            </p>
                        </div>
                    )}

                    {/* Graded Assignments Table */}
                    {graded.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                <h2 className="font-semibold text-gray-900 text-sm">
                                    Graded Assignments
                                </h2>
                                <span className="ml-auto text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                    {graded.length}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                Assignment
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                                                Due Date
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                Score
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {graded.map((a) => (
                                            <tr
                                                key={a.id}
                                                className="hover:bg-gray-50/60 transition-colors"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-green-50 rounded-lg shrink-0">
                                                            <FileText className="w-4 h-4 text-green-600" />
                                                        </div>
                                                        <p className="font-semibold text-gray-900 truncate max-w-[200px]">
                                                            {a.title}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-gray-500 hidden md:table-cell">
                                                    {a.dueDate
                                                        ? new Date(a.dueDate).toLocaleDateString('en-GB', {
                                                              day: 'numeric',
                                                              month: 'short',
                                                              year: 'numeric',
                                                          })
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <ScoreBar score={a.score!} />
                                                </td>
                                                <td className="px-5 py-4 hidden sm:table-cell">
                                                    <StatusBadge status={a.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pending Assignments List */}
                    {pending.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600" />
                                <h2 className="font-semibold text-gray-900 text-sm">
                                    Pending / In Progress
                                </h2>
                                <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    {pending.length}
                                </span>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {pending.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors"
                                    >
                                        <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                                            <FileText className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm truncate">
                                                {a.title}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Due{' '}
                                                {a.dueDate
                                                    ? new Date(a.dueDate).toLocaleDateString('en-GB', {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      })
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <StatusBadge status={a.status} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
