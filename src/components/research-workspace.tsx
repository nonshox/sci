'use client';

import Link from 'next/link';
import { useState } from 'react';

type Report = {
  overview: string;
  total_records: number;
  matching_records: number;
  topic_terms: string[];
  themes: { term: string; mentions: number }[];
  records: {
    source: string;
    url: string | null;
    title: string;
    body: string;
    published_at: string | null;
    matched_terms: string[];
  }[];
  errors: { source: string; error: string }[];
};

export function ResearchWorkspace({
  instagramConnected,
  instagramError,
}: {
  instagramConnected: boolean;
  instagramError?: string;
}) {
  const [topic, setTopic] = useState('');
  const [urls, setUrls] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(instagramError || '');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(instagramConnected);

  async function research(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic, urls: urls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean) }),
      });
      const result = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(result.details)
          ? result.details.map((item: { source: string; error: string }) => `${item.source}: ${item.error}`).join('; ')
          : '';
        throw new Error([result.error || 'Research run failed.', detail].filter(Boolean).join(' '));
      }
      setReport(result as Report);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Research run failed.');
    } finally {
      setBusy(false);
    }
  }

  async function disconnectInstagram() {
    try {
      const response = await fetch('/api/integrations/instagram/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Could not disconnect Instagram.');
      setConnected(false);
      setReport(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not disconnect Instagram.');
    }
  }

  return (
    <main className="shell">
      <header className="top">
        <Link className="brand" href="/">SCI<span>.</span></Link>
        <span className="eyebrow">Smart Content Intelligence</span>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">Business research workspace</div>
          <h1>Turn accessible content<br />into useful signals.</h1>
          <p className="sub">Research a topic across public websites, RSS/Atom feeds, and an Instagram professional account you authorize.</p>
        </div>
        <div className="actions">
          {connected ? (
            <>
              <span className="pill">Instagram connected</span>
              <button className="btn" type="button" onClick={disconnectInstagram}>Disconnect</button>
            </>
          ) : (
            <a className="btn primary" href="/api/integrations/instagram/login">Connect Instagram ↗</a>
          )}
        </div>
      </section>

      <section className="panel research-panel">
        <div className="eyebrow">New research run</div>
        <form className="research-form" onSubmit={research}>
          <label className="field-label" htmlFor="topic">Topic, company, or research question</label>
          <input
            className="field"
            id="topic"
            maxLength={200}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. affordable home fitness equipment"
            required
            value={topic}
          />
          <label className="field-label" htmlFor="sources">Public website or RSS/Atom URLs (one per line, up to 5)</label>
          <textarea
            className="field source-input"
            id="sources"
            onChange={(event) => setUrls(event.target.value)}
            placeholder={'https://example.com/blog\nhttps://example.com/feed.xml'}
            value={urls}
          />
          <div className="form-footer">
            <span className="muted">
              {connected ? 'Your authorized Instagram account is included in each run.' : 'Connect Instagram to include your authorized professional account.'}
            </span>
            <button className="btn primary" disabled={busy} type="submit">{busy ? 'Collecting and analyzing…' : 'Run research'}</button>
          </div>
        </form>
        {error && <div className="notice danger" role="alert">{error}</div>}
      </section>

      <div className="notice">
        Each run fetches sources on demand and keeps results in this page only. This MVP does not search for usernames or access arbitrary accounts; Instagram access is limited to the account that authorizes the app.
      </div>

      {report && (
        <section className="section" aria-live="polite">
          <div className="section-head">
            <h2>Research report</h2>
            <span className="pill">{report.total_records} records · {report.matching_records} topic matches</span>
          </div>
          <div className="panel report-summary">
            <p>{report.overview}</p>
            {report.topic_terms.length > 0 && <div className="muted">Topic terms: {report.topic_terms.join(', ')}</div>}
          </div>

          {report.errors.length > 0 && (
            <div className="notice">
              <strong>Some sources could not be collected</strong>
              {report.errors.map((item) => <div className="source-error" key={`${item.source}:${item.error}`}>{item.source}: {item.error}</div>)}
            </div>
          )}

          <div className="section">
            <div className="section-head"><h2>Frequent themes in matching records</h2></div>
            {report.themes.length > 0 ? (
              <div className="theme-list">
                {report.themes.map((theme) => <span className="pill" key={theme.term}>{theme.term} · {theme.mentions}</span>)}
              </div>
            ) : <div className="empty">No topic-matching records to summarize yet.</div>}
          </div>

          <div className="section">
            <div className="section-head"><h2>Source records</h2></div>
            <div className="content">
              {report.records.map((record, index) => (
                <article className="content-card" key={`${record.source}:${record.url || index}`}>
                  <div className="eyebrow">{record.source}{record.published_at ? ` · ${record.published_at}` : ''}</div>
                  <div className="item-title" style={{ marginTop: 8 }}>{record.title}</div>
                  <p>{record.body || 'No text content was available.'}</p>
                  {record.matched_terms.length > 0 && <div className="muted">Matched: {record.matched_terms.join(', ')}</div>}
                  {record.url && <a href={record.url} target="_blank" rel="noreferrer">Open original ↗</a>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
