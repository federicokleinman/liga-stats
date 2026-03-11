import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_RAW = process.env.PLANILLA_JWT_SECRET || 'liga-planilla-dev-secret-change-me';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const COOKIE_NAME = 'planilla-session';

// Public planilla routes that don't require auth
const PUBLIC_PATHS = ['/planilla/login', '/planilla/resumen'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /planilla/* and /api/planilla/* routes
  if (!pathname.startsWith('/planilla') && !pathname.startsWith('/api/planilla')) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow auth API (login/logout)
  if (pathname.startsWith('/api/planilla/auth')) {
    return NextResponse.next();
  }

  // Allow seed API
  if (pathname.startsWith('/api/planilla/seed')) {
    return NextResponse.next();
  }

  // Check JWT
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/planilla/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Admin routes require admin role
    if (pathname.includes('/admin') && role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/planilla/login', request.url));
    }

    // Inject session info into headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-planilla-role', role);
    if (payload.teamId) {
      response.headers.set('x-planilla-team-id', payload.teamId as string);
    }
    return response;
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/planilla/login', request.url));
  }
}

export const config = {
  matcher: ['/planilla/:path*', '/api/planilla/:path*'],
};
