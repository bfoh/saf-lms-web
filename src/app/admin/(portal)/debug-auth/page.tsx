'use client';

import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

export default function DebugAuthPage() {
    const { user, loading, role } = useAuth();
    const { unreadCount } = useNotifications();

    if (loading) return <div className="p-8">Loading auth state...</div>;

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold">Debug Auth State</h1>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">User ID</h2>
                    <p className="font-mono text-lg">{user?.id || 'Not logged in'}</p>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Email</h2>
                    <p className="text-lg">{user?.email || 'N/A'}</p>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Role (Client-side Context)</h2>
                    <p className="font-bold text-xl text-brand-primary">{role || 'null/undefined'}</p>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">App Metadata</h2>
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto">
                        {JSON.stringify(user?.app_metadata, null, 2)}
                    </pre>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">User Metadata</h2>
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto">
                        {JSON.stringify(user?.user_metadata, null, 2)}
                    </pre>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Unread Messages</h2>
                    <p className="text-lg">{unreadCount}</p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-sm text-amber-800">
                    <strong>Note:</strong> If the role above says "student" but you are an admin, then the server-side role 
                    assignment in Supabase `app_metadata` is missing or incorrect.
                </p>
            </div>
        </div>
    );
}
