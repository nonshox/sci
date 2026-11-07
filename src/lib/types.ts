export type Source = { id:number; kind:string; label:string; url:string|null; external_id:string|null; created_at:string; last_synced_at:string|null };
export type ContentItem = { id:number; source_id:number; external_id:string; canonical_url:string|null; title:string|null; body:string|null; published_at:string|null; collected_at:string; content_hash:string; metadata_json:string };
export type IncomingItem = { external_id:string; url?:string|null; title?:string|null; body?:string|null; published_at?:string|null; content_hash:string; metadata?:Record<string,unknown> };
