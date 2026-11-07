import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime='nodejs';
export async function GET(){return NextResponse.json(db.prepare('SELECT id,kind,label,url,external_id,created_at,last_synced_at FROM sources ORDER BY id DESC').all())}
