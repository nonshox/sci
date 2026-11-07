import { cookies } from 'next/headers';
import { ResearchWorkspace } from '@/components/research-workspace';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ instagram_error?: string }>;
}) {
  const [cookieStore, params] = await Promise.all([cookies(), searchParams]);
  return (
    <ResearchWorkspace
      instagramConnected={Boolean(cookieStore.get('sci_instagram_token')?.value)}
      instagramError={params.instagram_error}
    />
  );
}
