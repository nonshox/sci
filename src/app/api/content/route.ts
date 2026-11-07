
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const limit = Math.max(
      1,
      Math.min(500, Number(u.searchParams.get('limit') || 100))
    );

    const rows = getDb()
      .prepare(
        'SELECT * FROM content_items ORDER BY id DESC LIMIT ?'
      )
      .all(limit);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json(
      { error: 'Unable to retrieve content' },
      { status: 500 }
    );
  }
}
