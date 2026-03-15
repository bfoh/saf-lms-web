"use client";

import { useEffect, useState } from "react";
import { BookOpen, Clock, Calendar, PlayCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function StudentExamsPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi('/exams');
            setExams(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load exams:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mock Exams & Practice Tests</h1>
                    <p className="text-gray-500 text-sm mt-1">Take official Goethe-Zertifikat mock exams to prepare for your test.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="p-12 text-center text-gray-500">Loading exams...</div>
            ) : exams.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Exams Available</h3>
                    <p className="text-gray-500 mb-4 max-w-sm mx-auto">Your instructors haven't published any mock exams for your level yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam) => (
                        <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold
                                        ${exam.cefrLevel.startsWith('A') ? 'bg-green-50 text-green-700' :
                                            exam.cefrLevel.startsWith('B') ? 'bg-blue-50 text-blue-700' :
                                                'bg-purple-50 text-purple-700'}`}>
                                        {exam.cefrLevel}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-md">
                                        <Clock className="w-3.5 h-3.5" />
                                        {exam.durationMins} mins
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-2">{exam.title}</h3>

                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                                    <BookOpen className="w-4 h-4 text-gray-400" />
                                    <span>{exam.sections?.length || 0} Modules</span>
                                </div>

                                <button
                                    onClick={() => alert(`Navigating to /student/exams/${exam.id} soon...`)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors font-medium shadow-sm"
                                >
                                    <PlayCircle className="w-4 h-4" />
                                    Start Exam
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
