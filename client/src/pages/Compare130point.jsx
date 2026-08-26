import ComparePage from './ComparePage.jsx'

export default function Compare130point() {
  return (
    <ComparePage
      competitor="130point"
      path="/compare/130point"
      title="CollectrBrief vs 130point: 2026 Comparison"
      description="Compare CollectrBrief vs 130point for finding real eBay sold prices on sports cards and collectibles. See which fits a manual lookup tool vs. an automated weekly brief."
      intro="130point is a free tool for manually searching eBay sold listings, including best-offer sales. CollectrBrief automates that same lookup for your specific items and adds AI-written context on what the price movement means, delivered weekly without you having to search anything."
      rows={[
        { feature: 'How it works', us: 'You set a watchlist once; prices and trends arrive automatically every week.', them: 'You manually search each item, each time you want an update.' },
        { feature: 'Time cost', us: 'Zero ongoing effort after setup — one email to read.', them: '20–30 minutes per session if you check multiple items regularly.' },
        { feature: 'AI commentary', us: 'Buy / hold / watch take written for each tracked item.', them: 'Raw sold-listing data only, no interpretation.' },
        { feature: 'Trend tracking', us: 'Week-over-week price direction shown automatically.', them: 'You compare past searches yourself to spot trends.' },
        { feature: 'Data sources', us: 'eBay, Goldin, TCGplayer, Lelands, and major auction houses.', them: 'eBay sold and best-offer listings.' },
        { feature: 'Starting price', us: '$9.99/month · 14-day free trial', them: 'Free' },
      ]}
      honestTitle="When 130point might be the better fit"
      honestBody="130point is free and excellent for a one-off lookup — checking what a single card just sold for right now. If you only need occasional spot-checks rather than an ongoing weekly watch on a specific set of items, 130point's free manual search may be all you need. CollectrBrief earns its price by removing the manual searching entirely for people who check regularly."
    />
  )
}
