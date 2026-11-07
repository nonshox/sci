'use client';
import { useState } from 'react';
export function AddWebsiteForm(){
 const [label,setLabel]=useState('');const [url,setUrl]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/api/sources/websites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({label,url})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not add source');setMessage('Source added.');setLabel('');setUrl('');window.location.reload()}catch(err){setMessage(err instanceof Error?err.message:'Request failed')}finally{setBusy(false)}}
 return <form className="form" onSubmit={submit}><input className="field" placeholder="Source name" value={label} onChange={e=>setLabel(e.target.value)} required/><input className="field" type="url" placeholder="https://example.com or feed URL" value={url} onChange={e=>setUrl(e.target.value)} required/><button className="btn primary" disabled={busy}>{busy?'Adding…':'Add source +'}</button>{message&&<span className="muted">{message}</span>}</form>
}
