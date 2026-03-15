"use client";

import { Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        schoolName: '',
        supportEmail: '',
        currency: 'GHS',
        timezone: 'Africa/Accra',
        aiAgentEnabled: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchApi('/settings');
                if (data && typeof data === 'object') setSettings(data as typeof settings);
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const updated = await fetchApi('/settings', {
                method: 'PATCH',
                body: JSON.stringify(settings),
            });
            if (updated && typeof updated === 'object') setSettings(updated as typeof settings);
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-primary" />
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Platform Settings</h1>
                    <p className="text-gray-500 mt-1">Configure global preferences for the SAF Institute LMS.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-[rgb(12,85,49)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </button>
            </div>

            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
                {/* Settings Sections */}
                <div className="divide-y divide-gray-100">

                    {/* General Profile Info */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-semibold text-gray-900">Institution Profile</h3>
                            <p className="text-sm text-gray-500 mt-1">Update the school's public contact information and branding shown to students.</p>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                                <input
                                    type="text"
                                    value={settings.schoolName}
                                    onChange={e => setSettings({ ...settings, schoolName: e.target.value })}
                                    className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                                <input
                                    type="email"
                                    value={settings.supportEmail}
                                    onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                                    className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Localization & Region */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/30">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-semibold text-gray-900">Localization</h3>
                            <p className="text-sm text-gray-500 mt-1">Set the default currency and timezone for class schedules and billing.</p>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select
                                    value={settings.currency}
                                    onChange={e => setSettings({ ...settings, currency: e.target.value })}
                                    className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none bg-white"
                                >
                                    <option value="GHS">Ghanaian Cedi (GHS)</option>
                                    <option value="USD">US Dollar (USD)</option>
                                    <option value="EUR">Euro (EUR)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                <select
                                    value={settings.timezone}
                                    onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                                    className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none bg-white"
                                >
                                    <option value="Africa/Accra">Africa/Accra (GMT)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* AI Settings */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-semibold text-gray-900">AI Agents Configuration</h3>
                            <p className="text-sm text-gray-500 mt-1">Configure parameters for the AI Voice Receptionist and interactive LMS tutors.</p>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">Website Voice Agent</p>
                                    <p className="text-sm text-gray-500">Enable AI receptionist on landing page.</p>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        id="toggle1"
                                        checked={settings.aiAgentEnabled}
                                        onChange={e => setSettings({ ...settings, aiAgentEnabled: e.target.checked })}
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                    />
                                    <label htmlFor="toggle1" className="toggle-label block overflow-hidden h-6 rounded-full bg-brand-primary cursor-pointer"></label>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

