'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    Search, AlertTriangle, TrendingDown,
    CheckCircle2, MessageSquare, BarChart3, Loader2, RefreshCw, Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';

const STATUS_CONFIG = {
    'at-risk': {
        label: 'At Risk',
        classes: 'text-red-700 bg-red-50 border-red-200',
        icon: <AlertTriangle className="w-3 h-3" />,
    },
    'warning': {
        label: 'Warning',
        classes: 'text-amber-700 bg-amber-50 border-amber-200',
        icon: <TrendingDown className="w-3 h-3" />,
    },
    'good': {
        label: 'Good Standing',
        classes: 'text-green-700 bg-green-50 border-green-200',
        icon: <CheckCircle2 className="w-3 h-3" />,
    },
};

function riskStatus(attRate: number | undefined): 'at-risk' | 'warning' | 'good' {
    if (attRate === undefined) return 'good';
    if (attRate < 70) return 'at-risk';
    if (attRate < 80) return 'warning';
    return 'good';
}

export default function StudentDirectoryPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [sortBy, setSortBy] = useState<'name' | 'attendance'>('name');

    const load = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setLoadError('');

            const allClasses = await fetchApi<any[]>('/classes');
            const myClasses = (Array.isArray(allClasses) ? allClasses : [])
                .filter(c => c.teacher?.id === user.id || c.teacherId === user.id);

            if (myClasses.length === 0) {
                setClasses([]);
                setStudents([]);
                return;
            }

            const [detailResults, attResults] = await Promise.all([
                Promise.allSettled(myClasses.map(c => fetchApi<any>(`/classes/${c.id}`))),
                Promise.allSettled(myClasses.map(c => fetchApi<any[]>(`/attendance/class/${c.id}`))),
            ]);

            const detailed = detailResults
                .map(r => r.status === 'fulfilled' ? r.value : null)
                .filter(Boolean);

            setClasses(detailed);

            // Compute per-student attendance rate from class records
            const studentAttRate: Record<string, number> = {};
            myClasses.forEach((cls, i) => {
                const records = attResults[i].status === 'fulfilled'
                    ? (attResults[i] as PromiseFulfilledResult<any[]>).value : [];
                if (!Array.isArray(records)) return;
                const byStudent: Record<string, { total: number; present: number }> = {};
                for (const r of records) {
                    if (!r.studentId) continue;
                    if (!byStudent[r.studentId]) byStudent[r.studentId] = { total: 0, present: 0 };
                    byStudent[r.studentId].total++;
                    if (r.isPresent) byStudent[r.studentId].present++;
                }
                for (const [sid, d] of Object.entries(byStudent)) {
                    studentAttRate[sid] = Math.round((d.present / d.total) * 100);
                }
            });

            // Flatten students across all classes (dedup by id, keep first occurrence)
            const seen = new Set<string>();
            const flat: any[] = [];
            for (const cls of detailed) {
                for (const s of (cls.students || [])) {
                    if (seen.has(s.id)) continue;
                    seen.add(s.id);
                    flat.push({
                        ...s,
                        classId: cls.id,
                        className: cls.name,
                        cefrLevel: cls.cefrLevel,
                        attendance: studentAttRate[s.id],
                    });
                }
            }
            setStudents(flat);
        } catch {
            setLoadError('Failed to load students. Please retry.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { if (user) load(); }, [user?.id, load]);

    const filtered = useMemo(() => {
        return students
            .filter(s => {
                const matchClass = filterClass === 'All' || s.classId === filterClass;
                const status = riskStatus(s.attendance);
                const matchStatus = filterStatus === 'All' || status === filterStatus;
                const q = search.toLowerCase();
                const matchSearch = !q
                    || `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
                    || s.email?.toLowerCase().includes(q)
                    || s.cefrLevel?.toLowerCase().includes(q);
                return matchClass && matchStatus && matchSearch;
            })
            .sort((a, b) => {
                if (sortBy === 'attendance') {
                    if (a.attendance === undefined && b.attendance === undefined) return 0;
                    if (a.attendance === undefined) return 1;
                    if (b.attendance === undefined) return -1;
                    return b.attendance - a.attendance;
                }
                return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
            });
    }, [students, search, filterClass, filterStatus, sortBy]);

    const atRiskCount = students.filter(s => riskStatus(s.attendance) === 'at-risk').length;
    const warningCount = students.filter(s => riskStatus(s.attendance) === 'warning').length;

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <p className="text-sm font-medium">Loading students…</p>
            </div>
        </div>
    );

    if (loadError) return (
        <div className="flex items-center justify-center h-96 flex-col gap-4">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-gray-600">{loadError}</p>
            <button onClick={load}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors">
                <RefreshCw className="w-4 h-4" /> Retry
            </button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto py-8 px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Directory</h1>
                    <p className="text-gray-500 mt-1">
                        {students.length} student{students.length !== 1 ? 's' : ''} across {classes.length} class{classes.length !== 1 ? 'es' : ''}
                    </p>
                </div>
                <div className="flex gap-3">
                    {atRiskCount > 0 && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-bold text-red-700">{atRiskCount} at risk</span>
                        </div>
                    )}
                    {warningCount > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                            <TrendingDown className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-bold text-amber-700">{warningCount} warning</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search students…"
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                        <option value="All">All Classes</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                        <option value="All">All Status</option>
                        <option value="at-risk">At Risk</option>
                        <option value="warning">Warning</option>
                        <option value="good">Good Standing</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                        className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                        <option value="name">Sort: Name</option>
                        <option value="attendance">Sort: Attendance</option>
                    </select>
                </div>
            </div>

            {/* Table / Empty state */}
            {students.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No students enrolled in your classes yet.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Student</th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Class</th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Attendance</th>
                                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                                <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                                        No students match the current filters.
                                    </td>
                                </tr>
                            ) : filtered.map(s => {
                                const status = riskStatus(s.attendance);
                                const cfg = STATUS_CONFIG[status];
                                const attColor = s.attendance === undefined
                                    ? 'text-gray-400'
                                    : s.attendance >= 85 ? 'text-green-600'
                                        : s.attendance >= 80 ? 'text-amber-600'
                                            : 'text-red-600';
                                return (
                                    <tr key={s.id} className={`hover:bg-gray-50/50 transition-colors ${status === 'at-risk' ? 'bg-red-50/30' : status === 'warning' ? 'bg-amber-50/20' : ''}`}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold flex items-center justify-center shrink-0">
                                                    {`${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{s.firstName} {s.lastName}</p>
                                                    <p className="text-xs text-gray-400">{s.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">{s.cefrLevel}</span>
                                            <p className="text-xs text-gray-400 mt-0.5">{s.className}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className={`text-sm font-bold ${attColor}`}>
                                                {s.attendance !== undefined ? `${s.attendance}%` : '—'}
                                            </p>
                                            {s.attendance !== undefined && (
                                                <div className="mt-1 w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${s.attendance >= 85 ? 'bg-green-500' : s.attendance >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${s.attendance}%` }}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border w-fit ${cfg.classes}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href="/instructor/messages"
                                                    className="p-1.5 text-gray-400 hover:text-brand-primary rounded-lg hover:bg-gray-100 transition-colors" title="Message">
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </Link>
                                                <Link href="/instructor/grading"
                                                    className="p-1.5 text-gray-400 hover:text-brand-primary rounded-lg hover:bg-gray-100 transition-colors" title="View grades">
                                                    <BarChart3 className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                        Showing {filtered.length} of {students.length} students
                    </div>
                </div>
            )}
        </div>
    );
}
