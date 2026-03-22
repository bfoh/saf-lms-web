"use client";

import { Plus, Search, Filter, MoreVertical, FileText, X, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { fetchApi } from "@/lib/api";

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [managingStudent, setManagingStudent] = useState<any | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        cefrLevel: 'A1',
        visaStatus: 'N/A'
    });

    const loadStudents = async () => {
        try {
            setIsLoading(true);
            const data = await fetchApi('/users?role=student');
            setStudents((data as any[]) || []);
        } catch (error) {
            console.error("Failed to load students:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, []);

    const handleEnroll = async () => {
        if (!formData.firstName || !formData.lastName || !formData.email) {
            alert("Please fill in all required fields.");
            return;
        }
        try {
            setIsSaving(true);
            await fetchApi('/auth/enroll-student', {
                method: 'POST',
                body: JSON.stringify(formData),
            });
            setIsEnrollModalOpen(false);
            setFormData({ firstName: '', lastName: '', email: '', cefrLevel: 'A1', visaStatus: 'N/A' });
            loadStudents();
        } catch (error: any) {
            console.error("Failed to enroll student:", error);
            alert(error?.message || "Failed to enroll student. The email may already be registered.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateVisa = async (id: string, newVisaStatus: string) => {
        try {
            setIsSaving(true);
            await fetchApi(`/users/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ visaStatus: newVisaStatus }),
            });
            loadStudents();
            setManagingStudent(null);
        } catch (error) {
            console.error("Failed to update visa:", error);
            alert("Failed to update student visa status.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeactivate = async (id: string, currentStatus: boolean) => {
        const action = currentStatus ? "deactivate" : "activate";
        if (!confirm(`Are you sure you want to ${action} this student?`)) return;
        try {
            setIsSaving(true);
            await fetchApi(`/users/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            loadStudents();
            setManagingStudent(null);
        } catch (error) {
            console.error(`Failed to ${action} student:`, error);
            alert(`Failed to ${action} student.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to completely delete ${name}? This action cannot be undone.`)) return;
        try {
            setIsSaving(true);
            await fetchApi(`/users/${id}`, {
                method: 'DELETE',
            });
            loadStudents();
            setManagingStudent(null);
        } catch (error: any) {
            console.error(`Failed to delete student:`, error);
            alert(error.message || `Failed to delete student.`);
        } finally {
            setIsSaving(false);
        }
    };

    // Derived state for filtering
    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const matchesSearch = student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.email?.toLowerCase().includes(searchQuery.toLowerCase());

            // Mocking branch for now since it's not on UserEntity natively
            const matchesBranch = selectedBranch === "All";

            const statusLabel = student.isActive ? 'Active' : 'Inactive';
            const matchesStatus = selectedStatus === "All" || statusLabel === selectedStatus;

            return matchesSearch && matchesBranch && matchesStatus;
        });
    }, [students, searchQuery, selectedBranch, selectedStatus]);

    const branches = ["All", "Accra", "Kumasi", "All Campuses"];
    const statuses = ["All", "Active", "Inactive"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Students</h1>
                    <p className="text-gray-500 mt-1">Manage enrollments, profiles, and visa tracking.</p>
                </div>
                <button
                    onClick={() => setIsEnrollModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-primary/90 focus-visible:outline-none transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Enroll Student
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search students by name, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors"
                    />
                </div>
                <div className="flex gap-2 relative">
                    <div className="relative inline-block">
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="appearance-none inline-flex items-center gap-2 pl-9 pr-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                        >
                            {branches.map(branch => (
                                <option key={branch} value={branch}>Branch: {branch}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    </div>
                    <div className="relative inline-block">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="appearance-none inline-flex items-center gap-2 pl-9 pr-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                        >
                            {statuses.map(status => (
                                <option key={status} value={status}>Status: {status}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-primary" />
                        <p>Loading students...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left relative">
                                <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Cohort / Class</th>
                                        <th className="px-6 py-4">Branch</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Visa Tracking</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-semibold">
                                                        {student.firstName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                                                        <p className="text-xs text-gray-500">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">{student.id.split('-')[0]}</td>
                                            <td className="px-6 py-4 font-medium text-gray-700">{student.cefrLevel || 'Unassigned'}</td>
                                            <td className="px-6 py-4 text-gray-600">Accra</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${student.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {student.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-gray-400" />
                                                    <span className={`text-xs font-medium ${student.visaStatus === 'Approved' ? 'text-green-600' :
                                                        student.visaStatus === 'Pending' ? 'text-orange-600' :
                                                            student.visaStatus === 'In Progress' ? 'text-blue-600' : 'text-gray-500'
                                                        }`}>
                                                        {student.visaStatus || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setManagingStudent(student)}
                                                    className="text-gray-400 hover:text-brand-primary p-1 rounded-md hover:bg-brand-primary/10 transition-colors"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                No students match your search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-auto px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm text-gray-500">
                            <p>Showing {filteredStudents.length > 0 ? 1 : 0} to {filteredStudents.length} of {students.length} entries</p>
                            <div className="flex gap-2">
                                <button disabled className="px-3 py-1 border border-gray-200 bg-white rounded-md disabled:opacity-50 transition-colors">Previous</button>
                                <button disabled className="px-3 py-1 border border-gray-200 bg-white rounded-md disabled:opacity-50 transition-colors">Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Enroll Student Modal */}
            {isEnrollModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Enroll New Student</h2>
                            <button onClick={() => setIsEnrollModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Level</label>
                                    <select
                                        value={formData.cefrLevel}
                                        onChange={e => setFormData({ ...formData, cefrLevel: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    >
                                        <option value="A1">A1 Intensive Beginner</option>
                                        <option value="A2">A2 Standard Weekend</option>
                                        <option value="B1">B1 Exam Prep (Virtual)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Visa Requirement</label>
                                    <select
                                        value={formData.visaStatus}
                                        onChange={e => setFormData({ ...formData, visaStatus: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    >
                                        <option value="N/A">N/A (Local Student)</option>
                                        <option value="Pending">Pending Start</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Approved">Approved</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsEnrollModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button
                                disabled={isSaving}
                                onClick={handleEnroll}
                                className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 flex items-center justify-center min-w-[120px]"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enroll Student"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Student Action Menu */}
            {managingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Manage Student</h2>
                            <button onClick={() => setManagingStudent(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="mb-4">
                                <p className="font-medium text-gray-900">{managingStudent.firstName} {managingStudent.lastName}</p>
                                <p className="text-sm text-gray-500 font-mono">{managingStudent.id.split('-')[0]} • {managingStudent.cefrLevel}</p>
                            </div>
                            <button onClick={() => setManagingStudent(null)} className="w-full px-4 py-2 text-sm font-medium text-left text-brand-primary bg-brand-primary/10 border border-transparent rounded-lg hover:bg-brand-primary/20">View Full Profile (Placeholder)</button>

                            <div className="pt-2">
                                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Change Visa Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button disabled={isSaving} onClick={() => handleUpdateVisa(managingStudent.id, 'Approved')} className="px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded border border-green-200 hover:bg-green-100">Approved</button>
                                    <button disabled={isSaving} onClick={() => handleUpdateVisa(managingStudent.id, 'In Progress')} className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100">In Progress</button>
                                    <button disabled={isSaving} onClick={() => handleUpdateVisa(managingStudent.id, 'Pending')} className="px-2 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 rounded border border-orange-200 hover:bg-orange-100">Pending</button>
                                    <button disabled={isSaving} onClick={() => handleUpdateVisa(managingStudent.id, 'N/A')} className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100">N/A</button>
                                </div>
                            </div>

                            <button
                                disabled={isSaving}
                                onClick={() => handleDeactivate(managingStudent.id, managingStudent.isActive)}
                                className={`w-full px-4 py-2 mt-2 text-sm font-medium text-left rounded-lg transition-colors flex items-center justify-between ${managingStudent.isActive ? 'text-red-600 bg-white border border-red-200 hover:bg-red-50' : 'text-green-600 bg-white border border-green-200 hover:bg-green-50'}`}
                            >
                                {managingStudent.isActive ? 'Deactivate Account' : 'Activate Account'}
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            </button>

                            <button
                                disabled={isSaving}
                                onClick={() => handleDelete(managingStudent.id, `${managingStudent.firstName} ${managingStudent.lastName}`)}
                                className="w-full px-4 py-2 mt-2 text-sm font-medium text-left rounded-lg transition-colors flex items-center justify-between text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                            >
                                Delete Account Permanently
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
