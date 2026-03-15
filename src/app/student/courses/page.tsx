'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, ArrowRight, Loader2, AlertCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Course {
    id: string;
    title: string;
    description?: string;
    cefrLevel: string;
    cefr_level?: string;
    thumbnailUrl?: string;
    thumbnail_url?: string;
    price?: number | string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CefrBadge({ level }: { level: string }) {
    const colors: Record<string, string> = {
        A1: 'bg-blue-100 text-blue-700',
        A2: 'bg-cyan-100 text-cyan-700',
        B1: 'bg-brand-primary/90 text-white',
        B2: 'bg-purple-600 text-white',
        C1: 'bg-rose-600 text-white',
        C2: 'bg-amber-500 text-white',
    };
    return (
        <span className={`text-xs font-bold px-2 py-0.5 rounded shadow-sm ${colors[level] ?? 'bg-gray-200 text-gray-700'}`}>
            {level}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CoursesPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchApi<Course[]>('/courses');
                setCourses(data);
            } catch (err: any) {
                setError(err.message ?? 'Failed to load courses.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    {user?.user_metadata?.first_name ? `${user.user_metadata.first_name}'s Courses` : 'My Courses'}
                </h1>
                <p className="text-gray-500 mt-1">
                    Access your official Goethe-Institut preparation paths.
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && courses.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600">No courses found.</h3>
                    <p className="text-gray-400 text-sm mt-1">
                        Check back later or contact administration to enrol.
                    </p>
                </div>
            )}

            {/* Course Grid */}
            {!loading && !error && courses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <Link
                            href={`/student/courses/${course.id}`}
                            key={course.id}
                            className="block group"
                        >
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 h-full flex flex-col">
                                {/* Thumbnail */}
                                <div className="h-40 bg-gray-100 relative overflow-hidden">
                                    {course.thumbnailUrl || course.thumbnail_url ? (
                                        <img
                                            src={course.thumbnailUrl || course.thumbnail_url}
                                            alt={course.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-brand-primary/8 flex items-center justify-center group-hover:bg-brand-primary/12 transition-colors">
                                            <GraduationCap className="w-14 h-14 text-brand-primary/30" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <CefrBadge level={course.cefrLevel || course.cefr_level || '??'} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-3">
                                        {course.description || 'Comprehensive curriculum preparation for the Goethe-Institut examination.'}
                                    </p>
                                    {/* Price */}
                                    <div className="mb-4">
                                        {course.price && Number(course.price) > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-primary/8 border border-brand-primary/20 text-brand-primary font-bold text-sm">
                                                GH₵{Number(course.price).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm">
                                                Free
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center text-brand-primary text-sm font-semibold gap-1.5 group-hover:gap-2.5 transition-all">
                                        <BookOpen className="w-4 h-4" />
                                        Open Course
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
