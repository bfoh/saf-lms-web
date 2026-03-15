import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // type=recovery → came from a password-reset email; send to set-password page.
    // type=invite   → came from an invite email; also send to set-password page.
    // (anything else → role-based dashboard redirect after OAuth / magic-link)
    const type = searchParams.get('type');

    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        const {
            data: { session },
        } = await supabase.auth.exchangeCodeForSession(code);

        if (session) {
            // Password reset or invite flow → user must set / update their password.
            if (type === 'recovery' || type === 'invite') {
                return NextResponse.redirect(`${origin}/auth/set-password`);
            }

            // OAuth / magic-link → redirect straight to the user's dashboard.
            const role = session.user.app_metadata?.role || 'student';
            if (role === 'admin') return NextResponse.redirect(`${origin}/admin`);
            if (role === 'instructor') return NextResponse.redirect(`${origin}/instructor/dashboard`);
            return NextResponse.redirect(`${origin}/student/dashboard`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
