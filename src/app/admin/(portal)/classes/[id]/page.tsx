"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
    ArrowLeft, Users, GraduationCap, Calendar, Loader2,
    Plus, Trash2, X, CheckCircle, Clock, BookOpen
} from "lucide-react";

const CEFR_COLORS: Record<string, string> = {
    A1: "bg-emerald-100 text-emerald-800",
    A2: "bg-green-100 text-green-800",
    B1: "bg-blue-100 text-blue-800",
    B2: "bg-indigo-100 text-indigo-800",
    C1: "bg-purple-100 text-purple-800",
    C2: "bg-rose-100 text-rose-800",
};

const STATUS_STYLES: Record<string, string> = {
    enrolling: "bg-amber-50 text-amber-700 border border-amber-200",
    active: "bg-green-50 text-green-700 border border-green-200",
    completed: "bg-gray-100 text-gray-600 border border-gray-200",
};

export default function ClassRosterPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;

    const [cls, setCls] = useState<any>(null);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const loadClass = useCallback(async () => {
        try {
            setIsLoading(true);
            const [classData, studentsData] = await Promise.all([
                fetchApi(`/classes/${classId}`),
                fetchApi('/users?role=student'),
            ]);
            setCls(classData);
            setAllStudents((studentsData as any[]) || []);
        } catch (err: any) {
            setLoadError("Failed to load class data. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        loadClass();
    }, [loadClass]);

    const notify = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handleEnrollStudent = async () => {
        if (!selectedStudentId) return;
        try {
            setIsSaving(true);
            await fetchApi(`/classes/${classId}/enroll`, {
                method: 'POST',
                body: JSON.stringify({ studentId: selectedStudentId }),
            });
            setIsAddModalOpen(false);
            setSelectedStudentId("");
            notify("Student enrolled successfully.");
            loadClass();
        } catch (err: any) {
            alert(err?.message || "Failed to enroll student.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveStudent = async (studentId: string, name: string) => {
        if (!confirm(`Remove ${name} from this class?`)) return;
        try {
            setIsSaving(true);
            await fetchApi(`/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
            notify("Student removed from class.");
            loadClass();
        } catch (err: any) {
            alert(err?.message || "Failed to remove student.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            setStatusUpdating(true);
            await fetchApi(`/classes/${classId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            notify(`Class status updated to ${newStatus}.`);
            loadClass();
        } catch (err: any) {
            alert(err?.message || "Failed to update status.");
        } finally {
            setStatusUpdating(false);
        }
    };

    const enrolledIds = new Set((cls?.students || []).map((s: any) => s.id));
    const unenrolledStudents = allStudents.filter(s => !enrolledIds.has(s.id));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    if (loadError && !cls) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <p className="text-red-600">{loadError}</p>
                <button onClick={() => router.back()} className="text-brand-primary underline text-sm">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Success toast */}
            {successMsg && (
                <div className="fixed top-20 right-6 z-50 bg-green-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle className="w-4 h-4" />
                    {successMsg}
                </div>
            )}

            {/* Back link */}
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-primary transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Classes
            </button>

            {/* Class Header Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-7 h-7 text-brand-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold text-gray-900">{cls?.name}</h1>
                                {cls?.cefrLevel && (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CEFR_COLORS[cls.cefrLevel] || 'bg-gray-100 text-gray-700'}`}>
                                        {cls.cefrLevel}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 flex-wrap">
                                {cls?.branch?.name && (
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                        {cls.branch.name}
                                    </span>
                                )}
                                {cls?.teacher && (
                                    <span className="flex items-center gap-1">
                                        <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                                        {cls.teacher.firstName} {cls.teacher.lastName}
                                    </span>
                                )}
                                {(cls?.startDate || cls?.endDate) && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                        {cls.startDate
                                            ? new Date(cls.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : '—'}
                                        {' – '}
                                        {cls.endDate
                                            ? new Date(cls.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status control */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[cls?.status] || 'bg-gray-100 text-gray-600'}`}>
                            {cls?.status}
                        </span>
                        {statusUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <select
                                value={cls?.status || 'enrolling'}
                                onChange={e => handleStatusChange(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white"
                            >
                                <option value="enrolling">Set: Enrolling</option>
                                <option value="active">Set: Active</option>
                                <option value="completed">Set: Completed</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-gray-100 text-center">
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{cls?.students?.length || 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Enrolled Students</p>
                    </div>
                    <div className="border-x border-gray-100">
                        <p className={`text-2xl font-bold ${cls?.status === 'active' ? 'text-green-600' : cls?.status === 'completed' ? 'text-gray-400' : 'text-amber-500'}`}>
                            {cls?.status === 'active' ? 'Active' : cls?.status === 'completed' ? 'Done' : 'Open'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Class Status</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">25</p>
                        <p className="text-xs text-gray-500 mt-0.5">Max Capacity</p>
                    </div>
                </div>
            </div>

            {/* Roster Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-semibold text-gray-900">Student Roster</h2>
                        <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {cls?.students?.length || 0}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={unenrolledStudents.length === 0}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand-primary rounded-lg px-3 py-1.5 hover:bg-brand-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Student
                    </button>
                </div>

                {cls?.students?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                            <Users className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="font-medium text-gray-600">No students enrolled yet</p>
                        <p className="text-sm text-gray-400 mt-1">Click "Add Student" to enroll students from the system.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Student</th>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3">Level</th>
                                    <th className="px-6 py-3">Account</th>
                                    <th className="px-6 py-3">Visa</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {cls.students.map((student: any) => (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                                    {student.firstName?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                                                    <p className="text-xs text-gray-500">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{student.id.split('-')[0]}</td>
                                        <td className="px-6 py-4">
                                            {student.cefrLevel ? (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CEFR_COLORS[student.cefrLevel] || 'bg-gray-100 text-gray-700'}`}>
                                                    {student.cefrLevel}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${student.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {student.isActive ? (
                                                    <><CheckCircle className="w-3 h-3" />Active</>
                                                ) : (
                                                    <><Clock className="w-3 h-3" />Inactive</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-medium ${student.visaStatus === 'Approved' ? 'text-green-600' :
                                                student.visaStatus === 'Pending' ? 'text-amber-600' :
                                                    student.visaStatus === 'In Progress' ? 'text-blue-600' : 'text-gray-400'
                                                }`}>
                                                {student.visaStatus || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemoveStudent(student.id, `${student.firstName} ${student.lastName}`)}
                                                disabled={isSaving}
                                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-30"
                                                title="Remove from class"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Add Student to Class</h3>
                            <button
                                onClick={() => { setIsAddModalOpen(false); setSelectedStudentId(""); }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {unenrolledStudents.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">
                                    All registered students are already enrolled in this class.
                                </p>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Student</label>
                                        <select
                                            value={selectedStudentId}
                                            onChange={e => setSelectedStudentId(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-white"
                                        >
                                            <option value="">— Choose a student —</option>
                                            {unenrolledStudents.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.firstName} {s.lastName}
                                                    {s.cefrLevel ? ` (${s.cefrLevel})` : ''} — {s.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {unenrolledStudents.length} student{unenrolledStudents.length !== 1 ? 's' : ''} available.
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => { setIsAddModalOpen(false); setSelectedStudentId(""); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnrollStudent}
                                disabled={!selectedStudentId || isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
