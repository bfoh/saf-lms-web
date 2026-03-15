'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextValue {
    user: User | null;
    session: Session | null;
    role: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    session: null,
    role: null,
    loading: true,
    signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        let settled = false;
        let mounted = true;

        // onAuthStateChange fires with INITIAL_SESSION on first subscribe —
        // this is the single source of truth for initial state.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            settled = true;
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Guard: if a different user's session arrives (e.g. another browser
            // tab logged in as a different role), and that role doesn't match the
            // current portal, force a hard redirect to /login so the middleware
            // can re-validate and route the user to the correct portal.
            if (session?.user && typeof window !== 'undefined') {
                const role = session.user.app_metadata?.role || 'student';
                const path = window.location.pathname;
                if (path.startsWith('/admin') && role !== 'admin' && role !== 'superadmin') {
                    window.location.href = '/login';
                } else if (path.startsWith('/instructor') && role !== 'instructor' && role !== 'teacher') {
                    window.location.href = '/login';
                } else if (path.startsWith('/student') && role !== 'student' && role !== 'instructor' && role !== 'teacher') {
                    window.location.href = '/login';
                }
            }
        });

        // Fallback: if onAuthStateChange hasn't settled within 1.5 s, call
        // getSession() directly (covers edge cases where the event never fires).
        const fallbackTimer = setTimeout(async () => {
            if (!settled && mounted) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    setSession(session);
                    setUser(session?.user ?? null);
                } finally {
                    if (mounted) setLoading(false);
                }
            }
        }, 1500);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(fallbackTimer);
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const role = user?.app_metadata?.role || null;

    return (
        <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
