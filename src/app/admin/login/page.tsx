'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /admin/login is no longer a separate form — all roles use /login.
// This redirect preserves bookmarks without breaking anything.
export default function AdminLoginRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/login');
    }, [router]);
    return null;
}
