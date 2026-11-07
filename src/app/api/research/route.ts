import { NextRequest, NextResponse } from 'next/server';
import { analyzeResearch, type ResearchRecord } from '@/lib/analysis';
import { fetchInstagram } from '@/lib/instagram';
import { fetchWebsite } from '@/lib/sources';

export const runtime = 'nodejs';
export const maxDuration = 60;

type WebsiteResult = { url: string; records: ResearchRecord[]; error?: string };

export async function POST(request: NextRequest) {
  let body: { topic?: unknown; urls?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!topic || topic.length > 200) {
    return NextResponse.json({ error: 'Enter a research topic (max 200 characters).' }, { status: 400 });
  }
  if (body.urls !== undefined && (!Array.isArray(body.urls) || body.urls.some((url) => typeof url !== 'string'))) {
    return NextResponse.json({ error: 'Sources must be a list of URL strings.' }, { status: 400 });
  }
  const urls = [...new Set(((body.urls as string[] | undefined) || []).map((url) => url.trim()).filter(Boolean))];
  if (urls.length > 5) {
    return NextResponse.json({ error: 'Add no more than five website or feed URLs per research run.' }, { status: 400 });
  }

  const websiteResults: WebsiteResult[] = await Promise.all(urls.map(async (url) => {
    try {
      const items = await fetchWebsite(url);
      return {
        url,
        records: items.map((item) => ({
          source: new URL(url).hostname,
          url: item.url || null,
          title: item.title || 'Untitled item',
          body: item.body || '',
          published_at: item.published_at || null,
        })),
      };
    } catch (error) {
      return { url, records: [], error: error instanceof Error ? error.message : 'Source collection failed.' };
    }
  }));
  const records = websiteResults.flatMap((result) => result.records);
  const errors = websiteResults.flatMap((result) => result.error ? [{ source: result.url, error: result.error }] : []);

  const tokenCookie = request.cookies.get('sci_instagram_token')?.value;
  if (tokenCookie) {
    try {
      const instagram = await fetchInstagram(tokenCookie);
      records.push(...instagram.items.map((item) => ({
        source: `Instagram @${instagram.account}`,
        url: item.url || null,
        title: item.title || 'Instagram post',
        body: item.body || '',
        published_at: item.published_at || null,
      })));
    } catch (error) {
      errors.push({ source: 'Instagram', error: error instanceof Error ? error.message : 'Instagram collection failed.' });
    }
  }

  if (records.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: 'No sources could be collected.', details: errors }, { status: 502 });
  }
  return NextResponse.json({ ...analyzeResearch(topic, records), errors });
}
