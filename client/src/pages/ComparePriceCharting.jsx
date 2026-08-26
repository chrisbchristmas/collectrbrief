import ComparePage from './ComparePage.jsx'

export default function ComparePriceCharting() {
  return (
    <ComparePage
      competitor="PriceCharting"
      path="/compare/pricecharting"
      title="CollectrBrief vs PriceCharting: 2026 Comparison"
      description="Compare CollectrBrief vs PriceCharting for tracking sports card, Pokémon, comic, and video game prices. See which fits a static price guide vs. a personalized weekly brief."
      intro="PriceCharting is a broad price-guide and collection-tracking site covering games, cards, comics, and more, updated on their own schedule. CollectrBrief is a personalized, proactive service — it pushes a written weekly brief on your specific items straight to your inbox instead of you visiting a site to look a price up."
      rows={[
        { feature: 'How it works', us: 'Weekly brief delivered by email — nothing to check manually.', them: 'A price-guide site you visit and search when you want a number.' },
        { feature: 'Category coverage', us: 'Sports cards, Pokémon, comics, coins, memorabilia, and more.', them: 'Very broad — video games, cards, comics, and more.' },
        { feature: 'AI commentary', us: 'Buy / hold / watch take written for each tracked item, every week.', them: 'Price guide numbers; no personalized commentary.' },
        { feature: 'Personalization', us: 'Tracks your named watchlist items specifically (up to 15).', them: 'General lookup tool; you search whatever you want to check.' },
        { feature: 'Update cadence', us: 'Fresh sold-price pull every week, delivered automatically.', them: 'Price guide updates on their own internal schedule.' },
        { feature: 'Starting price', us: '$9.99/month · 14-day free trial', them: 'See their website for current pricing.' },
      ]}
      honestTitle="When PriceCharting might be the better fit"
      honestBody="If you need a broad price guide across many categories — including video games, which CollectrBrief doesn't cover — or want to look up an item you don't already track, PriceCharting's general-purpose guide may serve you better. CollectrBrief is built for a focused, recurring watch on the specific items you already own or are considering."
    />
  )
}
