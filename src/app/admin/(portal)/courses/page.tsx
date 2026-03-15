"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Search, BookOpen, Clock, MoreVertical,
    Edit2, Trash2, Eye, EyeOff, Loader2, X, DollarSign,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { CreateCourseModal } from "./components/CreateCourseModal";

const CEFR_COLORS: Record<string, string> = {
    A1: "bg-sky-100 text-sky-700 border-sky-200",
    A2: "bg-blue-100 text-blue-700 border-blue-200",
    B1: "bg-violet-100 text-violet-700 border-violet-200",
    B2: "bg-purple-100 text-purple-700 border-purple-200",
    C1: "bg-emerald-100 text-emerald-700 border-emerald-200",
    C2: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
};

const CEFR_BG: Record<string, string> = {
    A1: "bg-sky-50",
    A2: "bg-blue-50",
    B1: "bg-violet-50",
    B2: "bg-purple-50",
    C1: "bg-emerald-50",
    C2: "bg-brand-primary/5",
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditCourseModal({
    course, onClose, onSuccess,
}: { course: any; onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({
        title: course.title || "",
        cefr_level: course.cefr_level || "A1",
        description: course.description || "",
        price: course.price != null ? String(course.price) : "0",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            await fetchApi(`/courses/${course.id}`, {
                method: "PATCH",
                body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0 }),
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message || "Failed to update course.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Edit Course</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course Title <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="text"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CEFR Level</label>
                        <select
                            value={form.cefr_level}
                            onChange={e => setForm({ ...form, cefr_level: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
                        >
                            {["A1","A2","B1","B2","C1","C2"].map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Course Price
                            <span className="ml-1 text-xs font-normal text-gray-400">(GHS — set 0 for free)</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">GH₵</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: e.target.value })}
                                className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.title}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Card Dropdown ────────────────────────────────────────────────────────────
function CourseDropdown({
    course,
    onEdit,
    onDelete,
    onTogglePublish,
}: {
    course: any;
    onEdit: () => void;
    onDelete: () => void;
    onTogglePublish: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {open && (
                <div className="absolute right-0 top-7 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 text-sm">
                    <button
                        onClick={() => { setOpen(false); onEdit(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Details
                    </button>
                    <button
                        onClick={() => { setOpen(false); onTogglePublish(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        {course.is_published
                            ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                            : <><Eye className="w-3.5 h-3.5" /> Publish</>
                        }
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                        onClick={() => { setOpen(false); onDelete(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Course
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [cefrFilter, setCefrFilter] = useState("");

    const loadCourses = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi("/courses");
            setCourses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load courses:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadCourses(); }, []);

    const handleDelete = async (course: any) => {
        if (!confirm(`Delete "${course.title}"? This will remove all modules and lessons.`)) return;
        try {
            await fetchApi(`/courses/${course.id}`, { method: "DELETE" });
            loadCourses();
        } catch {
            alert("Failed to delete course.");
        }
    };

    const handleTogglePublish = async (course: any) => {
        try {
            await fetchApi(`/courses/${course.id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_published: !course.is_published }),
            });
            loadCourses();
        } catch {
            alert("Failed to update publish status.");
        }
    };

    // ── Filtering ───────────────────────────────────────────────────────────
    const filtered = courses.filter(c => {
        const matchesSearch =
            !searchQuery ||
            c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.cefr_level?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCefr = !cefrFilter || c.cefr_level === cefrFilter;
        return matchesSearch && matchesCefr;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Curriculum Builder</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage A1–C2 Goethe-Zertifikat courses, modules, and lessons.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm font-medium text-sm"
                >
                    <Plus className="w-4 h-4" /> Create New Course
                </button>
            </div>

            {/* Search + Filter bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search courses by title, level, or description..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <select
                    value={cefrFilter}
                    onChange={e => setCefrFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-gray-700 bg-white"
                >
                    <option value="">All CEFR Levels</option>
                    <option value="A1">A1 Beginner</option>
                    <option value="A2">A2 Elementary</option>
                    <option value="B1">B1 Intermediate</option>
                    <option value="B2">B2 Upper Intermediate</option>
                    <option value="C1">C1 Advanced</option>
                    <option value="C2">C2 Mastery</option>
                </select>
                {cefrFilter && (
                    <button
                        onClick={() => setCefrFilter("")}
                        className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> Clear
                    </button>
                )}
            </div>

            {/* Stats row */}
            {!isLoading && courses.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Showing <span className="font-semibold text-gray-800">{filtered.length}</span> of <span className="font-semibold text-gray-800">{courses.length}</span> courses</span>
                    {filtered.length !== courses.length && (
                        <button onClick={() => { setSearchQuery(""); setCefrFilter(""); }} className="text-brand-primary underline hover:no-underline">
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    {courses.length === 0 ? (
                        <>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses yet</h3>
                            <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
                                Start building the Goethe-Zertifikat curriculum by creating your first course.
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-brand-primary font-medium hover:underline flex items-center gap-1 mx-auto text-sm"
                            >
                                <Plus className="w-4 h-4" /> Create your first course
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No results</h3>
                            <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filter.</p>
                            <button onClick={() => { setSearchQuery(""); setCefrFilter(""); }} className="text-brand-primary text-sm font-medium hover:underline">
                                Clear all filters
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(course => (
                        <div
                            key={course.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-brand-primary/30 transition-all group flex flex-col"
                        >
                            {/* Colour header */}
                            <div
                                className={`w-full h-28 relative border-b border-gray-100 flex items-center justify-center cursor-pointer ${CEFR_BG[course.cefr_level] || "bg-gray-50"}`}
                                onClick={() => router.push(`/admin/courses/${course.id}`)}
                            >
                                <span className={`text-3xl font-extrabold px-4 py-2 rounded-lg border bg-white shadow-sm ${CEFR_COLORS[course.cefr_level] || "text-gray-600"}`}>
                                    {course.cefr_level}
                                </span>
                                {course.is_published && (
                                    <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        LIVE
                                    </span>
                                )}
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3
                                        className="font-bold text-gray-900 text-base line-clamp-1 group-hover:text-brand-primary transition-colors cursor-pointer flex-1 pr-2"
                                        onClick={() => router.push(`/admin/courses/${course.id}`)}
                                        title={course.title}
                                    >
                                        {course.title}
                                    </h3>
                                    <CourseDropdown
                                        course={course}
                                        onEdit={() => setEditTarget(course)}
                                        onDelete={() => handleDelete(course)}
                                        onTogglePublish={() => handleTogglePublish(course)}
                                    />
                                </div>

                                <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                                    {course.description || "No description provided."}
                                </p>

                                <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{course.modules?.length || 0} module{course.modules?.length !== 1 ? "s" : ""}</span>
                                    </div>
                                    {/* Price badge */}
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-primary/8 border border-brand-primary/20">
                                        <DollarSign className="w-3 h-3 text-brand-primary" />
                                        <span className="font-bold text-brand-primary">
                                            {course.price && Number(course.price) > 0
                                                ? `GH₵${Number(course.price).toFixed(2)}`
                                                : "Free"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/admin/courses/${course.id}`)}
                                        className="text-brand-primary font-semibold hover:underline"
                                    >
                                        Open →
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <CreateCourseModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={loadCourses}
            />
            {editTarget && (
                <EditCourseModal
                    course={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSuccess={loadCourses}
                />
            )}
        </div>
    );
}
