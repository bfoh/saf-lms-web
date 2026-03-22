import { createClient } from './supabase/client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
    const supabase = createClient();

    // Use getSession() instead of forced refreshSession() to avoid race conditions.
    // getSession() returns the cached session if available and valid.
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 35-second timeout — long enough to survive Render free-tier cold starts
    const signal = options?.signal ?? AbortSignal.timeout(35_000);
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal });

    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!res.ok) {
        let message = 'Request failed';
        if (isJson) {
            const error = await res.json().catch(() => ({ message: 'Request failed' }));
            message = error.message || message;
        } else {
            // If it's HTML/text, just discard the body and use a generic error
            await res.text().catch(() => {});
        }
        throw new Error(message);
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return {} as T;
    }

    if (!isJson) {
        // Successful response but not JSON? Uncommon but let's handle it.
        return {} as T;
    }

    const json = await res.json();

    // NestJS backend returns { success: true, data: T }
    return (json.data ?? json) as T;
}
