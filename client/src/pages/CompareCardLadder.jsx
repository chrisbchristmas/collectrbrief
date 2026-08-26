import ComparePage from './ComparePage.jsx'

export default function CompareCardLadder() {
  return (
    <ComparePage
      competitor="Card Ladder"
      path="/compare/card-ladder"
      title="CollectrBrief vs Card Ladder: 2026 Comparison"
      description="Compare CollectrBrief vs Card Ladder for tracking sports card and collectible prices. See which fits collectors who want personalized weekly briefs vs. a self-serve price database."
      intro="Card Ladder is a large sold-price database and portfolio tracker you search and browse yourself. CollectrBrief is narrower on purpose — it doesn't ask you to go look anything up. It watches the specific items you tell it about and sends you a written weekly brief with real prices and an AI buy/hold/watch take, so the work of checking happens automatically instead of manually."
      rows={[
        { feature: 'How you get data', us: 'Delivered automatically every Sunday — no login needed to see your update.', them: 'You log in and search/browse the database yourself.' },
        { feature: 'Personalization', us: 'Tracks your specific watchlist items (up to 15) by name, player, set, and grade.', them: 'Large general database covering many items; portfolio tracking available as a feature.' },
        { feature: 'AI commentary', us: 'Plain-English buy / hold / watch take written for each item, every week.', them: 'Charts and historical data; commentary is not a core feature.' },
        { feature: 'Data sources', us: 'Real sold prices from eBay, Goldin, TCGplayer, Lelands, and major auction houses.', them: '100M+ historical sales from eBay, Goldin, Heritage, Fanatics, and more.' },
        { feature: 'Format', us: 'Weekly email brief — read it in your inbox, no dashboard required.', them: 'Web dashboard/app you visit to look things up.' },
        { feature: 'Starting price', us: '$9.99/month · 14-day free trial', them: 'See their website for current pricing.' },
      ]}
      honestTitle="When Card Ladder might be the better fit"
      honestBody="If you actively trade across a large, changing inventory and want to search any card on demand, browse trend charts, or build a broad portfolio view, Card Ladder's larger database and self-serve tools may serve you better. CollectrBrief is built for a smaller, curated watchlist you check passively — plenty of collectors use both."
    />
  )
}
