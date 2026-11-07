'use client';
import { useState } from 'react';
export function SyncButton({id}:{id:number}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function sync(){setBusy(true);setMessage('');try{const r=await fetch(`/api/sources/${id}/sync`,{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Sync failed');setMessage(`${d.items_received} items`);window.location.reload()}catch(e){setMessage(e instanceof Error?e.message:'Sync failed')}finally{setBusy(false)}}
 return <div style={{display:'flex',gap:8,alignItems:'center'}}><button className="btn" onClick={sync} disabled={busy}>{busy?'Syncing…':'Sync now ↻'}</button>{message&&<span className="muted">{message}</span>}</div>
}
