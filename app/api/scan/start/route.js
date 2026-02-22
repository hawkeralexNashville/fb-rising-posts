import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function parseApifyError(status, body) {
  const msg = (body?.error?.message || body?.error || body?.message || '').toLowerCase()
  if (status === 402 || msg.includes('usage') || msg.includes('credit') || msg.includes('limit exceeded') || msg.includes('payment') || msg.includes('billing') || msg.includes('subscription')) return 'Apify account out of credits. Add funds at apify.com/billing'
  if (status === 401 || status === 403 || msg.includes('token') || msg.includes('unauthorized') || msg.includes('forbidden')) return 'Invalid Apify API token. Check your token in Settings > Integrations at apify.com'
  if (status === 429 || msg.includes('rate')) return 'Apify rate limit hit. Wait a few minutes and try again.'
  if (status >= 500) return 'Apify servers are having issues. Try again in a few minutes.'
  return body?.error?.message || body?.error || 'Failed to start Apify scraper. Check your Apify account.'
}

function getResultsLimit(timeWindowHours, scanType) {
  if (scanType === 'groups') {
    // Groups need more posts — we're filtering by engagement, not velocity
    if (timeWindowHours <= 6) return 50
    if (timeWindowHours <= 12) return 75
    if (timeWindowHours <= 24) return 100
    if (timeWindowHours <= 48) return 150
    return 200
  }
  if (timeWindowHours <= 1) return 5
  if (timeWindowHours <= 2) return 5
  if (timeWindowHours <= 6) return 10
  if (timeWindowHours <= 12) return 15
  if (timeWindowHours <= 24) return 20
  return 30
}

// Platform-specific Apify actor configs
function getActorConfig(platform, pageUrls, resultsLimit, timeWindowHours) {
  switch (platform) {
    case 'x':
      // Extract handles from URLs where possible
      const handles = pageUrls.map(url => {
        const match = url.match(/(?:x\.com|twitter\.com)\/(@?[\w]+)/i)
        return match ? match[1].replace('@', '') : null
      }).filter(Boolean)
      const startUrls = pageUrls.filter(url => url.startsWith('http'))
      return {
        actorId: 'apidojo~tweet-scraper',
        input: {
          ...(startUrls.length > 0 ? { startUrls } : {}),
          ...(handles.length > 0 ? { twitterHandles: handles } : {}),
          maxItems: resultsLimit,
        },
      }
    case 'reddit':
      return {
        actorId: 'trudax~reddit-scraper',
        input: {
          startUrls: pageUrls.map((url) => ({ url })),
          maxPostCount: resultsLimit,
          maxComments: 0,
          sort: 'new',
        },
      }
    case 'facebook':
    default:
      // Calculate newerThan based on actual time window
      const newerThan = new Date(Date.now() - timeWindowHours * 3600000).toISOString()
      return {
        actorId: 'apify~facebook-posts-scraper',
        input: {
          startUrls: pageUrls.map((url) => ({ url })),
          resultsLimit,
          newerThan,
        },
      }
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pageUrls, timeWindowHours, platform = 'facebook', scanType = 'rising' } = await request.json()

    if (!pageUrls?.length) return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
    if (!process.env.APIFY_API_TOKEN) return NextResponse.json({ error: 'Apify API token not configured.' }, { status: 500 })

    const resultsLimit = getResultsLimit(timeWindowHours || 24, scanType)
    const { actorId, input } = getActorConfig(platform, pageUrls, resultsLimit, timeWindowHours || 24)

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${process.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    )

    if (!apifyRes.ok) {
      let errBody; try { errBody = await apifyRes.json() } catch { errBody = {} }
      const userMessage = parseApifyError(apifyRes.status, errBody)
      console.error('Apify start error:', apifyRes.status, errBody)
      return NextResponse.json({ error: userMessage, userMessage }, { status: 502 })
    }

    const apifyData = await apifyRes.json()
    const runId = apifyData.data?.id
    if (!runId) return NextResponse.json({ error: 'No run ID returned from Apify' }, { status: 500 })

    return NextResponse.json({ runId, resultsLimit, platform })
  } catch (err) {
    console.error('Scan start error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
