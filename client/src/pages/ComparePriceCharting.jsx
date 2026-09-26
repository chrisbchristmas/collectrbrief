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
        { feature: 'Category coverage', us: 'Sports cards, Pokémon, comics, coins, video games, memorabilia, and more.', them: 'Very broad — video games, cards, comics, and more.' },
        { feature: 'AI commentary', us: 'Buy / hold / watch take written for each tracked item, every week.', them: 'Price guide numbers; no personalized commentary.' },
        { feature: 'Deal alerts', us: 'Automated — flagged directly in your weekly brief when prices dip.', them: 'Deal Alerts (Collector tier, $6/mo).' },
        { feature: 'Grading guidance', us: 'Automated recommendation + calculator using your item\'s real premium data.', them: 'Grading Recommendations (Collector tier, $6/mo).' },
        { feature: 'Lot / bundle pricing', us: 'Included — select any watchlist items for a combined value.', them: 'Lot Value Calculator (Collector tier, $6/mo).' },
        { feature: 'Personalization', us: 'Tracks your named watchlist items specifically (up to 15).', them: 'General lookup tool; you search whatever you want to check.' },
        { feature: 'Update cadence', us: 'Fresh sold-price pull every week, delivered automatically.', them: 'Price guide updates on their own internal schedule.' },
        { feature: 'Starting price', us: '$9.99/month · 14-day free trial', them: 'Free · $6/mo Collector tier · $49/mo Legendary tier' },
      ]}
      honestTitle="When PriceCharting might be the better fit"
      honestBody="If you need to look up an item you don't already track, or want deal alerts and grading recommendations across an entire browsing session rather than a fixed watchlist, PriceCharting's general-purpose guide may serve you better. CollectrBrief is built for a focused, recurring watch on the specific items you already own or are considering — including video games."
    />
  )
}
