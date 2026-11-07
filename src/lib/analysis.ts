export type ResearchRecord = {
  source: string;
  url: string | null;
  title: string;
  body: string;
  published_at: string | null;
};

const stopWords = new Set([
  'about','after','again','also','among','been','before','being','between','both','could','does','doing',
  'during','each','from','have','having','here','into','itself','more','most','other','over','same','some',
  'such','than','that','their','them','then','there','these','they','this','those','through','under','very',
  'what','when','where','which','while','with','would','your','will','were','them','they','just','only',
  'https','http','www','com','the','and','for','are','but','not','you','all','can','has','was','our',
  'out','use','its','get','how','who','why','his','her','she','him','his','per','via',
]);

function terms(text: string) {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{1,}/g) || [];
}

export function analyzeResearch(topic: string, records: ResearchRecord[]) {
  const topicTerms = [...new Set(terms(topic).filter((term) => !stopWords.has(term)))];
  const ranked = records.map((record) => {
    const searchable = new Set(terms(`${record.title} ${record.body}`));
    const matchedTerms = topicTerms.filter((term) => searchable.has(term));
    return { ...record, matched_terms: matchedTerms, relevance: matchedTerms.length };
  }).sort((a, b) => b.relevance - a.relevance || (b.published_at || '').localeCompare(a.published_at || ''));
  const matchingCount = ranked.filter((record) => record.relevance > 0).length;
  const wordCounts = new Map<string, number>();
  const analysisRecords = ranked.filter((record) => record.relevance > 0);
  for (const record of analysisRecords) {
    for (const term of terms(`${record.title} ${record.body}`)) {
      if (term.length < 3 || stopWords.has(term) || topicTerms.includes(term)) continue;
      wordCounts.set(term, (wordCounts.get(term) || 0) + 1);
    }
  }
  const themes = [...wordCounts.entries()]
    .map(([term, mentions]) => ({ term, mentions }))
    .sort((a, b) => b.mentions - a.mentions || a.term.localeCompare(b.term))
    .slice(0, 10);
  const overview = records.length === 0
    ? 'No records were collected. Add public website or RSS/Atom URLs, or connect an eligible Instagram professional account.'
    : `${matchingCount} of ${records.length} collected records mention ${topicTerms.length ? `one or more terms from “${topic}”` : 'the research topic'}. Themes are ranked by word frequency in matching records; they are signals for review, not AI conclusions.`;
  return {
    overview,
    total_records: records.length,
    matching_records: matchingCount,
    topic_terms: topicTerms,
    themes,
    records: ranked.slice(0, 100).map((record) => ({ ...record, body: record.body.slice(0, 1800) })),
  };
}
