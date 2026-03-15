"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Plus, ArrowLeft, GripVertical, Video, Headphones, AlignLeft, Mic, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CreateLessonModal } from "../components/CreateLessonModal";

export default function CourseEditorPage() {
    const params = useParams();
    const courseId = params.id as string;
    const [course, setCourse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [activeModuleForLesson, setActiveModuleForLesson] = useState<{ id: string, nextIndex: number } | null>(null);

    useEffect(() => {
        if (courseId) {
            loadCourseDetails();
        }
    }, [courseId]);

    const loadCourseDetails = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi(`/courses/${courseId}`);
            setCourse(data);
        } catch (error) {
            console.error("Failed to load course details", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddModule = async () => {
        const title = prompt("Enter module title (e.g., 'Chapter 1: Introductions'):");
        if (!title) return;

        try {
            await fetchApi(`/courses/${courseId}/modules`, {
                method: 'POST',
                body: JSON.stringify({ title, order_index: (course.modules?.length || 0) + 1 })
            });
            loadCourseDetails(); // Refresh
        } catch (error) {
            alert("Failed to add module");
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm("Are you sure you want to delete this module and ALL its lessons?")) return;
        try {
            await fetchApi(`/courses/modules/${moduleId}`, { method: 'DELETE' });
            loadCourseDetails();
        } catch (error) {
            alert("Failed to delete module");
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'video': return <Video className="w-4 h-4 text-blue-500" />;
            case 'listening': return <Headphones className="w-4 h-4 text-purple-500" />;
            case 'speaking': return <Mic className="w-4 h-4 text-green-500" />;
            default: return <AlignLeft className="w-4 h-4 text-gray-500" />;
        }
    };

    if (isLoading) return <div className="p-8 animate-pulse text-gray-500">Loading course curriculum...</div>;
    if (!course) return <div className="p-8 text-red-500">Course not found.</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <Link href="/admin/courses" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-brand-primary/10 text-brand-primary">
                            {course.cefr_level}
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
                    </div>
                    <p className="text-gray-500 text-sm">{course.description}</p>
                </div>
                <button
                    onClick={handleAddModule}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Module
                </button>
            </div>

            {/* Curriculum Tree */}
            <div className="space-y-4">
                {course.modules?.map((module: any, idx: number) => (
                    <div key={module.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

                        {/* Module Header */}
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                <h3 className="font-semibold text-gray-900">
                                    Module {idx + 1}: {module.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setActiveModuleForLesson({ id: module.id, nextIndex: (module.lessons?.length || 0) + 1 })}
                                    className="text-sm px-3 py-1.5 text-brand-primary hover:bg-brand-primary/10 rounded font-medium flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Lesson
                                </button>
                                <button
                                    onClick={() => handleDeleteModule(module.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Lessons List */}
                        <div className="divide-y divide-gray-100">
                            {module.lessons?.length === 0 ? (
                                <div className="px-12 py-6 text-sm text-gray-400 italic">
                                    No lessons added to this module yet.
                                </div>
                            ) : (
                                module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any, lessonIdx: number) => (
                                    <div key={lesson.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                                        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab ml-6" />
                                        <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                            {getIconForType(lesson.content_type)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800 text-sm">
                                                {lessonIdx + 1}. {lesson.title}
                                            </p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (confirm("Delete this lesson?")) {
                                                    await fetchApi(`/courses/lessons/${lesson.id}`, { method: 'DELETE' });
                                                    loadCourseDetails();
                                                }
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                ))}
            </div>

            <CreateLessonModal
                isOpen={!!activeModuleForLesson}
                onClose={() => setActiveModuleForLesson(null)}
                onSuccess={() => {
                    setActiveModuleForLesson(null);
                    loadCourseDetails();
                }}
                moduleId={activeModuleForLesson?.id || ""}
                nextOrderIndex={activeModuleForLesson?.nextIndex || 1}
            />
        </div>
    );
}

