"use client";

import { Building2, Plus, MapPin, Users, BookOpen, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

interface Branch {
    id: string;
    name: string;
    address?: string;
    status?: string;
    students?: number;
    classes?: number;
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<null | Branch>(null);

    // Forms
    const [newName, setNewName] = useState("");
    const [newAddress, setNewAddress] = useState("");

    const loadBranches = async () => {
        try {
            setIsLoading(true);
            const data = await fetchApi<Branch[]>('/branches');
            // Mocking the extra analytics fields for now since they aren't in the base Schema
            const enrichedData = data.map(b => ({
                ...b,
                status: "Active",
                students: Math.floor(Math.random() * 50) + 10,
                classes: Math.floor(Math.random() * 5) + 1,
            }));
            setBranches(enrichedData);
        } catch (error) {
            console.error("Failed to load branches", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBranches();
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            setIsSaving(true);
            await fetchApi('/branches', {
                method: 'POST',
                body: JSON.stringify({ name: newName, address: newAddress }),
            });
            setIsCreateModalOpen(false);
            setNewName("");
            setNewAddress("");
            await loadBranches();
        } catch (error) {
            console.error("Failed to create branch", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingBranch) return;
        try {
            setIsSaving(true);
            await fetchApi(`/branches/${editingBranch.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: editingBranch.name, address: editingBranch.address }),
            });
            setEditingBranch(null);
            await loadBranches();
        } catch (error) {
            console.error("Failed to update branch", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this campus? This may affect assigned classes.")) return;
        try {
            setIsSaving(true);
            await fetchApi(`/branches/${id}`, { method: 'DELETE' });
            setEditingBranch(null);
            await loadBranches();
        } catch (error) {
            console.error("Failed to delete branch", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Branch Management</h1>
                    <p className="text-gray-500 mt-1">Manage SAF Institute campuses and locations.</p>
                </div>
                <button
                    onClick={() => {
                        setNewName("");
                        setNewAddress("");
                        setIsCreateModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add New Branch
                </button>
            </div>

            {/* Grid of Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {branches.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No Branches Configured</h3>
                        <p className="text-gray-500 mt-1">Add your first campus location to get started.</p>
                    </div>
                )}
                {branches.map((branch) => (
                    <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{branch.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1 gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{branch.address || 'No address provided'}</span>
                                    </div>
                                </div>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                {branch.status}
                            </span>
                        </div>

                        <div className="p-6 bg-gray-50/50 grid grid-cols-2 gap-4 flex-1">
                            <div className="bg-white p-4 rounded-xl border border-gray-100/50 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-500 mb-2">
                                    <Users className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase tracking-wider">Students</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{branch.students}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100/50 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-500 mb-2">
                                    <BookOpen className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase tracking-wider">Active Classes</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{branch.classes}</p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2">
                            <button
                                onClick={() => setEditingBranch(branch)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Edit Details
                            </button>
                            <Link href={`/admin/classes?branch=${branch.id}`} className="px-4 py-2 text-sm font-medium text-brand-primary bg-brand-primary/10 rounded-lg hover:bg-brand-primary/20 transition-colors">
                                View Classes
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Branch Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Add New Branch</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    placeholder="e.g. Takoradi Campus"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                                <input
                                    type="text"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    placeholder="e.g. 15 Liberation Road"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button disabled={isSaving} onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                            <button disabled={isSaving || !newName.trim()} onClick={handleCreate} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save Branch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Branch Modal */}
            {editingBranch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Edit Branch Details</h2>
                            <button onClick={() => setEditingBranch(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                <input
                                    type="text"
                                    value={editingBranch.name}
                                    onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                                <input
                                    type="text"
                                    value={editingBranch.address || ''}
                                    onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
                            <button disabled={isSaving} onClick={() => handleDelete(editingBranch.id)} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">Delete Branch</button>
                            <div className="flex gap-3">
                                <button disabled={isSaving} onClick={() => setEditingBranch(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                                <button disabled={isSaving || !editingBranch.name.trim()} onClick={handleUpdate} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 disabled:opacity-50">
                                    {isSaving ? 'Updating...' : 'Update Detail'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
