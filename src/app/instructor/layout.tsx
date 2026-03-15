'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    BookCheck,
    Library,
    BarChart3,
    MessageSquare,
    LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

const navGroups = [
    {
        label: 'Teaching',
        items: [
            { href: '/instructor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/instructor/classes', label: 'My Classes', icon: GraduationCap },
            { href: '/instructor/students', label: 'Student Directory', icon: Users },
        ],
    },
    {
        label: 'Assessment',
        items: [
            { href: '/instructor/grading', label: 'Grading Center', icon: BookCheck },
            { href: '/instructor/resources', label: 'Resources', icon: Library },
        ],
    },
    {
        label: 'Insights',
        items: [
            { href: '/instructor/reports', label: 'Reports', icon: BarChart3 },
            { href: '/instructor/messages', label: 'Messages', icon: MessageSquare },
        ],
    },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { unreadCount } = useNotifications();

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const initials = user
        ? `${user.user_metadata?.first_name?.[0] || ''}${user.user_metadata?.last_name?.[0] || ''}`.toUpperCase() || 'IN'
        : 'IN';

    const fullName = user
        ? `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email
        : 'Instructor';

    return (
        <div className="flex min-h-screen bg-brand-bg">
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen">
                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: '#0F6B3E' }}>
                            LM
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">LinguaMeister</p>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Instructor</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
                    {navGroups.map(group => (
                        <div key={group.label}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-1.5">{group.label}</p>
                            <div className="space-y-0.5">
                                {group.items.map(({ href, label, icon: Icon }) => {
                                    const isActive = pathname === href || pathname.startsWith(href + '/');
                                    const isMessages = href.includes('/messages');
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                            style={isActive ? { background: '#0F6B3E' } : {}}
                                        >
                                            <Icon size={17} className="shrink-0" />
                                            <span className="flex-1">{label}</span>
                                            {isMessages && unreadCount > 0 && (
                                                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User section */}
                <div className="border-t border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: '#0F6B3E' }}>
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
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
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
                    <h2 className="text-base font-semibold text-gray-800">Instructor Portal</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{fullName}</span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: '#0F6B3E' }}>
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
