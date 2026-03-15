"use client";

import { Plus, Search, Filter, Calendar, Users, Clock, Video, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { fetchApi } from "@/lib/api";

export default function ClassesPage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("All");
    const [selectedType, setSelectedType] = useState("All");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [managingClass, setManagingClass] = useState<any | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        cefrLevel: 'A1',
        type: 'In-Person' // Mock
    });

    const loadClasses = async () => {
        try {
            setIsLoading(true);
            const data = await fetchApi('/classes');
            setClasses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load classes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadClasses();
    }, []);

    const handleCreateClass = async () => {
        if (!formData.name) {
            alert("Please provide a class name.");
            return;
        }
        try {
            setIsSaving(true);
            await fetchApi('/classes', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.name,
                    cefrLevel: formData.cefrLevel,
                    status: 'enrolling' // Default
                }),
            });
            setIsCreateModalOpen(false);
            setFormData({ name: '', cefrLevel: 'A1', type: 'In-Person' });
            loadClasses();
        } catch (error) {
            console.error("Failed to create class:", error);
            alert("Failed to create class.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            setIsSaving(true);
            await fetchApi(`/classes/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            loadClasses();
            setManagingClass(null);
        } catch (error) {
            console.error("Failed to update class status:", error);
            alert("Failed to update class status.");
        } finally {
            setIsSaving(false);
        }
    };

    // Derived state for filtering
    const filteredClasses = useMemo(() => {
        return classes.filter((cls) => {
            const matchesSearch = cls.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cls.cefrLevel?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLevel = selectedLevel === "All" || cls.cefrLevel === selectedLevel;

            // Mock Type filtering since it's not stored in DB
            const mockType = cls.id?.charCodeAt(0) % 2 === 0 ? "In-Person" : "Online";
            const matchesType = selectedType === "All" || mockType === selectedType;

            return matchesSearch && matchesLevel && matchesType;
        });
    }, [classes, searchQuery, selectedLevel, selectedType]);

    const levels = ["All", "A1", "A2", "B1", "B2", "C1", "C2"];
    const types = ["All", "In-Person", "Online", "Hybrid"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Classes & Cohorts</h1>
                    <p className="text-gray-500 mt-1">Manage active courses, schedules, and capacity.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-[rgb(12,85,49)] focus-visible:outline-none transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Create Class
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search classes by name or level..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors"
                    />
                </div>
                <div className="flex gap-2 relative">
                    <div className="relative inline-block">
                        <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="appearance-none inline-flex items-center gap-2 pl-9 pr-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                        >
                            {levels.map(level => (
                                <option key={level} value={level}>Level: {level}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    </div>
                    <div className="relative inline-block">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="appearance-none inline-flex items-center gap-2 pl-9 pr-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                        >
                            {types.map(type => (
                                <option key={type} value={type}>Type: {type}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Grid of Classes */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-primary" />
                    <p>Loading classes...</p>
                </div>
            ) : filteredClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClasses.map((cls) => {
                        const mockType = cls.id?.charCodeAt(0) % 2 === 0 ? "In-Person" : "Online";
                        return (
                            <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                                <div className="p-5 border-b border-gray-50">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cls.cefrLevel?.startsWith('A') ? 'bg-green-100 text-green-800' :
                                            cls.cefrLevel?.startsWith('B') ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {cls.cefrLevel || 'A1'}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${cls.status === 'enrolling' ? 'bg-orange-100 text-orange-700' :
                                            cls.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {cls.status || 'Enrolling'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{cls.name}</h3>
                                    <p className="text-sm font-medium text-gray-500 font-mono">{cls.id?.split('-')[0]} • Accra</p>
                                </div>

                                <div className="p-5 bg-gray-50/50 flex-1 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Users className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{cls.teacher?.firstName ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : 'Unassigned'}</p>
                                            <p className="text-xs text-gray-500">Primary Instructor</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-gray-600">Pending Schedule</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        {mockType === 'In-Person' ? <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" /> : <Video className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />}
                                        <p className="text-sm text-gray-600">{mockType} Instruction</p>
                                    </div>

                                    {/* Progress Bar for Capacity */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="font-medium text-gray-700">Enrollment</span>
                                            <span className="font-medium text-gray-900">0 / 25</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-2 rounded-full transition-all bg-brand-primary"
                                                style={{ width: '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setManagingClass(cls)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Manage
                                    </button>
                                    <Link href={`/admin/classes/${cls.id}`} className="px-4 py-2 text-sm font-medium text-center text-brand-primary bg-brand-primary/10 rounded-lg hover:bg-brand-primary/20 transition-colors">
                                        View Roster
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 border-dashed">
                    No classes match your current filters.
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    placeholder="e.g. A1 Intensive Beginner"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                                    <select
                                        value={formData.cefrLevel}
                                        onChange={e => setFormData({ ...formData, cefrLevel: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    >
                                        {levels.filter(l => l !== "All").map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type (Mock)</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-gray-50" disabled>
                                        {types.filter(t => t !== "All").map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button
                                disabled={isSaving}
                                onClick={handleCreateClass}
                                className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 flex items-center justify-center min-w-[124px]"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Class"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Class Action Menu */}
            {managingClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Manage Class</h2>
                            <button onClick={() => setManagingClass(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-sm font-medium text-gray-900 mb-1">{managingClass.name}</p>
                            <p className="text-xs text-gray-500 mb-4 font-mono">{managingClass.id}</p>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button disabled={isSaving} onClick={() => handleUpdateStatus(managingClass.id, 'enrolling')} className="py-2 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg border border-orange-200 hover:bg-orange-100">Set Enrolling</button>
                                <button disabled={isSaving} onClick={() => handleUpdateStatus(managingClass.id, 'active')} className="py-2 text-xs font-medium bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100">Set Active</button>
                            </div>

                            <button onClick={() => setManagingClass(null)} className="w-full px-4 py-2 text-sm font-medium text-left text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Assign Instructor</button>
                            <button onClick={() => setManagingClass(null)} className="w-full px-4 py-2 text-sm font-medium text-left text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Update Schedule</button>
                            <button disabled={isSaving} onClick={() => handleUpdateStatus(managingClass.id, 'completed')} className="w-full px-4 py-2 text-sm font-medium text-left text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 flex justify-between items-center">
                                Archive Class
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-red-600" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
