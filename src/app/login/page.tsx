'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'register';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [mode, setMode] = useState<Mode>('login');

    // Login fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Register fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [cefrLevel, setCefrLevel] = useState('A1');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const clearError = () => setError('');

    async function handleLogin(e: React.SyntheticEvent) {
        e.preventDefault();
        setLoading(true);
        clearError();

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (!data.session) {
                setError('Sign-in failed — no session returned. Please try again.');
                return;
            }

            // Sync profile with NestJS backend (non-fatal, with timeout)
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 4000);
                await fetch(`${API_URL}/auth/sync-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        userId: data.user.id,
                        email: data.user.email,
                        firstName: data.user.user_metadata?.first_name || '',
                        lastName: data.user.user_metadata?.last_name || '',
                        role: data.user.app_metadata?.role,
                    }),
                });
                clearTimeout(timeout);
            } catch {
                // Non-fatal — profile sync failure shouldn't block login
            }

            // Refresh the session so the latest app_metadata (role) is in the cookie.
            // This ensures the middleware and client both see the correct role.
            let role = data.user.app_metadata?.role || 'student';
            try {
                const { data: refreshed } = await supabase.auth.refreshSession();
                if (refreshed?.user) {
                    role = refreshed.user.app_metadata?.role || role;
                }
            } catch {
                // Non-fatal — use the role we already have
            }

            if (role === 'admin') router.push('/admin');
            else if (role === 'instructor') router.push('/instructor/dashboard');
            else router.push('/student/dashboard');
        } catch (err: any) {
            setError(err?.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleRegister(e: React.SyntheticEvent) {
        e.preventDefault();
        setLoading(true);
        clearError();

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email: regEmail,
                password: regPassword,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    },
                },
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (data.user) {
                // Sync profile with NestJS backend (non-fatal, with timeout)
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 4000);
                    await fetch(`${API_URL}/auth/sync-profile`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: controller.signal,
                        body: JSON.stringify({
                            userId: data.user.id,
                            email: regEmail,
                            firstName,
                            lastName,
                            role: 'student',
                            cefrLevel,
                        }),
                    });
                    clearTimeout(timeout);
                } catch {
                    // Non-fatal
                }

                if (data.session) {
                    router.push('/student/dashboard');
                } else {
                    // Email confirmation required
                    setSuccessMessage(
                        'Registration successful! Please check your email to confirm your account before signing in.'
                    );
                    setMode('login');
                }
            }
        } catch (err: any) {
            setError(err?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotPassword() {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        setLoading(true);
        clearError();
        // Route through /auth/callback so the code is exchanged server-side.
        // Direct-to-set-password fails because the middleware's getUser() call
        // clobbers the PKCE verifier cookie before the page can use it.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (resetError) {
            const msg = resetError.message.toLowerCase();
            if (msg.includes('rate limit') || msg.includes('too many')) {
                setError('Too many emails sent recently. Please wait at least 1 hour before requesting another reset email, or contact your admin.');
            } else {
                setError(resetError.message);
            }
        } else {
            setSuccessMessage('Password reset email sent. Check your inbox.');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden px-4">
            {/* Background decorative blobs */}
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
                        <h1 className="text-2xl font-bold text-white font-poppins">LinguaMeister</h1>
                        <p className="text-green-100 text-sm mt-1">German Language Learning Platform</p>
                    </div>

                    {/* Mode switcher — login vs register (student-only) */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => { setMode('login'); clearError(); }}
                            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${mode === 'login'
                                ? 'text-[#0F6B3E] border-b-2 border-[#0F6B3E]'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setMode('register'); clearError(); }}
                            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${mode === 'register'
                                ? 'text-[#0F6B3E] border-b-2 border-[#0F6B3E]'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            New Student
                        </button>
                    </div>

                    <div className="px-8 py-8">
                        {/* Success message */}
                        {successMessage && (
                            <div className="mb-5 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                                {successMessage}
                            </div>
                        )}

                        {/* Error message */}
                        {error && (
                            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* ── SIGN IN ── */}
                        {mode === 'login' && (
                            <>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-xs font-medium text-[#0F6B3E] hover:underline"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
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
                                                Signing in...
                                            </>
                                        ) : 'Sign In'}
                                    </button>
                                </form>
                                <p className="mt-5 text-center text-xs text-gray-400">
                                    Students, instructors &amp; administrators all use this login.
                                    You'll be taken to your portal automatically.
                                </p>
                            </>
                        )}

                        {/* ── REGISTER (students only) ── */}
                        {mode === 'register' && (
                            <>
                                <p className="text-sm text-gray-500 mb-5 text-center">
                                    Create a student account. Instructor &amp; admin accounts are
                                    provisioned by the admin team.
                                </p>
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Anna"
                                                required
                                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Müller"
                                                required
                                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={regEmail}
                                            onChange={(e) => setRegEmail(e.target.value)}
                                            placeholder="student@example.com"
                                            required
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={regPassword}
                                            onChange={(e) => setRegPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            required
                                            minLength={8}
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            CEFR Level (German)
                                        </label>
                                        <select
                                            value={cefrLevel}
                                            onChange={(e) => setCefrLevel(e.target.value)}
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/20 focus:border-[#0F6B3E] focus:bg-white transition-all text-sm"
                                        >
                                            {CEFR_LEVELS.map((lvl) => (
                                                <option key={lvl} value={lvl}>
                                                    {lvl} — {lvl === 'A1' ? 'Beginner' : lvl === 'A2' ? 'Elementary' : lvl === 'B1' ? 'Intermediate' : lvl === 'B2' ? 'Upper Intermediate' : lvl === 'C1' ? 'Advanced' : 'Mastery'}
                                                </option>
                                            ))}
                                        </select>
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
                                                Creating account...
                                            </>
                                        ) : 'Create Account'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 pb-6 text-center">
                        <p className="text-xs text-gray-400">
                            © {new Date().getFullYear()} SAF Institute. All rights reserved.
                        </p>
                    </div>
                </div>

                {/* Lime accent bar */}
                <div className="h-1 rounded-b-full mx-8 mt-0" style={{ background: '#C7F000' }} />
            </div>
        </div>
    );
}
