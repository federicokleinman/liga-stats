import { NextRequest, NextResponse } from 'next/server';
import { authenticateTeam, authenticateAdmin, buildSessionCookie, getConfiguredTeamIds } from '@/lib/planilla/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, teamId, password } = body as {
      role: 'team' | 'admin';
      teamId?: string;
      password: string;
    };

    if (!password) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 });
    }

    let token: string | null = null;

    if (role === 'admin') {
      token = await authenticateAdmin(password);
    } else if (role === 'team') {
      if (!teamId) {
        return NextResponse.json({ error: 'Equipo requerido' }, { status: 400 });
      }
      token = await authenticateTeam(teamId, password);
    } else {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, role, teamId });
    response.headers.set('Set-Cookie', buildSessionCookie(token));
    return response;
  } catch {
    return NextResponse.json({ error: 'Error en login' }, { status: 500 });
  }
}

/** GET returns list of team IDs that have credentials (for login form dropdown) */
export async function GET() {
  const teamIds = getConfiguredTeamIds();
  return NextResponse.json({ teamIds });
}
