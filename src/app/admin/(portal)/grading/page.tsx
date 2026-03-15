"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, User, PenTool, Mic, X, Loader2, Save } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function AdminGradingDashboard() {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [gradingTarget, setGradingTarget] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [scores, setScores] = useState({ scoreSchreibung: '', scoreSprechen: '', teacherFeedback: '' });
    const [successId, setSuccessId] = useState<string | null>(null);

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi('/exams/submissions');
            setSubmissions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load submissions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadSubmissions(); }, []);

    const openGrading = (sub: any) => {
        setGradingTarget(sub);
        setScores({
            scoreSchreibung: sub.scoreSchreibung != null ? String(sub.scoreSchreibung) : '',
            scoreSprechen: sub.scoreSprechen != null ? String(sub.scoreSprechen) : '',
            teacherFeedback: sub.teacherFeedback || '',
        });
    };

    const handleGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await fetchApi(`/exams/submissions/${gradingTarget.id}/grade`, {
                method: 'PATCH',
                body: JSON.stringify({
                    scoreSchreibung: scores.scoreSchreibung !== '' ? Number(scores.scoreSchreibung) : undefined,
                    scoreSprechen: scores.scoreSprechen !== '' ? Number(scores.scoreSprechen) : undefined,
                    teacherFeedback: scores.teacherFeedback || undefined,
                }),
            });
            setSuccessId(gradingTarget.id);
            setTimeout(() => setSuccessId(null), 3000);
            setGradingTarget(null);
            loadSubmissions();
        } catch (err: any) {
            alert(err?.message || "Failed to save grades.");
        } finally {
            setIsSaving(false);
        }
    };

    const pending = submissions.filter(s => s.status !== 'graded');
    const graded = submissions.filter(s => s.status === 'graded');

    return (
        <div className="space-y-6">
            {/* Success toast */}
            {successId && (
                <div className="fixed top-20 right-6 z-50 bg-green-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Grades saved successfully.
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Grading & Review</h1>
                <p className="text-gray-500 text-sm mt-1">Score Schreiben (Writing) and Sprechen (Speaking) sections manually.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Manual Grading</p>
                        <h3 className="text-2xl font-bold text-gray-900">{pending.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Fully Graded</p>
                        <h3 className="text-2xl font-bold text-gray-900">{graded.length}</h3>
                    </div>
                </div>
            </div>

            {/* Submissions table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 text-sm">Exam Submissions</h3>
                    <span className="text-xs text-gray-400">{submissions.length} total</span>
                </div>

                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-7 h-7 animate-spin mb-3 text-brand-primary" />
                        <p className="text-sm">Loading submissions...</p>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <PenTool className="w-7 h-7 text-gray-300" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 mb-1">All caught up!</h3>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto">No exam submissions require manual review right now.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Student</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Exam</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Status</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Auto Scores</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Manual Scores</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {submissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-semibold text-sm flex-shrink-0">
                                                    {sub.student?.firstName?.[0] || <User className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">
                                                        {sub.student?.firstName || 'Unknown'} {sub.student?.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{sub.student?.cefrLevel || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 font-medium text-sm">
                                            {sub.mockExam?.title || 'Untitled Exam'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                sub.status === 'graded'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : sub.status === 'grading'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                                {sub.status === 'graded' ? '✓ Graded' : sub.status === 'grading' ? 'Partial' : 'Needs Review'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs space-y-0.5">
                                                <p className="text-gray-500">Lesen: <span className="font-semibold text-gray-800">{sub.scoreLesen ?? '—'}</span></p>
                                                <p className="text-gray-500">Hören: <span className="font-semibold text-gray-800">{sub.scoreHoren ?? '—'}</span></p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs space-y-0.5">
                                                <p className="text-gray-500 flex items-center gap-1">
                                                    <PenTool className="w-3 h-3" /> Schreiben: <span className="font-semibold text-gray-800">{sub.scoreSchreibung ?? '—'}</span>
                                                </p>
                                                <p className="text-gray-500 flex items-center gap-1">
                                                    <Mic className="w-3 h-3" /> Sprechen: <span className="font-semibold text-gray-800">{sub.scoreSprechen ?? '—'}</span>
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openGrading(sub)}
                                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                                    sub.status === 'graded'
                                                        ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                                        : 'text-white bg-brand-primary hover:bg-brand-primary/90'
                                                }`}
                                            >
                                                {sub.status === 'graded' ? 'Review' : 'Grade Now'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Grading Modal */}
            {gradingTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-900">Grade Submission</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {gradingTarget.student?.firstName} {gradingTarget.student?.lastName} — {gradingTarget.mockExam?.title || 'Exam'}
                                </p>
                            </div>
                            <button onClick={() => setGradingTarget(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Auto scores summary */}
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-6 text-sm">
                            <div>
                                <span className="text-gray-500">Lesen:</span>
                                <span className="font-semibold text-gray-800 ml-1">{gradingTarget.scoreLesen ?? '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Hören:</span>
                                <span className="font-semibold text-gray-800 ml-1">{gradingTarget.scoreHoren ?? '—'}</span>
                            </div>
                        </div>

                        <form onSubmit={handleGrade} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                        <PenTool className="w-3.5 h-3.5" /> Schreiben Score
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={scores.scoreSchreibung}
                                        onChange={e => setScores({ ...scores, scoreSchreibung: e.target.value })}
                                        placeholder="0 – 100"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                        <Mic className="w-3.5 h-3.5" /> Sprechen Score
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={scores.scoreSprechen}
                                        onChange={e => setScores({ ...scores, scoreSprechen: e.target.value })}
                                        placeholder="0 – 100"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Feedback (optional)</label>
                                <textarea
                                    rows={4}
                                    value={scores.teacherFeedback}
                                    onChange={e => setScores({ ...scores, teacherFeedback: e.target.value })}
                                    placeholder="Write personalised feedback for the student..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setGradingTarget(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2 min-w-[110px] justify-center"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save Grades</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
