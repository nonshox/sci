import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validatePublicUrl } from '@/lib/sources';
export const runtime='nodejs';
export async function POST(req:Request){try{const body=await req.json();const label=String(body.label||'').trim();const raw=String(body.url||'').trim();if(!label||label.length>120) return NextResponse.json({error:'A source label (max 120 characters) is required.'},{status:400});await validatePublicUrl(raw);const result=getDb().prepare('INSERT INTO sources(kind,label,url) VALUES(?,?,?)').run('website',label,raw);return NextResponse.json({id:Number(result.lastInsertRowid),kind:'website',label,url:raw},{status:201})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid request'},{status:400})}}
