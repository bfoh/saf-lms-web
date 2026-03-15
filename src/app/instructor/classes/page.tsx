'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, MapPin, CheckCircle2, ChevronDown, ChevronUp,
    Calendar, Loader2, AlertTriangle, RefreshCw, Video,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';

type AttendanceStatus = 'present' | 'late' | 'absent' | null;

function initials(u: any) {
    if (!u) return 'U';
    const init = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
    return init || 'U';
}

export default function ClassesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    // attendance[classId][studentId] = AttendanceStatus
    const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({});
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState<string | null>(null);
    // attRates[classId][studentId] = attendance % computed from all records
    const [attRates, setAttRates] = useState<Record<string, Record<string, number>>>({});
    // activeSessions[classId] = sessionId if a live session exists
    const [activeSessions, setActiveSessions] = useState<Record<string, string>>({});
    const [startingClass, setStartingClass] = useState<string | null>(null);

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
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            const [detailResults, allAttResults, todayAttResults] = await Promise.all([
                Promise.allSettled(myClasses.map(c => fetchApi<any>(`/classes/${c.id}`))),
                Promise.allSettled(myClasses.map(c => fetchApi<any[]>(`/attendance/class/${c.id}`))),
                Promise.allSettled(myClasses.map(c => fetchApi<any[]>(`/attendance/class/${c.id}?date=${today}`))),
            ]);

            const detailed = detailResults
                .map(r => r.status === 'fulfilled' ? r.value : null)
                .filter(Boolean);

            setClasses(detailed);
            if (detailed.length > 0) setExpanded(detailed[0].id);

            // Check for active live sessions per class
            const sessionResults = await Promise.allSettled(
                myClasses.map(c => fetchApi<any>(`/live-classroom/class/${c.id}/active`))
            );
            const sessions: Record<string, string> = {};
            myClasses.forEach((cls, i) => {
                const res = sessionResults[i];
                if (res.status === 'fulfilled' && res.value?.id) {
                    sessions[cls.id] = res.value.id;
                }
            });
            setActiveSessions(sessions);

            // Compute historical attendance rate per student per class
            const rates: Record<string, Record<string, number>> = {};
            myClasses.forEach((cls, i) => {
                const records = allAttResults[i].status === 'fulfilled'
                    ? (allAttResults[i] as PromiseFulfilledResult<any[]>).value : [];
                if (!Array.isArray(records) || records.length === 0) return;
                const byStudent: Record<string, { total: number; present: number }> = {};
                for (const r of records) {
                    if (!r.studentId) continue;
                    if (!byStudent[r.studentId]) byStudent[r.studentId] = { total: 0, present: 0 };
                    byStudent[r.studentId].total++;
                    if (r.isPresent) byStudent[r.studentId].present++;
                }
                rates[cls.id] = {};
                for (const [sid, d] of Object.entries(byStudent)) {
                    rates[cls.id][sid] = Math.round((d.present / d.total) * 100);
                }
            });
            setAttRates(rates);

            // Prefill today's saved attendance marks
            const todayMark: Record<string, Record<string, AttendanceStatus>> = {};
            const savedToday = new Set<string>();
            myClasses.forEach((cls, i) => {
                const records = todayAttResults[i].status === 'fulfilled'
                    ? (todayAttResults[i] as PromiseFulfilledResult<any[]>).value : [];
                if (!Array.isArray(records) || records.length === 0) return;
                todayMark[cls.id] = {};
                for (const r of records) {
                    if (r.studentId) todayMark[cls.id][r.studentId] = r.isPresent ? 'present' : 'absent';
                }
                savedToday.add(cls.id);
            });
            if (Object.keys(todayMark).length > 0) {
                setAttendance(prev => ({ ...prev, ...todayMark }));
                setSaved(savedToday);
            }
        } catch {
            setLoadError('Failed to load classes. Please retry.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { if (user) load(); }, [user?.id, load]);

    const mark = (classId: string, studentId: string, status: AttendanceStatus) =>
        setAttendance(prev => ({
            ...prev,
            [classId]: { ...(prev[classId] || {}), [studentId]: status },
        }));

    const getAttStatus = (classId: string, studentId: string): AttendanceStatus =>
        attendance[classId]?.[studentId] ?? null;

    const startClassroom = async (cls: any) => {
        if (activeSessions[cls.id]) {
            router.push(`/instructor/classroom/${activeSessions[cls.id]}`);
            return;
        }
        setStartingClass(cls.id);
        try {
            const session = await fetchApi<any>('/live-classroom', {
                method: 'POST',
                body: JSON.stringify({ classId: cls.id, title: `Live Session — ${cls.name}` }),
            });
            // Automatically start the session so it's visible to students
            await fetchApi(`/live-classroom/${session.id}/start`, { method: 'POST' });
            router.push(`/instructor/classroom/${session.id}`);
        } catch {
            setStartingClass(null);
        }
    };

    const saveAttendance = async (classId: string) => {
        const classAtt = attendance[classId] || {};
        const records = Object.entries(classAtt)
            .filter(([, s]) => s !== null)
            .map(([studentId, status]) => ({
                studentId,
                isPresent: status === 'present' || status === 'late',
            }));
        if (records.length === 0) return;
        setSaving(classId);
        try {
            await fetchApi(`/attendance/class/${classId}`, {
                method: 'POST',
                body: JSON.stringify({ records }),
            });
            setSaved(prev => new Set([...prev, classId]));
        } catch {
            // keep button available for retry
        } finally {
            setSaving(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <p className="text-sm font-medium">Loading classes…</p>
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
        <div className="max-w-5xl mx-auto py-8 px-6 lg:px-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
                <p className="text-gray-500 mt-1">Manage sessions, take attendance, and view class progress.</p>
            </div>

            {classes.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No classes assigned yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {classes.map(cls => {
                        const isExpanded = expanded === cls.id;
                        const isLive = !!activeSessions[cls.id];
                        const isSaved = saved.has(cls.id);
                        const isSaving = saving === cls.id;
                        const students: any[] = cls.students || [];
                        const classRates = attRates[cls.id] || {};
                        const markedCount = Object.values(attendance[cls.id] || {}).filter(v => v !== null).length;

                        // Class-level derived stats
                        const studentsWithData = students.filter(s => classRates[s.id] !== undefined);
                        const avgAttendance = studentsWithData.length > 0
                            ? Math.round(studentsWithData.reduce((a, s) => a + classRates[s.id], 0) / studentsWithData.length)
                            : null;
                        const atRiskCount = students.filter(s =>
                            classRates[s.id] !== undefined && classRates[s.id] < 70
                        ).length;

                        const studentRisk = (s: any) => {
                            const r = classRates[s.id];
                            if (r === undefined) return 'good';
                            if (r < 70) return 'at-risk';
                            if (r < 80) return 'warning';
                            return 'good';
                        };

                        return (
                            <div key={cls.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isLive ? 'border-green-200' : 'border-gray-100'}`}>
                                {/* Class header */}
                                <div className="p-5 flex items-center gap-4">
                                    <div className={`p-3 rounded-xl shrink-0 ${isLive ? 'bg-green-50' : 'bg-brand-primary/10'}`}>
                                        <Users className={`w-5 h-5 ${isLive ? 'text-green-600' : 'text-brand-primary'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-gray-900">{cls.name}</h3>
                                            <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">{cls.cefrLevel}</span>
                                            {isLive && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> LIVE
                                                </span>
                                            )}
                                            {cls.status === 'enrolling' && (
                                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">Enrolling</span>
                                            )}
                                            {cls.status === 'completed' && (
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">Completed</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                                            {cls.startDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(cls.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {cls.endDate && ` – ${new Date(cls.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                </span>
                                            )}
                                            {cls.branch?.name && (
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cls.branch.name}</span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />{students.length} student{students.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => startClassroom(cls)}
                                            disabled={startingClass === cls.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                                            style={activeSessions[cls.id]
                                                ? { background: 'rgba(15,107,62,0.1)', color: '#0F6B3E', border: '1px solid rgba(15,107,62,0.3)' }
                                                : { background: 'rgba(15,107,62,0.08)', color: '#0F6B3E', border: '1px solid rgba(15,107,62,0.2)' }}>
                                            {startingClass === cls.id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Video className="w-3.5 h-3.5" />}
                                            {activeSessions[cls.id] ? 'Resume' : 'Start Classroom'}
                                        </button>
                                        
                                        {activeSessions[cls.id] && (
                                            <button
                                                onClick={async () => {
                                                    if (confirm('End this class session?')) {
                                                        try {
                                                            await fetchApi(`/live-classroom/${activeSessions[cls.id]}/end`, { method: 'POST' });
                                                            load(); // Reload to clear the 'Live' state
                                                        } catch (e) {
                                                            console.error('Failed to end session:', e);
                                                        }
                                                    }
                                                }}
                                                title="Force End Session"
                                                className="p-1.5 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={() => setExpanded(isExpanded ? null : cls.id)}
                                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0">
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </button>
                                </div>

                                {/* Expanded: attendance + stats */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
                                        {students.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">No students enrolled yet.</p>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-gray-700">Quick Attendance Toggle</h4>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-400">{markedCount}/{students.length} marked</span>
                                                        <button
                                                            onClick={() => saveAttendance(cls.id)}
                                                            disabled={isSaved || markedCount === 0 || isSaving}
                                                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-brand-primary text-white disabled:opacity-40 hover:bg-brand-primary/90 transition-colors"
                                                        >
                                                            {isSaving
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                            {isSaved ? 'Saved!' : 'Save Attendance'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {students.map(student => {
                                                        const status = getAttStatus(cls.id, student.id);
                                                        const risk = studentRisk(student);
                                                        const attRate = classRates[student.id];
                                                        const riskColor = risk === 'at-risk'
                                                            ? 'border-red-200 bg-red-50/30'
                                                            : risk === 'warning'
                                                                ? 'border-amber-200 bg-amber-50/30'
                                                                : 'border-gray-100 bg-white';
                                                        return (
                                                            <div key={student.id} className={`flex items-center gap-3 p-3 rounded-xl border ${riskColor}`}>
                                                                <div className="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-xs font-bold shrink-0">
                                                                    {initials(student)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                                                                    <p className="text-[10px] text-gray-400">
                                                                        {attRate !== undefined ? `Attendance: ${attRate}%` : 'No history yet'}
                                                                        {risk === 'at-risk' && <span className="text-red-500 ml-1 font-semibold">⚠ At Risk</span>}
                                                                        {risk === 'warning' && <span className="text-amber-500 ml-1 font-semibold">⚠ Warning</span>}
                                                                    </p>
                                                                </div>
                                                                <div className="flex gap-1.5 shrink-0">
                                                                    {(['present', 'late', 'absent'] as const).map(s => (
                                                                        <button
                                                                            key={s}
                                                                            onClick={() => mark(cls.id, student.id, status === s ? null : s)}
                                                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all capitalize ${status === s
                                                                                ? s === 'present' ? 'bg-green-500 text-white border-green-500'
                                                                                    : s === 'late' ? 'bg-amber-500 text-white border-amber-500'
                                                                                        : 'bg-red-500 text-white border-red-500'
                                                                                : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                                        >
                                                                            {s}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Class stats */}
                                                <div className="flex gap-3 pt-2">
                                                    <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 text-center">
                                                        <p className={`text-lg font-bold ${avgAttendance !== null ? 'text-green-600' : 'text-gray-400'}`}>
                                                            {avgAttendance !== null ? `${avgAttendance}%` : '—'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">Avg Attendance</p>
                                                    </div>
                                                    <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 text-center">
                                                        <p className="text-lg font-bold text-gray-400">—</p>
                                                        <p className="text-[10px] text-gray-400">Quiz Average</p>
                                                    </div>
                                                    <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 text-center">
                                                        <p className={`text-lg font-bold ${atRiskCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                            {studentsWithData.length > 0 ? atRiskCount : '—'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">At Risk</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
