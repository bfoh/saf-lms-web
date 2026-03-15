import { redirect } from 'next/navigation';

// Root page: middleware will redirect authenticated users to their dashboard.
// Unauthenticated users are redirected to /login.
export default function RootPage() {
    redirect('/login');
}
