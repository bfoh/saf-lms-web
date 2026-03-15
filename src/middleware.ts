import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Use getUser() instead of getSession() for reliable server-side role detection.
    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;
    const role: string = user?.app_metadata?.role || 'student';

    // Improved logging
    console.log(`[Middleware] -> Path: ${path} | Detected Role: ${user?.app_metadata?.role || 'NONE (falling back to student)'} | UID: ${user?.id}`);

    // Helper to create a redirect that preserves cookies (e.g. refreshed sessions)
    const redirectWithCookies = (to: string) => {
        const redirectResponse = NextResponse.redirect(new URL(to, request.url));
        // Copy cookies from the middleware's supabaseResponse (which setAll might have updated)
        // to our redirect response so they actually reach the browser.
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        return redirectResponse;
    };

    // Public paths that never need auth
    const publicPaths = ['/login', '/auth/callback', '/auth/set-password'];
    const isPublic = publicPaths.some((p) => path.startsWith(p));

    // If not authenticated
    if (!user) {
        if (isPublic) return supabaseResponse;
        
        // Never redirect API requests to /login, as this causes "Unexpected token <" (HTML) crashes on the frontend.
        if (path.startsWith('/api')) {
            return new NextResponse(
                JSON.stringify({ error: 'unauthorized', message: 'Authentication required' }),
                { status: 401, headers: { 'content-type': 'application/json' } }
            );
        }

        return redirectWithCookies('/login');
    }

    // Canonical home portal for each role
    const homePortal =
        role === 'admin' || role === 'superadmin' ? '/admin'
        : role === 'instructor' || role === 'teacher' ? '/instructor/dashboard'
        : '/student/dashboard';

    // If authenticated and hitting the login page or root → redirect to their dashboard
    if (path === '/login' || path === '/') {
        return redirectWithCookies(homePortal);
    }

    // ── Strict one-portal-per-role enforcement ──────────────────────────────
    // Each role is sent back to their own portal if they try to access another.
    // This prevents the shared-session confusion (e.g. admin viewing /instructor/*).

    // /admin  → only admin / superadmin
    if (path.startsWith('/admin') && role !== 'admin' && role !== 'superadmin') {
        console.warn(`[Middleware] ${role} (${user.id}) tried /admin → redirecting to ${homePortal}`);
        return redirectWithCookies(homePortal);
    }

    // /instructor → only instructor / teacher
    if (path.startsWith('/instructor') && role !== 'instructor' && role !== 'teacher') {
        console.warn(`[Middleware] ${role} (${user.id}) tried /instructor → redirecting to ${homePortal}`);
        return redirectWithCookies(homePortal);
    }

    // /student → student, instructor, teacher (teachers supervise student work)
    if (path.startsWith('/student')) {
        const allowedRoles = ['student', 'teacher', 'instructor'];
        if (!allowedRoles.includes(role)) {
            console.warn(`[Middleware] ${role} (${user.id}) tried /student → redirecting to ${homePortal}`);
            return redirectWithCookies(homePortal);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
