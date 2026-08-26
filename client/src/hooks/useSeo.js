import { useEffect } from 'react'

/**
 * Sets document title + meta description/canonical/OG tags client-side for a route.
 * This SPA has no react-helmet / SSR — index.html's static tags only cover "/".
 * These updates apply after hydration; they are visible to real browsers and to
 * crawlers that render JS (Googlebot does), but a raw curl of the HTML will still
 * show the static index.html defaults. Good enough for SEO purposes here.
 */
export default function useSeo({ title, description, path }) {
  useEffect(() => {
    if (title) document.title = title

    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        if (selector.includes('property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)[1])
        } else if (selector.includes('name=')) {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)[1])
        }
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    if (description) {
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[property="og:description"]', 'content', description)
      setMeta('meta[name="twitter:description"]', 'content', description)
    }
    if (title) {
      setMeta('meta[property="og:title"]', 'content', title)
      setMeta('meta[name="twitter:title"]', 'content', title)
    }
    if (path) {
      let canonical = document.querySelector('link[rel="canonical"]')
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      canonical.setAttribute('href', `https://www.collectrbrief.com${path}`)
    }
  }, [title, description, path])
}
