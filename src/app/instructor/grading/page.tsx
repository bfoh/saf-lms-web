'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    PenLine, Mic, CheckCircle2, Clock, ChevronLeft,
    ChevronRight, Send, Tag, AlertCircle,
    RotateCcw, Loader2, RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Submission {
    id: string;
    assignment_id: string | null;
    student_id: string;
    assignment_title: string;
    submission_type: 'writing' | 'audio';
    cefr_level: string;
    content_text: string | null;
    audio_url: string | null;
    status: 'pending' | 'graded';
    score: number | null;
    feedback: string | null;
    error_tags: string[] | null;
    graded_by: string | null;
    submitted_at: string;
    graded_at: string | null;
    // joined
    studentName: string;
    studentEmail: string;
}

// ─── Static config ─────────────────────────────────────────────────────────────
const ERROR_TAGS = [
    { label: 'Verb Tense',            color: 'bg-red-100 text-red-700 border-red-200',       shortcode: '[VT]'   },
    { label: 'Subject-Verb Agreement',color: 'bg-orange-100 text-orange-700 border-orange-200', shortcode: '[SVA]' },
    { label: 'Article Error',         color: 'bg-amber-100 text-amber-700 border-amber-200',   shortcode: '[ART]'  },
    { label: 'Word Order',            color: 'bg-yellow-100 text-yellow-700 border-yellow-200',shortcode: '[WO]'   },
    { label: 'Preposition',           color: 'bg-lime-100 text-lime-700 border-lime-200',      shortcode: '[PREP]' },
    { label: 'Gender Agreement',      color: 'bg-green-100 text-green-700 border-green-200',   shortcode: '[GEN]'  },
    { label: 'Subjunctive',           color: 'bg-teal-100 text-teal-700 border-teal-200',      shortcode: '[SUBJ]' },
    { label: 'Case Error',            color: 'bg-cyan-100 text-cyan-700 border-cyan-200',      shortcode: '[CASE]' },
    { label: 'Reflexive Verb',        color: 'bg-blue-100 text-blue-700 border-blue-200',      shortcode: '[REF]'  },
    { label: 'Pronoun Use',           color: 'bg-indigo-100 text-indigo-700 border-indigo-200',shortcode: '[PRO]'  },
    { label: 'Spelling',              color: 'bg-violet-100 text-violet-700 border-violet-200',shortcode: '[SP]'   },
    { label: 'Punctuation',           color: 'bg-purple-100 text-purple-700 border-purple-200',shortcode: '[PUNC]' },
];

const SCORE_RUBRIC = [
    { range: '90–100', label: 'Excellent',    preset: 95, color: 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200' },
    { range: '75–89',  label: 'Good',         preset: 82, color: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'    },
    { range: '60–74',  label: 'Satisfactory', preset: 67, color: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'},
    { range: '0–59',   label: 'Needs Work',   preset: 50, color: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'        },
];

// ─── Main grading component ───────────────────────────────────────────────────
function GradingInner() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [queue, setQueue] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const [activeId, setActiveId] = useState<string | null>(searchParams.get('id'));
    const [score, setScore] = useState<number | ''>('');
    const [feedback, setFeedback] = useState('');
    const [appliedTags, setAppliedTags] = useState<string[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all');

    // ── Load submissions ─────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data, error } = await supabase
                .from('submissions')
                .select('*, profiles!submissions_student_id_fkey(first_name, last_name, email)')
                .order('submitted_at', { ascending: false });

            if (error) throw error;

            const mapped: Submission[] = (data ?? []).map((row: any) => ({
                id: row.id,
                assignment_id: row.assignment_id,
                student_id: row.student_id,
                assignment_title: row.assignment_title,
                submission_type: row.submission_type,
                cefr_level: row.cefr_level,
                content_text: row.content_text,
                audio_url: row.audio_url,
                status: row.status,
                score: row.score,
                feedback: row.feedback,
                error_tags: row.error_tags,
                graded_by: row.graded_by,
                submitted_at: row.submitted_at,
                graded_at: row.graded_at,
                studentName: row.profiles
                    ? `${row.profiles.first_name} ${row.profiles.last_name}`
                    : 'Unknown Student',
                studentEmail: row.profiles?.email ?? '',
            }));

            setQueue(mapped);

            // Set initial active submission
            const initId = searchParams.get('id') ?? mapped.find(s => s.status === 'pending')?.id ?? mapped[0]?.id ?? null;
            setActiveId(initId);

            // Prefill panel if already graded
            const init = mapped.find(s => s.id === initId);
            if (init?.status === 'graded') {
                setScore(init.score ?? '');
                setFeedback(init.feedback ?? '');
                setAppliedTags(init.error_tags ?? []);
            }
        } catch (err: any) {
            setLoadError(err?.message || 'Failed to load submissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Derived ──────────────────────────────────────────────────────────────
    const filteredQueue = queue.filter(q =>
        filter === 'all' ? true : filter === 'graded' ? q.status === 'graded' : q.status === 'pending'
    );

    const active = queue.find(q => q.id === activeId) ?? null;
    const activeIndex = queue.findIndex(q => q.id === activeId);
    const gradedCount = queue.filter(q => q.status === 'graded').length;

    // ── Handlers ─────────────────────────────────────────────────────────────
    const selectSubmission = (sub: Submission) => {
        setActiveId(sub.id);
        setSaveError('');
        if (sub.status === 'graded') {
            setScore(sub.score ?? '');
            setFeedback(sub.feedback ?? '');
            setAppliedTags(sub.error_tags ?? []);
        } else {
            setScore('');
            setFeedback('');
            setAppliedTags([]);
        }
    };

    const toggleTag = (tag: string) =>
        setAppliedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

    const insertTag = (shortcode: string) =>
        setFeedback(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + shortcode + ' ');

    const handleSubmit = async () => {
        if (!active || score === '' || Number(score) < 0 || Number(score) > 100) return;
        setSaving(true);
        setSaveError('');
        try {
            const { error } = await supabase
                .from('submissions')
                .update({
                    score: Number(score),
                    feedback: feedback.trim() || null,
                    error_tags: appliedTags.length > 0 ? appliedTags : null,
                    status: 'graded',
                    graded_by: user?.id ?? null,
                    graded_at: new Date().toISOString(),
                })
                .eq('id', active.id);

            if (error) throw error;

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            // Optimistically update local state
            setQueue(prev => prev.map(s =>
                s.id === active.id
                    ? { ...s, status: 'graded', score: Number(score), feedback: feedback.trim() || null, error_tags: appliedTags.length > 0 ? appliedTags : null }
                    : s
            ));

            // Auto-advance to next pending
            const next = queue.find(s => s.status === 'pending' && s.id !== active.id);
            if (next) {
                setActiveId(next.id);
                setScore('');
                setFeedback('');
                setAppliedTags([]);
            }
        } catch (err: any) {
            setSaveError(err?.message || 'Failed to save grade. Please retry.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => { setScore(''); setFeedback(''); setAppliedTags([]); setSaveError(''); };

    const scoreNum = Number(score);
    const scoreLabel = score === '' ? null : scoreNum >= 90 ? 'Excellent' : scoreNum >= 75 ? 'Good' : scoreNum >= 60 ? 'Satisfactory' : 'Needs Work';
    const scoreLabelColor = score === '' ? '' : scoreNum >= 90 ? 'text-green-600' : scoreNum >= 75 ? 'text-blue-600' : scoreNum >= 60 ? 'text-amber-600' : 'text-red-600';

    // ── Loading / error states ────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <p className="text-sm font-medium">Loading submissions…</p>
            </div>
        </div>
    );

    if (loadError) return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] flex-col gap-4">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-gray-600">{loadError}</p>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors">
                <RefreshCw className="w-4 h-4" /> Retry
            </button>
        </div>
    );

    if (queue.length === 0) return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] flex-col gap-4 text-gray-400">
            <CheckCircle2 className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">No submissions to grade yet.</p>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#F6F9F3]">

            {/* ── Column 1: Queue sidebar ──────────────────────────── */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 mb-3">Grading Queue</h2>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {(['all', 'pending', 'graded'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {filteredQueue.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">No submissions in this category.</p>
                    ) : filteredQueue.map(item => {
                        const isActive = item.id === activeId;
                        return (
                            <button
                                key={item.id}
                                onClick={() => selectSubmission(item)}
                                className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${isActive ? 'bg-brand-primary/5 border-l-2 border-l-brand-primary' : 'hover:bg-gray-50'}`}
                            >
                                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${item.submission_type === 'writing' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                                    {item.submission_type === 'writing'
                                        ? <PenLine className="w-3.5 h-3.5 text-purple-600" />
                                        : <Mic className="w-3.5 h-3.5 text-blue-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{item.studentName}</p>
                                    <p className="text-xs text-gray-500 truncate">{item.assignment_title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                            {item.cefr_level}
                                        </span>
                                        {item.status === 'graded' ? (
                                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
                                                <CheckCircle2 className="w-3 h-3" /> {item.score}/100
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600">
                                                <Clock className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">{gradedCount} of {queue.length} graded</p>
                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${queue.length > 0 ? (gradedCount / queue.length) * 100 : 0}%` }} />
                    </div>
                </div>
            </aside>

            {/* ── Column 2: Submission view ─────────────────────────── */}
            {active ? (
                <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
                    {/* Header */}
                    <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm">
                                {active.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{active.studentName}</p>
                                <p className="text-xs text-gray-400">
                                    {active.assignment_title} · {active.cefr_level} ·{' '}
                                    {new Date(active.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={activeIndex <= 0}
                                onClick={() => { const prev = queue[activeIndex - 1]; if (prev) selectSubmission(prev); }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-500" />
                            </button>
                            <span className="text-xs text-gray-400">{activeIndex + 1}/{queue.length}</span>
                            <button
                                disabled={activeIndex >= queue.length - 1}
                                onClick={() => { const next = queue[activeIndex + 1]; if (next) selectSubmission(next); }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-4 ${active.submission_type === 'writing' ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                            {active.submission_type === 'writing' ? <PenLine className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                            {active.submission_type === 'writing' ? 'Writing' : 'Audio'} Submission
                        </div>

                        {active.submission_type === 'writing' ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">{active.assignment_title}</h3>
                                <div className="font-mono text-sm text-gray-800 leading-8 whitespace-pre-wrap bg-gray-50/50 rounded-xl p-5 border border-gray-100">
                                    {active.content_text || '(No text submitted)'}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{active.assignment_title}</h3>
                                {active.audio_url ? (
                                    <audio controls src={active.audio_url} className="w-full" />
                                ) : (
                                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <Mic className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="text-sm text-gray-500 italic">No audio file attached.</p>
                                    </div>
                                )}
                                {active.content_text && (
                                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 border border-gray-100 italic">{active.content_text}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 border-r border-gray-100">
                    <p className="text-sm">Select a submission to review.</p>
                </div>
            )}

            {/* ── Column 3: Feedback panel ──────────────────────────── */}
            <div className="w-80 bg-white flex flex-col overflow-hidden shrink-0">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-brand-primary" /> Feedback Panel
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {active ? `${active.studentName} · ${active.assignment_title}` : 'No submission selected'}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Score */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Score (0–100)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number" min={0} max={100} value={score}
                                onChange={e => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="—"
                                className="w-24 h-12 text-2xl font-bold text-center border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary transition-colors"
                            />
                            {scoreLabel && <span className={`text-sm font-bold ${scoreLabelColor}`}>{scoreLabel}</span>}
                        </div>
                        {/* Rubric — clickable presets */}
                        <div className="grid grid-cols-2 gap-1.5 mt-3">
                            {SCORE_RUBRIC.map(r => (
                                <button
                                    key={r.range}
                                    onClick={() => setScore(r.preset)}
                                    className={`text-center px-2 py-1.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-all hover:scale-105 ${r.color}`}
                                    title={`Set score to ${r.preset}`}
                                >
                                    {r.range} · {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error tags */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                            Error Tags <span className="text-gray-400 font-normal normal-case">(click to flag)</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {ERROR_TAGS.map(tag => {
                                const isActive = appliedTags.includes(tag.label);
                                return (
                                    <button
                                        key={tag.label}
                                        onClick={() => toggleTag(tag.label)}
                                        className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all ${isActive
                                            ? `${tag.color} shadow-sm scale-105`
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {isActive && <CheckCircle2 className="w-2.5 h-2.5" />}
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                        {appliedTags.length > 0 && (
                            <p className="text-[10px] text-brand-primary font-medium mt-2">
                                {appliedTags.length} error type{appliedTags.length !== 1 ? 's' : ''} flagged
                            </p>
                        )}
                    </div>

                    {/* Written feedback */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Written Feedback</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {ERROR_TAGS.filter(t => appliedTags.includes(t.label)).map(tag => (
                                <button
                                    key={tag.shortcode}
                                    onClick={() => insertTag(tag.shortcode)}
                                    title={`Insert ${tag.shortcode}`}
                                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${tag.color} hover:opacity-80 transition-opacity`}
                                >
                                    {tag.shortcode}
                                </button>
                            ))}
                        </div>
                        <textarea
                            rows={5} value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Write your feedback here. Use the shortcode buttons above to insert error markers inline…"
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors resize-none"
                        />
                    </div>

                    {/* Quick phrases */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Quick Phrases</label>
                        <div className="space-y-1.5">
                            {[
                                'Good use of vocabulary throughout.',
                                'Review the verb conjugation rules.',
                                'Excellent structure and flow.',
                                'Pay attention to gender agreement.',
                                'Great improvement from last submission!',
                            ].map(phrase => (
                                <button
                                    key={phrase}
                                    onClick={() => setFeedback(prev => prev + (prev ? ' ' : '') + phrase)}
                                    className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-brand-primary/5 hover:text-brand-primary border border-gray-100 hover:border-brand-primary/20 px-3 py-2 rounded-lg transition-colors"
                                >
                                    + {phrase}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Submit bar */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    {active?.status === 'graded' && (
                        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Graded — {active.score}/100
                        </div>
                    )}
                    {saveError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {saveError}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!active || score === '' || Number(score) < 0 || Number(score) > 100 || saving}
                            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-all ${
                                showSuccess 
                                    ? 'bg-green-600 text-white shadow-lg' 
                                    : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                            } disabled:opacity-40`}
                        >
                            {saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : showSuccess ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                                <Send className="w-3.5 h-3.5" />
                            )}
                            {saving ? 'Saving…' : showSuccess ? 'Grade Saved!' : active?.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
                        </button>
                    </div>
                    {score !== '' && Number(score) > 100 && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Score must be between 0 and 100
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function GradingPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
            </div>
        }>
            <GradingInner />
        </Suspense>
    );
}
