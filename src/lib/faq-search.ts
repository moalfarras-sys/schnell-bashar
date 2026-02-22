import { faqDatabase, type FaqEntry } from "@/data/faq-database";

function score(text: string, entry: FaqEntry) {
  const lower = text.toLowerCase();
  let points = 0;
  if (entry.question.toLowerCase().includes(lower)) points += 4;
  if (entry.answer.toLowerCase().includes(lower)) points += 2;
  for (const keyword of entry.keywords) {
    if (lower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(lower)) points += 3;
  }
  return points;
}

export function searchFaq(query: string, limit = 3) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return faqDatabase
    .map((entry) => ({ entry, points: score(q, entry) }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((row) => row.entry);
}
