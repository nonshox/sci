import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getDb } from '@/lib/db';
import { instagramAuthorizationUrl } from '@/lib/instagram';
export const runtime='nodejs';
export async function GET(){try{const db=getDb();const state=randomBytes(32).toString('hex');db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(Math.floor(Date.now()/1000));db.prepare('INSERT INTO oauth_states(state,expires_at) VALUES(?,?)').run(state,Math.floor(Date.now()/1000)+600);return NextResponse.redirect(instagramAuthorizationUrl(state))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Instagram setup error'},{status:503})}}
