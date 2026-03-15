"use client";

import { useEffect, useState } from "react";
import { Plus, Search, FileText, Clock, CheckCircle, BookOpen, Calendar, X, Loader2, Trash2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

const EMPTY_FORM = { title: "", description: "", courseId: "", due_date: "" };

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [asgData, courseData] = await Promise.all([
                fetchApi('/assignments'),
                fetchApi('/courses'),
            ]);
            setAssignments(Array.isArray(asgData) ? asgData : []);
            setCourses(Array.isArray(courseData) ? courseData : []);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.courseId) { setFormError("Please select a course."); return; }
        setFormError("");
        setIsSaving(true);
        try {
            await fetchApi('/assignments', {
                method: 'POST',
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    course_id: formData.courseId,
                    due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
                }),
            });
            setIsModalOpen(false);
            setFormData(EMPTY_FORM);
            loadData();
        } catch (err: any) {
            setFormError(err?.message || "Failed to create assignment.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"?`)) return;
        try {
            await fetchApi(`/assignments/${id}`, { method: 'DELETE' });
            loadData();
        } catch {
            alert("Failed to delete assignment.");
        }
    };

    const filtered = assignments.filter(a =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.course?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pending = assignments.filter(a => a.due_date && new Date(a.due_date) > new Date());

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Homework & Assignments</h1>
                    <p className="text-gray-500 text-sm mt-1">Dispatch coursework and monitor student submissions.</p>
                </div>
                <button
                    onClick={() => { setIsModalOpen(true); setFormError(""); setFormData(EMPTY_FORM); }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Dispatch Assignment
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                        <h3 className="text-2xl font-bold text-gray-900">{assignments.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Upcoming Due</p>
                        <h3 className="text-2xl font-bold text-gray-900">{pending.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Courses with Tasks</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {new Set(assignments.map(a => a.course_id)).size}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or course..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-7 h-7 animate-spin mb-3 text-brand-primary" />
                        <p className="text-sm">Loading assignments...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-7 h-7 text-gray-300" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 mb-1">
                            {assignments.length === 0 ? "No Assignments Yet" : "No results found"}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4 max-w-xs mx-auto">
                            {assignments.length === 0
                                ? "Dispatch your first assignment to a course to get started."
                                : "Try a different search term."}
                        </p>
                        {assignments.length === 0 && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-brand-primary text-sm font-medium hover:underline flex items-center gap-1 mx-auto"
                            >
                                <Plus className="w-4 h-4" /> Dispatch Assignment
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Assignment Title</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Linked Course</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100">Due Date</th>
                                    <th className="px-6 py-3 font-medium border-b border-gray-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((a) => {
                                    const isOverdue = a.due_date && new Date(a.due_date) < new Date();
                                    return (
                                        <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900">{a.title}</p>
                                                {a.description && (
                                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-primary/10 text-brand-primary text-xs font-medium">
                                                    <BookOpen className="w-3 h-3" />
                                                    {a.course?.title || 'Unknown Course'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {a.due_date ? (
                                                    <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {isOverdue && <span className="text-red-500">(Overdue)</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">No due date</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(a.id, a.title)}
                                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Assignment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Dispatch Assignment</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            {formError && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Chapter 3 – Reflexive Verbs Practice"
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Instructions for students..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Course <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.courseId}
                                    onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary bg-white"
                                >
                                    <option value="">— Select a course —</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>
                                            [{c.cefr_level}] {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.due_date}
                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !formData.title || !formData.courseId}
                                    className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2 min-w-[120px] justify-center"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
