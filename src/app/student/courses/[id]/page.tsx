"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Loader2, CheckCircle, ArrowLeft, PlayCircle, BookOpen, Volume2, Mic } from "lucide-react";
import Link from "next/link";
import HorenPlayer from "../../components/HorenPlayer";
import SprechenWidget from "../../components/SprechenWidget";

export default function CoursePlayerPage() {
    const params = useParams();
    const router = useRouter();
    const [course, setCourse] = useState<any>(null);
    const [activeLesson, setActiveLesson] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const [xpEarned, setXpEarned] = useState<number | null>(null);

    useEffect(() => {
        async function loadCourse() {
            try {
                const data = await fetchApi<any>(`/courses/${params.id}`);
                setCourse(data);
                // Default to first lesson of first module if available
                if (data?.modules?.length > 0 && data.modules[0].lessons?.length > 0) {
                    setActiveLesson(data.modules[0].lessons[0]);
                }
            } catch (error) {
                console.error("Failed to load course details:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadCourse();
    }, [params.id]);

    const handleMarkComplete = async () => {
        if (!activeLesson) return;
        setIsCompleting(true);
        try {
            const res = await fetchApi<any>(`/dashboard/lessons/${activeLesson.id}/complete`, { method: 'POST' });
            if (res?.xpAwarded > 0) {
                setXpEarned(res.xpAwarded);

                // Trigger gamification visual effect (simplified timeout to hide after 3s)
                setTimeout(() => setXpEarned(null), 3000);
            }
        } catch (error) {
            console.error("Failed to mark complete:", error);
        } finally {
            setIsCompleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
        );
    }

    if (!course) {
        return <div className="text-center py-20 text-gray-500">Course not found.</div>;
    }

    const getIconForType = (type: string) => {
        switch (type) {
            case 'video': return <PlayCircle className="w-4 h-4" />;
            case 'reading': return <BookOpen className="w-4 h-4" />;
            case 'listening': return <Volume2 className="w-4 h-4" />;
            case 'speaking': return <Mic className="w-4 h-4" />;
            default: return <BookOpen className="w-4 h-4" />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto flex h-[calc(100vh-64px)]">

            {/* Gamification Notification Toast */}
            {xpEarned !== null && (
                <div className="fixed top-20 right-8 bg-gradient-to-r from-orange-400 to-brand-primary text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-bounce flex items-center gap-3">
                    <span className="text-2xl">🔥</span>
                    <div>
                        <p className="font-bold text-lg">+{xpEarned} XP Earned!</p>
                        <p className="text-xs opacity-90">Keep the streak alive!</p>
                    </div>
                </div>
            )}

            {/* Sidebar Navigation */}
            <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-full overflow-y-auto hidden md:flex">
                <div className="p-6 border-b border-gray-200">
                    <Link href="/student/courses" className="text-sm text-gray-500 flex items-center hover:text-brand-primary mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Courses
                    </Link>
                    <h2 className="font-bold text-gray-900 font-poppins text-lg leading-tight">{course.title}</h2>
                    <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded">{course.cefrLevel}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {course.modules?.map((mdl: any, mIdx: number) => (
                        <div key={mdl.id} className="border-b border-gray-200">
                            <div className="px-6 py-4 bg-gray-100/50 flex justify-between items-center group cursor-pointer hover:bg-gray-100 transition-colors">
                                <h3 className="text-sm font-semibold text-gray-800">Module {mIdx + 1}: {mdl.title}</h3>
                            </div>
                            <div className="py-2">
                                {mdl.lessons?.map((lesson: any, lIdx: number) => {
                                    const isActive = activeLesson?.id === lesson.id;
                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => setActiveLesson(lesson)}
                                            className={`w-full text-left px-6 py-2.5 flex items-start gap-3 transition-colors ${isActive ? 'bg-brand-primary/5 border-l-4 border-brand-primary' : 'hover:bg-gray-100 border-l-4 border-transparent'}`}
                                        >
                                            <div className={`mt-0.5 ${isActive ? 'text-brand-primary' : 'text-gray-400'}`}>
                                                {getIconForType(lesson.contentType)}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${isActive ? 'font-semibold text-brand-primary' : 'font-medium text-gray-700'}`}>
                                                    {lIdx + 1}. {lesson.title}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-white relative">
                {activeLesson ? (
                    <>
                        <div className="border-b border-gray-100 p-8 flex justify-between items-center bg-white z-10 sticky top-0">
                            <div>
                                <span className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 block">{activeLesson.contentType}</span>
                                <h1 className="text-2xl font-bold font-poppins text-gray-900">{activeLesson.title}</h1>
                            </div>
                            <button
                                onClick={handleMarkComplete}
                                disabled={isCompleting}
                                className="bg-brand-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-brand-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Complete & Earn XP
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto max-w-4xl mx-auto w-full">

                            {/* Render Content Based on Type */}
                            {activeLesson.contentType === 'video' && activeLesson.contentData?.videoUrl && (
                                <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-8 shadow-sm">
                                    <iframe
                                        src={activeLesson.contentData.videoUrl.replace('watch?v=', 'embed/')}
                                        className="w-full h-full"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}

                            {activeLesson.contentType === 'listening' && activeLesson.contentData?.audioUrl && (
                                <div className="mb-8">
                                    <audio controls className="w-full rounded-lg bg-gray-50 border border-gray-200">
                                        <source src={activeLesson.contentData.audioUrl} type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            )}

                            {activeLesson.contentType === 'listening' && !activeLesson.contentData?.audioUrl && activeLesson.contentData?.textContent && (
                                <div className="mb-8 max-w-xl">
                                    <HorenPlayer title="AI Generative Listening Task" textPayload={activeLesson.contentData.textContent} />
                                </div>
                            )}

                            {activeLesson.contentType === 'speaking' && (
                                <div className="mb-8 max-w-xl">
                                    <SprechenWidget cefrLevel={course.cefrLevel} contextPrompt={activeLesson.contentData?.textContent || 'Introduce yourself.'} />
                                </div>
                            )}

                            {/* Rich Text Content */}
                            <div className="prose prose-brand max-w-none prose-headings:font-poppins prose-a:text-brand-primary">
                                {activeLesson.contentData?.textContent ? (
                                    <div dangerouslySetInnerHTML={{ __html: activeLesson.contentData.textContent }} />
                                ) : (
                                    <p className="text-gray-500 italic">No text content provided for this lesson.</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <BookOpen className="w-16 h-16 mb-4 text-gray-200" />
                        <p className="text-lg font-medium">Select a lesson to begin</p>
                    </div>
                )}
            </div>

        </div>
    );
}
