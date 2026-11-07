import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { fetchWebsite,saveItems } from '@/lib/sources';
import { fetchInstagram } from '@/lib/instagram';
export const runtime='nodejs';
type SourceRecord = { id:number; kind:string; url:string|null; access_token_enc:string|null };
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){try{const db=getDb();const {id}=await params;const source=db.prepare('SELECT * FROM sources WHERE id=?').get(Number(id)) as SourceRecord|undefined;if(!source)return NextResponse.json({error:'Source not found'},{status:404});let items;if(source.kind==='website'){if(!source.url)return NextResponse.json({error:'Website source has no URL'},{status:400});items=await fetchWebsite(source.url)}else if(source.kind==='instagram_professional'){if(!source.access_token_enc)return NextResponse.json({error:'Instagram source has no access token'},{status:400});items=await fetchInstagram(source.id,source.access_token_enc)}else return NextResponse.json({error:'Unsupported source kind'},{status:400});saveItems(source.id,items);db.prepare('UPDATE sources SET last_synced_at=CURRENT_TIMESTAMP WHERE id=?').run(source.id);return NextResponse.json({source_id:source.id,items_received:items.length,status:'ok'})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Sync failed'},{status:502})}}
