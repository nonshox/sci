import { createHash } from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { getDb } from './db';
import type { IncomingItem } from './types';

function isPublicIp(ip:string) {
  if (net.isIP(ip) === 4) {
    const p=ip.split('.').map(Number);
    return !(p[0]===10 || p[0]===127 || p[0]===0 || p[0]===169&&p[1]===254 || p[0]===172&&p[1]>=16&&p[1]<=31 || p[0]===192&&p[1]===168 || p[0]>=224);
  }
  const x=ip.toLowerCase();
  return !(x==='::1' || x==='::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb') || x.startsWith('ff'));
}
export async function validatePublicUrl(raw:string) {
  const u=new URL(raw);
  if (!['http:','https:'].includes(u.protocol) || !u.hostname || u.username || u.password) throw new Error('Only public HTTP(S) URLs without embedded credentials are allowed.');
  const records=await dns.lookup(u.hostname,{all:true,verbatim:true});
  if (!records.length || records.some(r=>!isPublicIp(r.address))) throw new Error('Private, local, link-local or reserved network targets are blocked.');
  return u;
}
const hash=(...parts:(string|undefined|null)[])=>createHash('sha256').update(parts.map(x=>x||'').join('\n')).digest('hex');
function cleanHtml(html:string) { return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim(); }
export async function fetchWebsite(raw:string):Promise<IncomingItem[]> {
  const url=await validatePublicUrl(raw);
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'user-agent':'SCI-ResearchBot/1.0','accept':'text/html,application/rss+xml,application/atom+xml,*/*;q=0.5'}});
  if (response.status>=300 && response.status<400) throw new Error('Redirects are disabled; add the final public URL as a source.');
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const type=response.headers.get('content-type')?.toLowerCase()||'';
  const text=await response.text();
  if (text.length>2_000_000) throw new Error('Source exceeds the 2 MB response limit.');
  if (type.includes('xml') || type.includes('rss') || type.includes('atom') || text.trimStart().startsWith('<?xml')) {
    const entries=[...text.matchAll(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi)].slice(0,30);
    return entries.map((m,i)=>{
      const block=m[0], tag=(name:string)=>block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'';
      const title=cleanHtml(tag('title')); const body=cleanHtml(tag('description')||tag('summary')||tag('content')); const link=tag('link').match(/href=["']([^"']+)/i)?.[1]||cleanHtml(tag('link'))||raw; const id=cleanHtml(tag('guid')||tag('id'))||link||String(i);
      return {external_id:id,url:link,title,body,published_at:cleanHtml(tag('pubDate')||tag('published')||tag('updated')),content_hash:hash(title,body),metadata:{type:'feed_entry'}};
    });
  }
  if (!type.includes('html') && !text.trimStart().startsWith('<')) throw new Error('Unsupported content type; expected HTML or RSS/Atom.');
  const title=cleanHtml(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||raw);
  const canonical=text.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]||raw;
  const body=cleanHtml(text.replace(/<head[\s\S]*?<\/head>/i,' ').replace(/<script[\s\S]*?<\/script>/gi,' ')).slice(0,100000);
  return [{external_id:canonical,url:canonical,title,body,content_hash:hash(title,body),metadata:{type:'webpage',content_type:type}}];
}
export function saveItems(sourceId:number, items:IncomingItem[]) {
  const db=getDb();
  const stmt=db.prepare(`INSERT INTO content_items(source_id,external_id,canonical_url,title,body,published_at,content_hash,metadata_json)
  VALUES(@source_id,@external_id,@url,@title,@body,@published_at,@content_hash,@metadata)
  ON CONFLICT(source_id,external_id) DO UPDATE SET canonical_url=excluded.canonical_url,title=excluded.title,body=excluded.body,published_at=excluded.published_at,content_hash=excluded.content_hash,metadata_json=excluded.metadata_json`);
  const tx=db.transaction((rows:IncomingItem[])=>rows.forEach(x=>stmt.run({source_id:sourceId,external_id:x.external_id,url:x.url||null,title:x.title||null,body:x.body||null,published_at:x.published_at||null,content_hash:x.content_hash,metadata:JSON.stringify(x.metadata||{})})));
  tx(items);
}
