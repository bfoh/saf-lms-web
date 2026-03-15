// Re-export from AuthContext for backward compatibility
export { useAuth } from '@/context/AuthContext';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'student' | 'instructor' | 'teacher' | 'admin';
    cefrLevel?: string;
}
