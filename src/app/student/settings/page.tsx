'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { fetchApi } from '@/lib/api';
import { Save, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2, User, Lock, Bell } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const supabase = createClient();

    const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '');
    const [lastName, setLastName] = useState(user?.user_metadata?.last_name || '');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPwd, setSavingPwd] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const initials = `${firstName[0] || 'S'}${lastName[0] || ''}`.toUpperCase();

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            // Update Supabase Auth metadata
            const { error } = await supabase.auth.updateUser({
                data: { first_name: firstName, last_name: lastName },
            });
            if (error) throw error;

            // Sync to backend profiles table
            if (user?.id) {
                await fetchApi(`/users/${user.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ firstName, lastName }),
                });
            }
            setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
        } catch (err: any) {
            setProfileMsg({ type: 'error', text: err?.message || 'Failed to save profile.' });
        } finally {
            setSavingProfile(false);
        }
    }

    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        setPwdMsg(null);
        if (newPassword !== confirmPassword) {
            setPwdMsg({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (newPassword.length < 8) {
            setPwdMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }
        setSavingPwd(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setNewPassword('');
            setConfirmPassword('');
            setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
        } catch (err: any) {
            setPwdMsg({ type: 'error', text: err?.message || 'Failed to change password.' });
        } finally {
            setSavingPwd(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your account preferences and security.</p>
            </div>

            {/* Avatar + identity summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
                    style={{ background: '#0F6B3E' }}
                >
                    {initials || 'S'}
                </div>
                <div>
                    <p className="font-semibold text-gray-900">{firstName} {lastName}</p>
                    <p className="text-sm text-gray-400">{user?.email}</p>
                    <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                        {user?.app_metadata?.role || 'student'}
                    </span>
                </div>
            </div>

            {/* Profile form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <User className="w-4 h-4 text-brand-primary" />
                    <h2 className="font-semibold text-gray-900">Profile Information</h2>
                </div>

                <form onSubmit={saveProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">First Name</label>
                            <input
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                required
                                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Last Name</label>
                            <input
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Email Address</label>
                        <input
                            value={user?.email || ''}
                            disabled
                            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed here. Contact admin if needed.</p>
                    </div>

                    {profileMsg && (
                        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {profileMsg.type === 'success'
                                ? <CheckCircle className="w-4 h-4 shrink-0" />
                                : <AlertTriangle className="w-4 h-4 shrink-0" />}
                            {profileMsg.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex items-center gap-2 bg-brand-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-primary/90 transition-colors disabled:opacity-60"
                    >
                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingProfile ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Password change */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <Lock className="w-4 h-4 text-brand-primary" />
                    <h2 className="font-semibold text-gray-900">Change Password</h2>
                </div>

                <form onSubmit={changePassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">New Password</label>
                        <div className="relative">
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                required
                                minLength={8}
                                className="w-full h-10 px-3 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Confirm New Password</label>
                        <input
                            type={showPwd ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            required
                            minLength={8}
                            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                        />
                    </div>

                    {pwdMsg && (
                        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {pwdMsg.type === 'success'
                                ? <CheckCircle className="w-4 h-4 shrink-0" />
                                : <AlertTriangle className="w-4 h-4 shrink-0" />}
                            {pwdMsg.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={savingPwd}
                        className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-60"
                    >
                        {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        {savingPwd ? 'Updating…' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <Bell className="w-4 h-4 text-brand-primary" />
                    <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
                </div>
                <div className="space-y-3">
                    {[
                        { label: 'Email reminders for upcoming classes', defaultOn: true },
                        { label: 'Assignment due-date alerts', defaultOn: true },
                        { label: 'Grade published notifications', defaultOn: true },
                        { label: 'New resource / library updates', defaultOn: false },
                        { label: 'Billing & payment reminders', defaultOn: true },
                    ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-1">
                            <span className="text-sm text-gray-700">{item.label}</span>
                            <input type="checkbox" defaultChecked={item.defaultOn} className="accent-brand-primary w-4 h-4 cursor-pointer" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
