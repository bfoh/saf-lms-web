"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Building2,
    GraduationCap,
    BookOpen,
    Settings,
    CreditCard,
    FileText,
    CheckCircle,
    Library,
    ChevronDown,
    BookMarked,
    MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { SignOutButton } from "./SignOutButton";
import { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";

const academicsChildren = [
    { name: "Courses (LMS)", href: "/admin/courses", icon: BookOpen },
    { name: "Assignments", href: "/admin/assignments", icon: FileText },
    { name: "Exam Grading", href: "/admin/grading", icon: CheckCircle },
];

const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Branches", href: "/admin/branches", icon: Building2 },
    { name: "Classes & Cohorts", href: "/admin/classes", icon: Library },
    { name: "Students", href: "/admin/students", icon: Users },
    { name: "Instructors", href: "/admin/instructors", icon: GraduationCap },
    { name: "Messages", href: "/admin/messages", icon: MessageSquare },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { unreadCount } = useNotifications();

    const academicsActive = academicsChildren.some(c => pathname.startsWith(c.href));
    const [academicsOpen, setAcademicsOpen] = useState(academicsActive);

    const isActive = (href: string) => {
        if (href === "/admin") return pathname === "/admin";
        return pathname.startsWith(href);
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 flex-shrink-0">
            {/* Brand */}
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
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-0.5 px-3">

                    {/* Top nav items (before Academics) */}
                    {navItems.slice(0, 3).map((item) => {
                        const active = isActive(item.href);
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                                            ? "bg-brand-primary text-white shadow-sm"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-brand-primary"
                                        }`}
                                >
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    {item.name}
                                </Link>
                            </li>
                        );
                    })}

                    {/* ── Academics collapsible ── */}
                    <li>
                        <button
                            onClick={() => setAcademicsOpen(o => !o)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${academicsActive
                                    ? "bg-brand-primary/10 text-brand-primary"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-brand-primary"
                                }`}
                        >
                            <BookMarked className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">Academics</span>
                            <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${academicsOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {/* Children */}
                        <div
                            className={`overflow-hidden transition-all duration-200 ${academicsOpen ? "max-h-40 mt-0.5" : "max-h-0"
                                }`}
                        >
                            <ul className="pl-4 space-y-0.5">
                                {academicsChildren.map((child) => {
                                    const active = isActive(child.href);
                                    return (
                                        <li key={child.name}>
                                            <Link
                                                href={child.href}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active
                                                        ? "bg-brand-primary text-white shadow-sm"
                                                        : "text-gray-500 hover:bg-gray-50 hover:text-brand-primary"
                                                    }`}
                                            >
                                                <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                                                {child.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </li>

                    {/* Remaining nav items */}
                    {navItems.slice(3).map((item) => {
                        const active = isActive(item.href);
                        const isMessages = item.href.includes('/messages');
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                                            ? "bg-brand-primary text-white shadow-sm"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-brand-primary"
                                        }`}
                                >
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1">{item.name}</span>
                                    {isMessages && unreadCount > 0 && (
                                        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Sign Out */}
            <div className="p-4 border-t border-gray-100">
                <SignOutButton />
            </div>
        </aside>
    );
}
