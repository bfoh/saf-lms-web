'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        // Hard redirect forces middleware to re-evaluate the cleared cookies
        window.location.href = '/admin/login';
    };

    return (
        <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
            <LogOut className="w-5 h-5" />
            Sign Out
        </button>
    );
}
