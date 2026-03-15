"use client";

import { Plus, Mail, Phone, Calendar, X, Loader2, Trash2, ShieldCheck, GraduationCap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

const ROLES = [
    { value: 'instructor', label: 'Instructor' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'admin', label: 'Admin' },
];

const BRANCHES = [
    'Accra (Primary)',
    'Kumasi',
    'Takoradi',
    'Remote / Online',
];

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    instructor: { label: 'Instructor', color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20', icon: <GraduationCap className="w-3 h-3" /> },
    teacher: { label: 'Teacher', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: <GraduationCap className="w-3 h-3" /> },
    admin: { label: 'Admin', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: <ShieldCheck className="w-3 h-3" /> },
};

const EMPTY_FORM = { firstName: '', lastName: '', email: '', role: 'instructor', branch: 'Accra (Primary)' };

export default function InstructorsPage() {
    const [instructors, setInstructors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingProfile, setViewingProfile] = useState<any | null>(null);
    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [formData, setFormData] = useState(EMPTY_FORM);

    const loadInstructors = async () => {
        try {
            setIsLoading(true);
            // Fetch both instructors and teachers (admin might manage both)
            const [teachers, instructorList] = await Promise.all([
                fetchApi('/users?role=teacher').catch(() => []),
                fetchApi('/users?role=instructor').catch(() => []),
            ]);
            const combined = [...((teachers as any[]) || []), ...((instructorList as any[]) || [])];
            setInstructors(combined);
        } catch {
            setInstructors([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadInstructors(); }, []);

    const handleAdd = async () => {
        setFormError('');
        setFormSuccess('');
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
            setFormError('Please fill in all required fields.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setFormError('Please enter a valid email address.');
            return;
        }
        try {
            setIsSaving(true);
            await fetchApi('/auth/invite-instructor', {
                method: 'POST',
                body: JSON.stringify({
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim(),
                    role: formData.role,
                    branch: formData.branch,
                }),
            });
            setFormSuccess(`Invitation sent to ${formData.email.trim()}. They will receive an email to set their password.`);
            setFormData(EMPTY_FORM);
            loadInstructors();
        } catch (err: any) {
            const msg = err?.message || 'Failed to invite instructor.';
            setFormError(msg.includes('duplicate') || msg.includes('unique') || msg.includes('already been registered')
                ? 'An account with this email already exists.'
                : msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setIsDeleting(true);
            await fetchApi(`/users/${deleteTarget.id}`, { method: 'DELETE' });
            setDeleteTarget(null);
            setInstructors(prev => prev.filter(i => i.id !== deleteTarget.id));
        } catch (err: any) {
            alert(err?.message || 'Failed to delete instructor.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRoleChange = async (instructor: any, newRole: string) => {
        try {
            const updated = await fetchApi(`/users/${instructor.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole }),
            });
            setInstructors(prev => prev.map(i => i.id === instructor.id ? { ...i, role: newRole } : i));
        } catch (err: any) {
            alert(err?.message || 'Failed to update role.');
        }
    };

    const handleEditSave = async () => {
        if (!editTarget) return;
        try {
            setIsSavingEdit(true);
            await fetchApi(`/users/${editTarget.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    firstName: editTarget.firstName,
                    lastName: editTarget.lastName,
                    email: editTarget.email,
                    role: editTarget.role,
                    visaStatus: editTarget.visaStatus,
                }),
            });
            setInstructors(prev => prev.map(i => i.id === editTarget.id ? editTarget : i));
            setViewingProfile(editTarget);
            setEditTarget(null);
        } catch (err: any) {
            alert(err?.message || 'Failed to save changes.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const roleCfg = (role: string) => ROLE_CONFIG[role] || ROLE_CONFIG['instructor'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Instructors</h1>
                    <p className="text-gray-500 mt-1">
                        {isLoading ? 'Loading…' : `${instructors.length} staff member${instructors.length !== 1 ? 's' : ''} · Add, edit roles, or remove instructors.`}
                    </p>
                </div>
                <button
                    onClick={() => { setFormError(''); setFormSuccess(''); setFormData(EMPTY_FORM); setIsAddModalOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Add Instructor
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-primary" />
                    <p>Loading instructors…</p>
                </div>
            ) : instructors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
                    No instructors found. Click "Add Instructor" to begin.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {instructors.map(inst => {
                        const cfg = roleCfg(inst.role);
                        return (
                            <div key={inst.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                <div className="p-6 border-b border-gray-50 flex items-start gap-4">
                                    <div className="h-14 w-14 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xl shrink-0">
                                        {inst.firstName?.[0]}{inst.lastName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <h3 className="text-base font-bold text-gray-900 truncate">{inst.firstName} {inst.lastName}</h3>
                                        {/* Inline role selector */}
                                        <select
                                            value={inst.role}
                                            onChange={e => handleRoleChange(inst, e.target.value)}
                                            className={`mt-1.5 text-xs font-semibold border rounded-full px-2.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 cursor-pointer ${cfg.color}`}
                                        >
                                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                        {inst.visaStatus && inst.visaStatus !== 'N/A' && (
                                            <span className="block mt-1.5 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full w-fit uppercase tracking-wide">
                                                {inst.visaStatus}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 bg-gray-50/30 flex flex-col gap-2.5 text-sm text-gray-600 flex-1">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                                        <span className="truncate">{inst.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                                        <span className="text-gray-500">
                                            Joined {inst.createdAt ? new Date(inst.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-gray-100 bg-white flex gap-2">
                                    <button
                                        onClick={() => setViewingProfile(inst)}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Profile
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(inst)}
                                        className="p-2 text-red-500 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Remove instructor"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Add Modal ────────────────────────────────────────────────── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Invite New Instructor</h2>
                                <p className="text-xs text-gray-400 mt-0.5">An email will be sent with a link to set their password.</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {formSuccess && (
                                <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                    {formSuccess}
                                </div>
                            )}
                            {formError && (
                                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    {formError}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                        placeholder="e.g. Akua"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                        placeholder="e.g. Boateng"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                        placeholder="name@school.edu.gh"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-white"
                                    >
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Branch</label>
                                <select
                                    value={formData.branch}
                                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-white"
                                >
                                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={handleAdd}
                                className="px-5 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 flex items-center gap-2 disabled:opacity-60 min-w-[140px] justify-center"
                            >
                                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Mail className="h-4 w-4" /> Send Invitation</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation ──────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 text-center">Remove Instructor</h3>
                            <p className="text-sm text-gray-500 text-center mt-2">
                                Are you sure you want to remove <span className="font-semibold text-gray-900">{deleteTarget.firstName} {deleteTarget.lastName}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4" /> Remove</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Profile Modal ────────────────────────────────────────────── */}
            {viewingProfile && !editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Instructor Profile</h2>
                            <button onClick={() => setViewingProfile(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="h-20 w-20 rounded-full mx-auto bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-2xl mb-3">
                                    {viewingProfile.firstName?.[0]}{viewingProfile.lastName?.[0]}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{viewingProfile.firstName} {viewingProfile.lastName}</h3>
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold border px-2.5 py-0.5 rounded-full mt-1.5 ${roleCfg(viewingProfile.role).color}`}>
                                    {roleCfg(viewingProfile.role).icon} {roleCfg(viewingProfile.role).label}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Contact</p>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <p className="text-sm text-gray-900">{viewingProfile.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Branch</p>
                                        <p className="text-sm text-gray-900">{viewingProfile.visaStatus || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Employee ID</p>
                                        <p className="text-sm text-gray-900 font-mono">{viewingProfile.id?.split('-')[0]?.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Date Added</p>
                                    <p className="text-sm text-gray-900">
                                        {viewingProfile.createdAt ? new Date(viewingProfile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setViewingProfile(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
                            <button
                                onClick={() => setEditTarget({ ...viewingProfile })}
                                className="px-4 py-2 text-sm font-medium text-brand-primary bg-brand-primary/10 rounded-lg hover:bg-brand-primary/20"
                            >
                                Edit Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ───────────────────────────────────────────────── */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Edit Instructor</h2>
                            <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={editTarget.firstName}
                                        onChange={e => setEditTarget({ ...editTarget, firstName: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={editTarget.lastName}
                                        onChange={e => setEditTarget({ ...editTarget, lastName: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={editTarget.email}
                                        onChange={e => setEditTarget({ ...editTarget, email: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={editTarget.role}
                                        onChange={e => setEditTarget({ ...editTarget, role: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-white"
                                    >
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Branch</label>
                                <select
                                    value={editTarget.visaStatus || 'Accra (Primary)'}
                                    onChange={e => setEditTarget({ ...editTarget, visaStatus: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-white"
                                >
                                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setEditTarget(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isSavingEdit}
                                onClick={handleEditSave}
                                className="px-5 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 flex items-center gap-2 disabled:opacity-60 min-w-[120px] justify-center"
                            >
                                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
