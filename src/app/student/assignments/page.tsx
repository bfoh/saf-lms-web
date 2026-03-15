'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
    FileText, Clock, CheckCircle2, Send, Eye,
    Loader2, AlertCircle, InboxIcon, X, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    status: 'pending' | 'submitted' | 'graded';
    score: number | null;
}

interface Submission {
    id: string;
    assignment_id: string;
    status: 'pending' | 'graded';
    score: number | null;
}

type FilterTab = 'all' | 'pending' | 'graded';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Assignment['status'] }) {
    switch (status) {
        case 'pending':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> To Do
                </span>
            );
        case 'submitted':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                    <Send className="w-3 h-3" /> Awaiting Grade
                </span>
            );
        case 'graded':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Graded
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                    {status}
                </span>
            );
    }
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────
function SubmitModal({
    assignment,
    onClose,
}: {
    assignment: Assignment;
    onClose: () => void;
}) {
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit() {
        setSubmitting(true);
        // Simulate network delay — endpoint does not yet exist
        await new Promise((r) => setTimeout(r, 800));
        setSubmitting(false);
        setSuccess(true);
        setTimeout(onClose, 1500);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-brand-primary/10 p-2.5 rounded-xl">
                        <FileText className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Submit Assignment</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{assignment.title}</p>
                    </div>
                </div>

                {success ? (
                    <div className="flex flex-col items-center py-6 gap-3 text-green-600">
                        <CheckCircle2 className="w-10 h-10" />
                        <p className="font-semibold text-gray-900">Submitted successfully!</p>
                    </div>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Notes for your teacher <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            placeholder="Add any notes or questions for your teacher…"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 bg-brand-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {submitting ? 'Submitting…' : 'Submit'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Feedback Panel ───────────────────────────────────────────────────────────
function FeedbackPanel({
    assignment,
    onClose,
}: {
    assignment: Assignment;
    onClose: () => void;
}) {
    const pct = assignment.score ?? 0;
    const color =
        pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
    const barColor =
        pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-green-50 p-2.5 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Feedback</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{assignment.title}</p>
                    </div>
                </div>

                <div className="bg-brand-bg rounded-xl p-5 text-center mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Your Score</p>
                    <p className={`text-5xl font-bold ${color}`}>{pct}%</p>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${barColor} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                <p className="text-sm text-gray-500 text-center">
                    Detailed written feedback from your teacher will appear here once added.
                </p>

                <button
                    onClick={onClose}
                    className="mt-5 w-full border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AssignmentsPage() {
    const { user } = useAuth();
    const supabase = createClient();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<FilterTab>('all');
    const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
    const [feedbackTarget, setFeedbackTarget] = useState<Assignment | null>(null);

    const load = async () => {
        if (!user) return;
        try {
            const [assignmentsData, submissionsResult] = await Promise.allSettled([
                fetchApi<any[]>('/assignments'),
                supabase
                    .from('submissions')
                    .select('id, assignment_id, status, score')
                    .eq('student_id', user.id)
            ]);

            let finalAssignments: Assignment[] = [];
            let currentSubmissions: Submission[] = [];

            if (submissionsResult.status === 'fulfilled' && !submissionsResult.value.error) {
                currentSubmissions = (submissionsResult.value.data ?? []) as Submission[];
                setSubmissions(currentSubmissions);
            }

            if (assignmentsData.status === 'fulfilled') {
                finalAssignments = assignmentsData.value.map(a => {
                    const sub = currentSubmissions.find(s => s.assignment_id === a.id);
                    return {
                        id: a.id,
                        title: a.title,
                        dueDate: a.dueDate || a.due_date,
                        status: sub 
                            ? (sub.status === 'pending' ? 'submitted' : sub.status as any) 
                            : 'pending',
                        score: sub ? sub.score : null
                    };
                });
                setAssignments(finalAssignments);
            }
        } catch (err: any) {
            setError(err.message ?? 'Failed to load assignments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            load();

            const channel = supabase
                .channel('assignments-realtime')
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
        }
    }, [user]);

    const pendingCount = assignments.filter((a) => a.status === 'pending').length;
    const gradedCount = assignments.filter((a) => a.status === 'graded').length;

    const filtered =
        tab === 'all'
            ? assignments
            : tab === 'pending'
            ? assignments.filter((a) => a.status === 'pending' || a.status === 'submitted')
            : assignments.filter((a) => a.status === 'graded');

    const TABS: { key: FilterTab; label: string; count?: number }[] = [
        { key: 'all', label: 'All', count: assignments.length },
        { key: 'pending', label: 'Pending', count: pendingCount },
        { key: 'graded', label: 'Graded', count: gradedCount },
    ];

    return (
        <>
            {submitTarget && (
                <SubmitModal assignment={submitTarget} onClose={() => setSubmitTarget(null)} />
            )}
            {feedbackTarget && (
                <FeedbackPanel assignment={feedbackTarget} onClose={() => setFeedbackTarget(null)} />
            )}

            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Track and submit your work.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> {pendingCount} Pending
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {gradedCount} Graded
                        </span>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                tab === t.key
                                    ? 'bg-white text-brand-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t.label}
                            {t.count !== undefined && (
                                <span
                                    className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                        tab === t.key
                                            ? 'bg-brand-primary text-white'
                                            : 'bg-gray-200 text-gray-500'
                                    }`}
                                >
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* States */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
                        <InboxIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No assignments found.</p>
                        <p className="text-gray-400 text-sm mt-1">
                            {tab !== 'all'
                                ? 'Try switching to the All tab.'
                                : 'Your teacher has not posted any assignments yet.'}
                        </p>
                    </div>
                )}

                {/* Table */}
                {!loading && !error && filtered.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            Assignment
                                        </th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                                            Due Date
                                        </th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            Status
                                        </th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                                            Score
                                        </th>
                                        <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((a) => (
                                        <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-brand-primary/10 rounded-lg shrink-0">
                                                        <FileText className="w-4 h-4 text-brand-primary" />
                                                    </div>
                                                    <p className="font-semibold text-gray-900 truncate max-w-[220px]">
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
                                                <StatusBadge status={a.status} />
                                            </td>
                                            <td className="px-5 py-4 hidden sm:table-cell">
                                                {a.score !== null ? (
                                                    <span
                                                        className={`font-bold text-sm ${
                                                            a.score >= 75
                                                                ? 'text-green-600'
                                                                : a.score >= 50
                                                                ? 'text-amber-600'
                                                                : 'text-red-600'
                                                        }`}
                                                    >
                                                        {a.score}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {a.status === 'pending' && (
                                                    <button
                                                        onClick={() => setSubmitTarget(a)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-primary text-white px-3.5 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
                                                    >
                                                        <Send className="w-3.5 h-3.5" /> Submit
                                                    </button>
                                                )}
                                                {a.status === 'graded' && (
                                                    <button
                                                        onClick={() => setFeedbackTarget(a)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary border border-brand-primary/30 bg-brand-primary/5 px-3.5 py-2 rounded-lg hover:bg-brand-primary/10 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View Feedback
                                                    </button>
                                                )}
                                                {a.status === 'submitted' && (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                                                        <ChevronRight className="w-3.5 h-3.5" /> Awaiting review
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
