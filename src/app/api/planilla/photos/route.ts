import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'planillas', 'photos');

async function ensureDir() {
  if (!existsSync(PHOTOS_DIR)) {
    await mkdir(PHOTOS_DIR, { recursive: true });
  }
}

/** POST: upload a photo. Expects multipart form with `photo` file + `matchId`, `teamId`, `carne` fields */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;
    const matchId = formData.get('matchId') as string;
    const teamId = formData.get('teamId') as string;
    const carne = formData.get('carne') as string;

    if (!photo || !matchId || !teamId || !carne) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    // Max 2MB
    if (photo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no debe superar 2MB' }, { status: 400 });
    }

    await ensureDir();

    const ext = photo.type === 'image/png' ? 'png' : 'jpg';
    const filename = `${matchId}--${teamId}--${carne}.${ext}`;
    const filepath = path.join(PHOTOS_DIR, filename);

    const buffer = Buffer.from(await photo.arrayBuffer());
    await writeFile(filepath, buffer);

    return NextResponse.json({ filename });
  } catch {
    return NextResponse.json({ error: 'Error al subir foto' }, { status: 500 });
  }
}

/** GET: serve a photo by filename query param */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'filename requerido' }, { status: 400 });
  }

  // Prevent path traversal
  const safeName = path.basename(filename);
  const filepath = path.join(PHOTOS_DIR, safeName);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filepath);
    const contentType = safeName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error al leer foto' }, { status: 500 });
  }
}
