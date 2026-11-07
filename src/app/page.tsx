import Link from 'next/link';
import { db } from '@/lib/db';
import type { Source,ContentItem } from '@/lib/types';
import { AddWebsiteForm } from '@/components/add-website-form';
import { SyncButton } from '@/components/sync-button';
export const dynamic='force-dynamic';
export default function Home(){
 const sources=db.prepare('SELECT id,kind,label,url,external_id,created_at,last_synced_at FROM sources ORDER BY id DESC').all() as Source[];
 const content=db.prepare('SELECT * FROM content_items ORDER BY collected_at DESC LIMIT 8').all() as ContentItem[];
 const instagram=sources.filter(s=>s.kind==='instagram_professional').length;
 return <main className="shell">
  <header className="top"><Link className="brand" href="/">SCI<span>.</span></Link><span className="eyebrow">Source intelligence workspace</span></header>
  <div className="hero"><div><div className="eyebrow">Overview / workspace</div><h1>Good research starts<br/>with connected sources.</h1><p className="sub">Collect public web content and authorized Instagram professional-account media in one place.</p></div><div className="actions"><a className="btn primary" href="/api/integrations/instagram/login">Connect Instagram ↗</a></div></div>
  <div className="grid">
   <div className="panel"><div className="eyebrow">Connected sources</div><div className="stat">{sources.length}</div><div className="muted">Websites, feeds and Instagram</div></div>
   <div className="panel"><div className="eyebrow">Instagram accounts</div><div className="stat">{instagram}</div><div className="muted">Authorized professional accounts</div></div>
   <div className="panel"><div className="eyebrow">Collected items</div><div className="stat">{(db.prepare('SELECT COUNT(*) n FROM content_items').get() as {n:number}).n}</div><div className="muted">Deduplicated source records</div></div>
  </div>
  <section className="section"><div className="section-head"><h2>Connect a website or feed</h2><span className="pill">HTTP(S) · RSS · Atom</span></div><div className="panel"><AddWebsiteForm/></div></section>
  <section className="section"><div className="section-head"><h2>Your sources</h2><span className="muted">{sources.length} total</span></div><div className="panel"><div className="list">{sources.length?sources.map(s=><div className="item" key={s.id}><div><div className="item-title">{s.label}</div><div className="muted">{s.kind.replaceAll('_',' ')}{s.url?` · ${s.url}`:''}</div><div className="muted">Last synced: {s.last_synced_at||'Never'}</div></div><SyncButton id={s.id}/></div>):<div className="empty">No sources yet. Add a public website or connect Instagram to get started.</div>}</div></div></section>
  <section className="section"><div className="section-head"><h2>Recently collected</h2><Link className="muted" href="/content">View all →</Link></div><div className="content">{content.length?content.map(c=><article className="content-card" key={c.id}><div className="eyebrow">Source #{c.source_id} · {c.published_at||c.collected_at}</div><div className="item-title" style={{marginTop:8}}>{c.title||'Untitled item'}</div><p>{(c.body||'').slice(0,280)}{(c.body||'').length>280?'…':''}</p>{c.canonical_url&&<a href={c.canonical_url} target="_blank" rel="noreferrer">Open original ↗</a>}</article>):<div className="empty">Collected content will appear here after your first sync.</div>}</div></section>
  <div className="notice">Instagram access is limited to the eligible professional account that explicitly authorizes this app. Website collection is for public sources you are authorized to monitor.</div>
 </main>
}
