'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    ClipboardList,
    CalendarDays,
    CreditCard,
    Settings,
    LogOut,
    BarChart3,
    BookMarked,
    MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import Image from 'next/image';

const navItems = [
    { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/courses', label: 'Courses', icon: BookOpen },
    { href: '/student/assignments', label: 'Assignments', icon: ClipboardList },
    { href: '/student/grades', label: 'Grades', icon: BarChart3 },
    { href: '/student/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/student/library', label: 'Library', icon: BookMarked },
    { href: '/student/messages', label: 'Messages', icon: MessageSquare },
    { href: '/student/billing', label: 'Billing', icon: CreditCard },
    { href: '/student/settings', label: 'Settings', icon: Settings },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut, loading } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const { unreadCount } = useNotifications();
    const firstName = user?.user_metadata?.first_name || 'Student';
    const lastName = user?.user_metadata?.last_name || '';
    const initials = `${firstName[0] || 'S'}${lastName[0] || ''}`.toUpperCase();

    // Redirect to login when auth has resolved with no user
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [loading, user, router]);

    // Show full-screen spinner while Supabase resolves the session,
    // OR while we're about to redirect (prevents blank flash)
    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <span className="w-9 h-9 border-[3px] border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                    <p className="text-sm font-medium">Loading your portal…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-brand-bg">
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen">
                {/* Logo */}
                <div className="h-28 flex items-center justify-center px-4 border-b border-gray-100">
                    <div className="relative h-24 w-52">
                        <Image
                            src="/saflogo.png"
                            alt="SAF Institute"
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(href + '/');
                        const isMessages = href.includes('/messages');
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'text-white'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                style={isActive ? { background: '#0F6B3E' } : {}}
                            >
                                <Icon size={18} className="shrink-0" />
                                <span className="flex-1">{label}</span>
                                {isMessages && unreadCount > 0 && (
                                    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User + sign out */}
                <div className="border-t border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: '#0F6B3E' }}
                        >
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{firstName}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
                    <h2 className="text-base font-semibold text-gray-800 font-poppins">
                        LinguaMeister — Student Portal
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{firstName}</span>
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: '#0F6B3E' }}
                        >
                            {initials}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
