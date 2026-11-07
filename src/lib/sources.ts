import { createHash } from 'node:crypto';
import dns from 'node:dns/promises';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import net from 'node:net';

function isPublicIp(ip:string) {
  if (net.isIP(ip) === 4) {
    const p=ip.split('.').map(Number);
    return !(p[0]===0 || p[0]===10 || p[0]===100&&p[1]>=64&&p[1]<=127 || p[0]===127 || p[0]===169&&p[1]===254 || p[0]===172&&p[1]>=16&&p[1]<=31 || p[0]===192&&(p[1]===0&&p[2]===0||p[1]===0&&p[2]===2||p[1]===88&&p[2]===99||p[1]===168) || p[0]===198&&(p[1]===18||p[1]===19||p[1]===51&&p[2]===100) || p[0]===203&&p[1]===0&&p[2]===113 || p[0]>=224);
  }
  const first=Number.parseInt(ip.split(':')[0]||'0',16);
  return first>=0x2000 && first<=0x3fff && !ip.toLowerCase().startsWith('2001:db8:');
}
async function resolvePublicUrl(raw:string) {
  const u=new URL(raw);
  if (!['http:','https:'].includes(u.protocol) || !u.hostname || u.username || u.password) throw new Error('Only public HTTP(S) URLs without embedded credentials are allowed.');
  if (u.port && u.port!==(u.protocol==='https:'?'443':'80')) throw new Error('Only standard HTTP and HTTPS ports are supported.');
  const hostname=u.hostname.replace(/^\[|\]$/g,'').replace(/\.$/,'').toLowerCase();
  const platformDomains=['instagram.com','facebook.com','fb.com','threads.net'];
  if(platformDomains.some(domain=>hostname===domain||hostname.endsWith(`.${domain}`))) throw new Error('Use an official platform connection instead of collecting social-network pages as website sources.');
  const records=net.isIP(hostname)
    ? [{address:hostname,family:net.isIP(hostname)}]
    : await dns.lookup(hostname,{all:true,verbatim:true});
  if (!records.length || records.some(r=>!isPublicIp(r.address))) throw new Error('Private, local, link-local or reserved network targets are blocked.');
  return {url:u,hostname,address:records[0].address,family:records[0].family};
}
const hash=(...parts:(string|undefined|null)[])=>createHash('sha256').update(parts.map(x=>x||'').join('\n')).digest('hex');
function cleanHtml(html:string) { return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim(); }
function safeLink(raw:string,base:string) {
  try {
    const url=new URL(raw,base);
    return (url.protocol==='http:'||url.protocol==='https:')&&!url.username&&!url.password?url.toString():null;
  } catch {
    return null;
  }
}
const MAX_RESPONSE_BYTES=2_000_000;

async function getPublicResponse(raw:string) {
  const {url,hostname,address,family}=await resolvePublicUrl(raw);
  const responseData=await new Promise<{text:string;type:string}>((resolve,reject)=>{
    const chunks:Buffer[]=[];
    let size=0;
    let settled=false;
    const fail=(error:Error)=>{if(!settled){settled=true;reject(error)}};
    const onResponse=(response:IncomingMessage)=>{
      const status=response.statusCode||0;
      if(status>=300&&status<400){response.resume();fail(new Error('Redirects are disabled; add the final public URL as a source.'));return}
      if(status<200||status>=300){response.resume();fail(new Error(`Source returned HTTP ${status}`));return}
      const contentLength=Number(response.headers['content-length']||0);
      if(contentLength>MAX_RESPONSE_BYTES){response.destroy();fail(new Error('Source exceeds the 2 MB response limit.'));return}
      response.on('data',(chunk:Buffer|string)=>{
        const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
        size+=buffer.length;
        if(size>MAX_RESPONSE_BYTES){response.destroy(new Error('Source exceeds the 2 MB response limit.'));return}
        chunks.push(buffer);
      });
      response.on('end',()=>{if(!settled){settled=true;resolve({text:Buffer.concat(chunks).toString('utf8'),type:String(response.headers['content-type']||'').toLowerCase()})}});
      response.on('error',fail);
    };
    const options={
      hostname:address,
      family,
      port:url.port||undefined,
      path:`${url.pathname}${url.search}`,
      method:'GET' as const,
      headers:{host:url.host,'user-agent':'SCI-ResearchBot/1.0','accept':'text/html,application/rss+xml,application/atom+xml'},
      timeout:15000,
    };
    const request=url.protocol==='https:'
      ? httpsRequest({...options,servername:net.isIP(hostname)?undefined:hostname,rejectUnauthorized:true},onResponse)
      : httpRequest(options,onResponse);
    request.on('timeout',()=>request.destroy(new Error('Source request timed out.')));
    request.on('error',fail);
    request.end();
  });
  return {url,...responseData};
}

export async function fetchWebsite(raw:string) {
  const {url,text,type}=await getPublicResponse(raw);
  if (type.includes('xml') || type.includes('rss') || type.includes('atom') || text.trimStart().startsWith('<?xml')) {
    const entries=[...text.matchAll(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi)].slice(0,30);
    return entries.map((m,i)=>{
      const block=m[0], tag=(name:string)=>block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'';
      const title=cleanHtml(tag('title')); const body=cleanHtml(tag('description')||tag('summary')||tag('content')); const rawLink=block.match(/<link\b[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)/i)?.[1]||block.match(/<link\b[^>]*\bhref=["']([^"']+)/i)?.[1]||cleanHtml(tag('link')); const link=rawLink?safeLink(rawLink,url.toString()):null; const id=cleanHtml(tag('guid')||tag('id'))||link||String(i);
      return {external_id:id,url:link,title,body,published_at:cleanHtml(tag('pubDate')||tag('published')||tag('updated')),content_hash:hash(title,body),metadata:{type:'feed_entry'}};
    });
  }
  if (!text.trimStart().startsWith('<')) throw new Error('Unsupported content type; expected HTML or RSS/Atom.');
  const title=cleanHtml(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||raw);
  const canonicalTag=text.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0];
  const rawCanonical=canonicalTag?.match(/\bhref=["']([^"']+)/i)?.[1]||raw;
  const canonical=safeLink(rawCanonical,url.toString())||url.toString();
  const body=cleanHtml(text.replace(/<head[\s\S]*?<\/head>/i,' ').replace(/<script[\s\S]*?<\/script>/gi,' ')).slice(0,100000);
  return [{external_id:canonical,url:canonical,title,body,published_at:null,content_hash:hash(title,body),metadata:{type:'webpage'}}];
}
