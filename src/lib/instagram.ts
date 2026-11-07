import { getDb } from './db';
import { decryptSecret } from './crypto';
import { createHash } from 'node:crypto';
import type { IncomingItem } from './types';
const base='https://graph.instagram.com';
type InstagramMedia = { id:string; caption?:string; media_type?:string; media_url?:string; permalink?:string; timestamp?:string; thumbnail_url?:string };
type InstagramApiResponse<T extends object> = T & { error?:{message?:string} };
async function api<T extends object>(path:string,token:string,params:Record<string,string>={}):Promise<InstagramApiResponse<T>> {
  const u=new URL(`${base}/${process.env.META_GRAPH_VERSION||'v25.0'}/${path}`);
  Object.entries({...params,access_token:token}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{signal:AbortSignal.timeout(20000)});
  const data:InstagramApiResponse<T>=await r.json();
  if(!r.ok||data.error) throw new Error(data.error?.message||`Meta API HTTP ${r.status}`);
  return data;
}
export function instagramAuthorizationUrl(state:string) {
  const id=process.env.META_INSTAGRAM_APP_ID, secret=process.env.META_INSTAGRAM_APP_SECRET;
  if(!id||!secret) throw new Error('Configure META_INSTAGRAM_APP_ID and META_INSTAGRAM_APP_SECRET first.');
  const embedUrl=process.env.META_INSTAGRAM_LOGIN_URL;
  if(embedUrl) {
    let u:URL;
    try { u=new URL(embedUrl); } catch { throw new Error('META_INSTAGRAM_LOGIN_URL must be the Instagram Business Login Embed URL from Meta.'); }
    if(u.protocol!=='https:'||u.hostname!=='www.instagram.com'||u.pathname!=='/oauth/authorize') throw new Error('META_INSTAGRAM_LOGIN_URL must be the Instagram Business Login Embed URL from Meta.');
    if(u.searchParams.get('client_id')!==id) throw new Error('The Instagram App ID in META_INSTAGRAM_LOGIN_URL must match META_INSTAGRAM_APP_ID.');
    const redirectUri=process.env.META_INSTAGRAM_REDIRECT_URI||'http://localhost:3000/api/integrations/instagram/callback';
    if(u.searchParams.get('redirect_uri')!==redirectUri) throw new Error('The redirect URI in META_INSTAGRAM_LOGIN_URL must match META_INSTAGRAM_REDIRECT_URI.');
    if(u.searchParams.get('response_type')!=='code'||!u.searchParams.get('scope')) throw new Error('META_INSTAGRAM_LOGIN_URL must include response_type=code and the requested Instagram permissions.');
    u.searchParams.set('state',state);
    return u.toString();
  }
  const u=new URL('https://www.instagram.com/oauth/authorize');
  u.searchParams.set('client_id',id);u.searchParams.set('redirect_uri',process.env.META_INSTAGRAM_REDIRECT_URI||'http://localhost:3000/api/integrations/instagram/callback');
  u.searchParams.set('response_type','code');u.searchParams.set('scope',process.env.META_INSTAGRAM_SCOPES||'instagram_business_basic');u.searchParams.set('state',state);
  return u.toString();
}
export async function exchangeCode(code:string) {
  const form=new URLSearchParams({client_id:process.env.META_INSTAGRAM_APP_ID||'',client_secret:process.env.META_INSTAGRAM_APP_SECRET||'',grant_type:'authorization_code',redirect_uri:process.env.META_INSTAGRAM_REDIRECT_URI||'http://localhost:3000/api/integrations/instagram/callback',code});
  const r=await fetch('https://api.instagram.com/oauth/access_token',{method:'POST',body:form,signal:AbortSignal.timeout(20000)});
  const d=await r.json(); if(!r.ok||!d.access_token) throw new Error(d.error_message||'Instagram code exchange failed');
  const longUrl=new URL(`${base}/access_token`); longUrl.searchParams.set('grant_type','ig_exchange_token');longUrl.searchParams.set('client_secret',process.env.META_INSTAGRAM_APP_SECRET||'');longUrl.searchParams.set('access_token',d.access_token);
  const lr=await fetch(longUrl,{signal:AbortSignal.timeout(20000)});const ld=await lr.json();
  if(!lr.ok||!ld.access_token) throw new Error(ld.error?.message||'Long-lived token exchange failed');
  return {access_token:ld.access_token,expires_in:ld.expires_in||5184000,user_id:String(d.user_id||'')};
}
export async function fetchInstagram(sourceId:number,encrypted:string):Promise<IncomingItem[]> {
  const token=decryptSecret(encrypted);
  const account=await api<{username?:string}>('me',token,{fields:'id,user_id,username,account_type,media_count'});
  const media=await api<{data?:InstagramMedia[]}>('me/media',token,{fields:'id,caption,media_type,media_url,permalink,timestamp,username,thumbnail_url',limit:'50'});
  return (media.data||[]).map(o=>({external_id:String(o.id),url:o.permalink||null,title:`Instagram ${o.media_type||'media'}`,body:o.caption||'',published_at:o.timestamp||null,content_hash:createHash('sha256').update(String(o.id)+(o.caption||'')).digest('hex'),metadata:{platform:'instagram',media_type:o.media_type,media_url:o.media_url,thumbnail_url:o.thumbnail_url,account:account.username}}));
}
export function connectedSource(id:number,label:string,token:string,userId:string,expires:number) {
  getDb().prepare('INSERT INTO sources(kind,label,external_id,access_token_enc,token_expires_at) VALUES(?,?,?,?,?)').run('instagram_professional',label,userId,token,String(Math.floor(Date.now()/1000)+expires));
}
