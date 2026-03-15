"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Users, CheckCircle, XCircle, Loader2, Save, Calendar as CalendarIcon } from "lucide-react";

export default function ClassRegisterPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;

    const [classData, setClassData] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    const todayDateStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch the class and its enrolled students
                const cls = await fetchApi(`/classes/${classId}`) as any;
                setClassData(cls);

                // Expecting backend to return enrolled students within cls.enrollments
                const enrolled = cls.enrollments?.map((e: any) => e.student) || [];
                setStudents(enrolled);

                // Initialize all as Present by default (optimistic UX for teachers)
                const initialMap: Record<string, boolean> = {};
                enrolled.forEach((s: any) => {
                    initialMap[s.id] = true;
                });
                setAttendanceMap(initialMap);

                // Note: In a complete implementation, we'd also fetch today's EXISTING attendance
                // and override 'initialMap' if records already exist.

            } catch (error) {
                console.error("Failed to load class data for register:", error);
            } finally {
                setIsLoading(false);
            }
        }
        if (classId) loadData();
    }, [classId]);

    const toggleAttendance = (studentId: string) => {
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatusMessage("");
        try {
            const records = Object.entries(attendanceMap).map(([studentId, isPresent]) => ({
                studentId,
                isPresent
            }));

            await fetchApi(`/attendance/class/${classId}`, {
                method: 'POST',
                body: JSON.stringify({ records })
            });

            setStatusMessage("Attendance saved successfully!");
            setTimeout(() => setStatusMessage(""), 3000);
        } catch (error) {
            setStatusMessage("Failed to save attendance.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-brand-primary/10 text-brand-primary text-xs font-bold px-2 py-1 rounded">Register</span>
                    <span className="text-gray-500 text-sm flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> {todayDateStr}</span>
                </div>
                <h1 className="text-3xl font-bold font-poppins text-gray-900">{classData?.name || 'Class Attendance'}</h1>
                <p className="text-gray-500 mt-2">Mark student attendance for today's session.</p>
            </div>

            <div className="bg-white border text-center border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-sm font-semibold text-gray-700">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" /> Students ({students.length})
                    </div>
                    <div className="flex gap-4 pr-4">
                        <span className="text-green-600">Present</span>
                        <span className="text-red-600">Absent</span>
                    </div>
                </div>

                {students.length === 0 ? (
                    <div className="p-8 text-gray-500 flex flex-col items-center">
                        <Users className="w-12 h-12 mb-4 opacity-50 text-gray-300" />
                        <p>No students enrolled in this cohort yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {students.map((student, idx) => {
                            const isPresent = attendanceMap[student.id];
                            return (
                                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                            {student.firstName?.[0]}{student.lastName?.[0]}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-900">{student.firstName} {student.lastName}</p>
                                            <p className="text-xs text-gray-500">{student.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                        <button
                                            onClick={() => setAttendanceMap({ ...attendanceMap, [student.id]: true })}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${isPresent ? 'bg-white shadow-sm text-green-700 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <CheckCircle className="w-4 h-4" /> Present
                                        </button>
                                        <button
                                            onClick={() => setAttendanceMap({ ...attendanceMap, [student.id]: false })}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${!isPresent ? 'bg-white shadow-sm text-red-700 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <XCircle className="w-4 h-4" /> Absent
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div>
                    {statusMessage && (
                        <span className={`text-sm font-medium ${statusMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                            {statusMessage}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || students.length === 0}
                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-primary transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Submit Attendance
                </button>
            </div>

        </div>
    );
}
