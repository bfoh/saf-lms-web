import { redirect } from 'next/navigation';

// /student redirects to /student/dashboard
export default function StudentPage() {
    redirect('/student/dashboard');
}
