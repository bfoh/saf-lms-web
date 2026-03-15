'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FileText, Headphones, Video, BookOpen, Upload, Send,
    Search, CheckCircle2, Download, Zap, Star, Filter,
    X, Loader2, AlertTriangle, RefreshCw, Trash2, Film,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Resource {
    id: string;
    title: string;
    type: string;
    cefr_level: string;
    file_url: string;
    file_name: string;
    file_size: number | null;
    file_type: string | null;
    uploaded_by: string;
    shared: boolean;
    created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const RESOURCE_TYPES = ['Lesson Plan', 'Worksheet', 'Audio', 'Article', 'Reference', 'Video', 'Exam Prep', 'Recording'];
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const TYPE_ICONS: Record<string, React.ReactNode> = {
    'Lesson Plan': <BookOpen className="w-4 h-4 text-brand-primary" />,
    'Worksheet':   <FileText className="w-4 h-4 text-blue-600" />,
    'Audio':       <Headphones className="w-4 h-4 text-purple-600" />,
    'Article':     <FileText className="w-4 h-4 text-amber-600" />,
    'Reference':   <Star className="w-4 h-4 text-green-600" />,
    'Video':       <Video className="w-4 h-4 text-red-600" />,
    'Exam Prep':   <Zap className="w-4 h-4 text-orange-600" />,
    'Recording':   <Film className="w-4 h-4 text-indigo-600" />,
};

const TYPE_BG: Record<string, string> = {
    'Lesson Plan': 'bg-brand-primary/10',
    'Worksheet':   'bg-blue-50',
    'Audio':       'bg-purple-50',
    'Article':     'bg-amber-50',
    'Reference':   'bg-green-50',
    'Video':       'bg-red-50',
    'Exam Prep':   'bg-orange-50',
    'Recording':   'bg-indigo-50',
};

function formatSize(bytes: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({
    userId,
    onClose,
    onUploaded,
}: {
    userId: string;
    onClose: () => void;
    onUploaded: (r: Resource) => void;
}) {
    const supabase = createClient();
    const [title, setTitle] = useState('');
    const [type, setType] = useState('Worksheet');
    const [level, setLevel] = useState('B1');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleUpload = async () => {
        if (!file || !title.trim()) { setError('Title and file are required.'); return; }
        setUploading(true);
        setError('');
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${userId}/${Date.now()}_${safeName}`;

            const { error: storageErr } = await supabase.storage
                .from('resources')
                .upload(path, file, { upsert: false });
            if (storageErr) throw new Error(storageErr.message);

            const { data: { publicUrl } } = supabase.storage
                .from('resources')
                .getPublicUrl(path);

            const { data, error: dbErr } = await supabase
                .from('resources')
                .insert({
                    title: title.trim(),
                    type,
                    cefr_level: level,
                    file_url: publicUrl,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type || null,
                    uploaded_by: userId,
                    shared: false,
                })
                .select()
                .single();
            if (dbErr) throw new Error(dbErr.message);

            onUploaded(data as Resource);
        } catch (err: any) {
            setError(err.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-brand-primary" /> Upload Resource
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">Title *</label>
                        <input
                            type="text" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. B1 Subjunctive Mood — Lesson Plan"
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1.5">Type</label>
                            <select value={type} onChange={e => setType(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-white">
                                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1.5">Level</label>
                            <select value={level} onChange={e => setLevel(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-white">
                                {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">File *</label>
                        <label className={`flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${file ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-200 hover:border-brand-primary/40 hover:bg-gray-50'}`}>
                            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                            {file ? (
                                <div className="text-center px-4">
                                    <CheckCircle2 className="w-6 h-6 text-brand-primary mx-auto mb-1" />
                                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[260px]">{file.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{formatSize(file.size)}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                    <p className="text-sm text-gray-500">Click to select a file</p>
                                    <p className="text-xs text-gray-400 mt-0.5">PDF, MP3, MP4, DOCX — max 50 MB</p>
                                </div>
                            )}
                        </label>
                    </div>
                    <button
                        onClick={handleUpload}
                        disabled={!file || !title.trim() || uploading}
                        className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-40 hover:bg-brand-primary/90 transition-colors"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Uploading…' : 'Upload Resource'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Push Modal ───────────────────────────────────────────────────────────────
function PushModal({
    resource,
    userId,
    onClose,
    onPushed,
}: {
    resource: Resource;
    userId: string;
    onClose: () => void;
    onPushed: (resourceId: string) => void;
}) {
    const supabase = createClient();
    const [classes, setClasses] = useState<any[]>([]);
    const [targetClassId, setTargetClassId] = useState('');
    const [note, setNote] = useState('');
    const [pushing, setPushing] = useState(false);
    const [pushed, setPushed] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(true);

    useEffect(() => {
        fetchApi<any[]>('/classes')
            .then(all => {
                const mine = (Array.isArray(all) ? all : []).filter(
                    c => c.teacher?.id === userId || c.teacherId === userId
                );
                setClasses(mine);
                if (mine.length > 0) setTargetClassId(mine[0].id);
            })
            .catch(() => {})
            .finally(() => setLoadingClasses(false));
    }, [userId]);

    const handlePush = async () => {
        if (!targetClassId) return;
        setPushing(true);
        try {
            const cls = await fetchApi<any>(`/classes/${targetClassId}`);
            const receiverIds: string[] = (cls.students || []).map((s: any) => s.id).filter(Boolean);

            if (receiverIds.length > 0) {
                const lines = [
                    `📎 ${resource.title}`,
                    `Level: ${resource.cefr_level} · ${resource.type}`,
                    ...(note.trim() ? [note.trim()] : []),
                    `Download: ${resource.file_url}`,
                ];
                await fetchApi('/messages/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ receiverIds, content: lines.join('\n') }),
                });
            }

            // Mark resource as shared
            await supabase.from('resources').update({ shared: true }).eq('id', resource.id);
            onPushed(resource.id);
            setPushed(true);
        } catch {
            setPushed(true); // don't leave user stuck
        } finally {
            setPushing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Send className="w-4 h-4 text-brand-primary" /> Push to Students
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {pushed ? (
                    <div className="p-8 text-center">
                        <CheckCircle2 className="w-12 h-12 text-brand-primary mx-auto mb-3" />
                        <p className="font-bold text-gray-900">Resource Pushed!</p>
                        <p className="text-sm text-gray-500 mt-1">Students will see it in real time via Messages.</p>
                        <button onClick={onClose} className="mt-4 text-sm text-brand-primary font-medium hover:underline">Close</button>
                    </div>
                ) : (
                    <div className="p-5 space-y-4">
                        {/* Resource preview */}
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                            <div className={`p-2 rounded-lg shrink-0 ${TYPE_BG[resource.type] || 'bg-gray-100'}`}>
                                {TYPE_ICONS[resource.type] || <FileText className="w-4 h-4 text-gray-400" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{resource.title}</p>
                                <p className="text-xs text-gray-400">{resource.type} · {resource.cefr_level} · {formatSize(resource.file_size)}</p>
                            </div>
                        </div>

                        {/* Class picker */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1.5">Push to Class</label>
                            {loadingClasses ? (
                                <div className="flex items-center gap-2 h-9 text-sm text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> Loading classes…
                                </div>
                            ) : classes.length === 0 ? (
                                <p className="text-sm text-gray-400">No classes assigned to you yet.</p>
                            ) : (
                                <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-white">
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} · {c.cefrLevel}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Optional note */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1.5">Message (optional)</label>
                            <textarea
                                rows={3} value={note} onChange={e => setNote(e.target.value)}
                                placeholder="e.g. Review this before tomorrow's class…"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
                            />
                        </div>

                        <button
                            onClick={handlePush}
                            disabled={pushing || classes.length === 0 || loadingClasses}
                            className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-40 hover:bg-brand-primary/90 transition-colors"
                        >
                            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {pushing ? 'Pushing…' : 'Push to Students'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
    const { user } = useAuth();
    const supabase = createClient();

    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState('All');
    const [showUpload, setShowUpload] = useState(false);
    const [pushTarget, setPushTarget] = useState<Resource | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setLoadError('');
        try {
            const { data, error } = await supabase
                .from('resources')
                .select('*')
                .eq('uploaded_by', user.id)
                .order('created_at', { ascending: false });
            if (error) throw new Error(error.message);
            setResources(data || []);
        } catch (err: any) {
            setLoadError(err.message || 'Failed to load resources.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { if (user) load(); }, [user?.id, load]);

    const filtered = useMemo(() => {
        return resources.filter(r => {
            const matchLevel = filterLevel === 'All' || r.cefr_level === filterLevel;
            const q = search.toLowerCase();
            const matchSearch = !q || r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
            return matchLevel && matchSearch;
        });
    }, [resources, search, filterLevel]);

    const toggleSelect = (id: string) =>
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const deleteResource = async (r: Resource) => {
        if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
        setDeleting(r.id);
        try {
            // Remove from storage
            const url = new URL(r.file_url);
            const pathAfterBucket = url.pathname.split('/resources/')[1];
            if (pathAfterBucket) {
                await supabase.storage.from('resources').remove([pathAfterBucket]);
            }
            await supabase.from('resources').delete().eq('id', r.id);
            setResources(prev => prev.filter(x => x.id !== r.id));
            setSelected(prev => prev.filter(id => id !== r.id));
        } catch {
            // silently continue
        } finally {
            setDeleting(null);
        }
    };

    const handleUploaded = (r: Resource) => {
        setResources(prev => [r, ...prev]);
        setShowUpload(false);
    };

    const handlePushed = (resourceId: string) => {
        setResources(prev => prev.map(r => r.id === resourceId ? { ...r, shared: true } : r));
        setPushTarget(null);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <p className="text-sm font-medium">Loading resources…</p>
            </div>
        </div>
    );

    if (loadError) return (
        <div className="flex items-center justify-center h-96 flex-col gap-4">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-gray-600 max-w-sm text-center">{loadError}</p>
            <button onClick={load}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors">
                <RefreshCw className="w-4 h-4" /> Retry
            </button>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto py-8 px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
                    <p className="text-gray-500 mt-1">Manage and push materials to student dashboards.</p>
                </div>
                <button onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 bg-brand-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-primary/90 transition-colors shadow-sm">
                    <Upload className="w-4 h-4" /> Upload Resource
                </button>
            </div>

            {/* Search + level filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search resources…"
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" />
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                    <Filter className="w-3.5 h-3.5 text-gray-400 ml-2" />
                    {['All', ...CEFR_LEVELS].map(lvl => (
                        <button key={lvl} onClick={() => setFilterLevel(lvl)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterLevel === lvl ? 'bg-brand-primary text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk action bar */}
            {selected.length > 0 && (
                <div className="flex items-center gap-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-brand-primary">{selected.length} selected</span>
                    <button onClick={() => setSelected([])} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                </div>
            )}

            {/* Empty state */}
            {resources.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
                    <p className="text-sm font-medium text-gray-600">No resources yet</p>
                    <p className="text-xs mt-1">Upload your first material to get started.</p>
                    <button onClick={() => setShowUpload(true)}
                        className="mt-4 flex items-center gap-2 bg-brand-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-primary/90 transition-colors mx-auto">
                        <Upload className="w-4 h-4" /> Upload Resource
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                    No resources match your search or filter.
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="w-10 px-4 py-3.5" />
                                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Resource</th>
                                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Level</th>
                                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Size</th>
                                <th className="px-4 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(r => (
                                <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${selected.includes(r.id) ? 'bg-brand-primary/5' : ''}`}>
                                    <td className="px-4 py-3.5">
                                        <input type="checkbox" checked={selected.includes(r.id)}
                                            onChange={() => toggleSelect(r.id)}
                                            className="rounded accent-brand-primary" />
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg shrink-0 ${TYPE_BG[r.type] || 'bg-gray-100'}`}>
                                                {TYPE_ICONS[r.type] || <FileText className="w-4 h-4 text-gray-400" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                                                {r.shared && (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Shared</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 hidden md:table-cell">
                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{r.type}</span>
                                    </td>
                                    <td className="px-4 py-3.5 hidden sm:table-cell">
                                        <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">{r.cefr_level}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-gray-400 hidden lg:table-cell">
                                        {formatSize(r.file_size)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                                                className="p-1.5 text-gray-400 hover:text-brand-primary rounded-lg hover:bg-gray-100 transition-colors" title="Download / Preview">
                                                <Download className="w-3.5 h-3.5" />
                                            </a>
                                            <button onClick={() => setPushTarget(r)}
                                                className="flex items-center gap-1 text-xs font-semibold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 px-2.5 py-1.5 rounded-lg transition-colors">
                                                <Send className="w-3 h-3" /> Push
                                            </button>
                                            <button onClick={() => deleteResource(r)}
                                                disabled={deleting === r.id}
                                                className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                                                {deleting === r.id
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                        Showing {filtered.length} of {resources.length} resource{resources.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            {showUpload && user && (
                <UploadModal
                    userId={user.id}
                    onClose={() => setShowUpload(false)}
                    onUploaded={handleUploaded}
                />
            )}
            {pushTarget && user && (
                <PushModal
                    resource={pushTarget}
                    userId={user.id}
                    onClose={() => setPushTarget(null)}
                    onPushed={handlePushed}
                />
            )}
        </div>
    );
}
