import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime='nodejs';
export async function GET(req:Request){const u=new URL(req.url);const limit=Math.max(1,Math.min(500,Number(u.searchParams.get('limit')||100)));return NextResponse.json(db.prepare('SELECT * FROM content_items ORDER BY id DESC LIMIT ?').all(limit))}
