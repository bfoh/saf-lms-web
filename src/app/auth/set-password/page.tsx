'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

function SetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Exchange the PKCE code from the invite email for a real session
    useEffect(() => {
        const code = searchParams.get('code');
        if (!code) {
            // No code — check if session already exists (e.g. re-visit)
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    setSessionReady(true);
                } else {
                    setSessionError('Invalid or expired invite link. Please ask the admin to resend your invitation.');
                }
            });
            return;
        }

        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) {
                setSessionError('Invalid or expired invite link. Please ask the admin to resend your invitation.');
            } else {
                setSessionReady(true);
                // Remove code from URL without triggering a reload
                window.history.replaceState({}, '', '/auth/set-password');
            }
        });
    }, []);

    async function handleSetPassword(e: React.SyntheticEvent) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        // Get updated session to determine role
        const { data: { user } } = await supabase.auth.getUser();
        const role = user?.app_metadata?.role;

        // Sync profile to ensure local DB row exists
        if (user) {
            try {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/sync-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        email: user.email,
                        firstName: user.user_metadata?.first_name || '',
                        lastName: user.user_metadata?.last_name || '',
                        role,
                    }),
                });
            } catch {
                // Non-fatal — profile may already exist from invite
            }
        }

        if (role === 'admin') {
            router.replace('/admin');
        } else if (role === 'instructor') {
            router.replace('/instructor/dashboard');
        } else {
            // student (default)
            router.replace('/student/dashboard');
        }

        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden px-4">
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
                style={{ background: '#0F6B3E', filter: 'blur(80px)' }} />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
                style={{ background: '#C7F000', filter: 'blur(80px)' }} />

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-10 pb-6 text-center"
                        style={{ background: 'linear-gradient(135deg, #0F6B3E 0%, #1a8a50 100%)' }}>
                        <div className="h-14 w-36 relative mx-auto mb-4">
                            <Image
                                src="/saflogo.png"
                                alt="SAF Institute"
                                fill
                                className="object-contain brightness-0 invert"
                                priority
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white font-poppins">
                            Welcome to LinguaMeister
                        </h1>
                        <p className="text-green-100 text-sm mt-1">
                            Set your password to activate your account
                        </p>
                    </div>

                    <div className="px-8 py-8">
                        {/* Session error — bad/expired invite link */}
                        {sessionError ? (
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-red-100">
                                    <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 font-poppins mb-2">Link Expired</h2>
                                <p className="text-sm text-gray-500 mb-5">{sessionError}</p>
                                <a
                                    href="/login"
                                    className="inline-block w-full h-11 font-semibold rounded-xl text-sm text-white flex items-center justify-center transition-all active:scale-[0.98]"
                                    style={{ background: '#0F6B3E' }}
                                >
                                    Back to Login
                                </a>
                                <p className="mt-3 text-xs text-gray-400">
                                    Use <span className="font-medium">Forgot password?</span> on the login page to request a new link.
                                </p>
                            </div>
                        ) : !sessionReady ? (
                            /* Loading while exchanging code */
                            <div className="text-center py-6">
                                <span className="inline-block w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-3" />
                                <p className="text-sm text-gray-500">Verifying your invite link…</p>
                            </div>
                        ) : (
                            /* Password form — session is ready */
                            <>
                                <div className="mb-6 text-center">
                                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                                        style={{ background: '#C7F000' }}>
                                        <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900 font-poppins">
                                        Create Your Password
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Choose a strong password to activate your account.
                                    </p>
                                </div>

                                {error && (
                                    <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSetPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            required
                                            minLength={8}
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your password"
                                            required
                                            minLength={8}
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 mt-2 font-semibold rounded-xl text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                                        style={{ background: loading ? '#6b9e82' : '#0F6B3E' }}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Setting password...
                                            </>
                                        ) : 'Set Password & Continue'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    <div className="px-8 pb-6 text-center">
                        <p className="text-xs text-gray-400">
                            © {new Date().getFullYear()} SAF Institute. All rights reserved.
                        </p>
                    </div>
                </div>
                <div className="h-1 rounded-b-full mx-8" style={{ background: '#C7F000' }} />
            </div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense>
            <SetPasswordForm />
        </Suspense>
    );
}
