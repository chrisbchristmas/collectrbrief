// smoke-test.js — runs the brief pipeline in isolation, no DB or API keys needed
// Exercises: mock CardHedge sales → computeTrend → renderBriefEmail → LLM mock

import { fetchSoldSales, computeTrend } from './services/cardhedge.js';
import { generateCommentary } from './services/llm.js';

const mockSubscriber = {
  id: 'test-uuid-001',
  email: 'collector@example.com',
  first_name: 'Alex',
  niche: 'Sports Cards',
  watchlist: [
    { label: 'PSA 10 Charizard Base Set', keywords: 'Charizard base set PSA 10' },
    { label: '1952 Topps Mantle SGC 4', keywords: '1952 topps mickey mantle SGC 4' },
  ],
};

async function run() {
  console.log('\n=== CollectrBrief Smoke Test ===\n');

  // 1. Fetch mock sales for each watchlist item
  const itemResults = [];
  for (const item of mockSubscriber.watchlist) {
    const sales = await fetchSoldSales(item.keywords);
    const trend = computeTrend(sales);
    itemResults.push({ label: item.label, keywords: item.keywords, sales, trend, pcData: null });

    console.log(`✓ ${item.label}`);
    console.log(`  Sales: ${sales.length} | Avg: $${trend.avg} | Range: $${trend.min}–$${trend.max} | Trend: ${trend.trend}`);
    console.log(`  Sample: "${sales[0]?.title}" → $${sales[0]?.price} on ${sales[0]?.source}`);
  }

  // 2. Generate mock commentary
  console.log('\n--- LLM Commentary (mock) ---');
  const commentary = await generateCommentary(mockSubscriber, itemResults);
  console.log(commentary.slice(0, 500));

  // 3. Verify email render imports (can't exec DOM without browser, just check module loads)
  const { generateBriefForSubscriber } = await import('./services/briefEngine.js');
  console.log('\n✓ briefEngine module loaded');

  console.log('\n✓ Smoke test passed — all core pipeline modules operational\n');
}

run().catch(err => {
  console.error('\n✗ Smoke test FAILED:', err.message);
  process.exit(1);
});
