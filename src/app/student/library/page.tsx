'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Search, Headphones, BookOpen, Video, FileText,
    Play, Download, ExternalLink, Star, Clock,
    Filter, BookMarked, Loader2, AlertCircle, RefreshCw, Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// ─── Static config ─────────────────────────────────────────────────────────────
type FilterType = 'All' | 'Audio' | 'Video' | 'Article' | 'Document';
const FILTER_TABS: FilterType[] = ['All', 'Audio', 'Video', 'Article', 'Document'];

function toFilterCategory(type: string): FilterType {
    if (type === 'Audio') return 'Audio';
    if (type === 'Video') return 'Video';
    if (type === 'Article') return 'Article';
    return 'Document'; // Lesson Plan, Worksheet, Reference, Exam Prep → Document
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    'Audio':       <Headphones className="w-4 h-4" />,
    'Video':       <Video className="w-4 h-4" />,
    'Article':     <BookOpen className="w-4 h-4" />,
    'Lesson Plan': <BookOpen className="w-4 h-4" />,
    'Worksheet':   <FileText className="w-4 h-4" />,
    'Reference':   <FileText className="w-4 h-4" />,
    'Exam Prep':   <Zap className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
    'Audio':       'text-purple-600 bg-purple-50',
    'Video':       'text-red-600 bg-red-50',
    'Article':     'text-blue-600 bg-blue-50',
    'Lesson Plan': 'text-brand-primary bg-brand-primary/10',
    'Worksheet':   'text-blue-600 bg-blue-50',
    'Reference':   'text-green-600 bg-green-50',
    'Exam Prep':   'text-orange-600 bg-orange-50',
};

const LEVEL_COLORS: Record<string, string> = {
    A1: 'bg-gray-100 text-gray-600',
    A2: 'bg-blue-50 text-blue-700',
    B1: 'bg-brand-primary/10 text-brand-primary',
    B2: 'bg-purple-50 text-purple-700',
    C1: 'bg-orange-50 text-orange-700',
    C2: 'bg-red-50 text-red-700',
};

function formatSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Resource Card ─────────────────────────────────────────────────────────────
function ResourceCard({ resource, highlighted }: { resource: Resource; highlighted: boolean }) {
    const [saved, setSaved] = useState(false);
    const isPlayable = resource.type === 'Audio' || resource.type === 'Video';

    return (
        <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col ${highlighted ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-gray-100'}`}>
            {highlighted && (
                <div className="bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 rounded-t-2xl">
                    Prep Material for Next Class
                </div>
            )}
            <div className="p-5 flex flex-col flex-1">
                {/* Type badge + level + save */}
                <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-lg ${TYPE_COLORS[resource.type] || 'text-gray-600 bg-gray-100'}`}>
                        {TYPE_ICONS[resource.type] || <FileText className="w-4 h-4" />}
                        <span className="text-xs">{resource.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${LEVEL_COLORS[resource.cefr_level] || 'bg-gray-100 text-gray-500'}`}>
                            {resource.cefr_level}
                        </span>
                        <button
                            onClick={() => setSaved(!saved)}
                            title={saved ? 'Remove from saved' : 'Save for later'}
                            className="text-gray-300 hover:text-amber-400 transition-colors"
                        >
                            <Star className={`w-4 h-4 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Title + filename */}
                <h3 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug">{resource.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed flex-1 truncate">{resource.file_name}</p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatSize(resource.file_size) ||
                            new Date(resource.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-2">
                        <a
                            href={resource.file_url}
                            download={resource.file_name}
                            title="Download"
                            className="text-gray-400 hover:text-brand-primary transition-colors"
                            onClick={e => e.stopPropagation()}
                        >
                            <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                            onClick={() => window.open(resource.file_url, '_blank', 'noopener,noreferrer')}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${isPlayable
                                ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
                                : 'bg-gray-900 text-white hover:bg-gray-700'}`}
                        >
                            {isPlayable
                                ? <><Play className="w-3 h-3" /> Play</>
                                : <><ExternalLink className="w-3 h-3" /> Open</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────
function LibraryInner() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const highlightedId = searchParams.get('resource');
    const supabase = createClient();

    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data, error } = await supabase
                .from('resources')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setResources(data ?? []);
        } catch (err: any) {
            setLoadError(err?.message || 'Failed to load resources.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (user) load(); }, [user, load]);

    const filtered = useMemo(() => {
        return resources.filter(r => {
            const matchesType = activeFilter === 'All' || toFilterCategory(r.type) === activeFilter;
            const q = search.toLowerCase();
            const matchesSearch = !q
                || r.title.toLowerCase().includes(q)
                || r.type.toLowerCase().includes(q)
                || r.cefr_level.toLowerCase().includes(q)
                || r.file_name.toLowerCase().includes(q);
            return matchesType && matchesSearch;
        });
    }, [resources, search, activeFilter]);

    const featured = filtered.filter(r => r.shared);
    const regular = filtered.filter(r => !r.shared);

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
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-gray-600">{loadError}</p>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors">
                <RefreshCw className="w-4 h-4" /> Retry
            </button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Resource Library</h1>
                <p className="text-gray-500 mt-1">Curated materials to support your German language journey.</p>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search resources, topics, tags…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors bg-white"
                    />
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                    <Filter className="w-3.5 h-3.5 text-gray-400 ml-2 shrink-0" />
                    {FILTER_TABS.map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveFilter(type)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeFilter === type
                                ? 'bg-brand-primary text-white'
                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {resources.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
                    <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No resources available yet.</p>
                    <p className="text-gray-400 text-sm mt-1">Your instructor hasn't uploaded any resources yet.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
                    <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No resources match your search.</p>
                </div>
            ) : (
                <>
                    {/* Featured — resources the instructor shared/pushed to students */}
                    {featured.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Featured Resources
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {featured.map(r => (
                                    <ResourceCard key={r.id} resource={r} highlighted={r.id === highlightedId} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* All other resources */}
                    {regular.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold text-gray-700 mb-4">
                                {activeFilter === 'All' ? 'All Resources' : `${activeFilter} Resources`}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {regular.map(r => (
                                    <ResourceCard key={r.id} resource={r} highlighted={r.id === highlightedId} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Page export wrapped in Suspense (required for useSearchParams) ───────────
export default function LibraryPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
            </div>
        }>
            <LibraryInner />
        </Suspense>
    );
}
