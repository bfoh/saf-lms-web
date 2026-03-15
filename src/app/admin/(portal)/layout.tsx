import type { Metadata } from "next";
import { Sidebar } from "./components/Sidebar";
import { SignOutButton } from "./components/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Admin Portal | SAF Institute LMS",
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const firstName = user?.user_metadata?.first_name || '';
    const lastName = user?.user_metadata?.last_name || '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Admin';
    const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'A';

    return (
        <div className="flex min-h-screen bg-brand-bg">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-gray-800">Administrator Portal</h2>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                            <p className="text-xs text-gray-500">Administrator</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm select-none">
                            {initials}
                        </div>
                        <SignOutButton />
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
