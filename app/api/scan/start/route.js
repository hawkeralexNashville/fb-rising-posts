import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function parseApifyError(status, body) {
  const msg = (body?.error?.message || body?.error || body?.message || '').toLowerCase()

  if (status === 402 || msg.includes('usage') || msg.includes('credit') || msg.includes('limit exceeded') || msg.includes('payment') || msg.includes('billing') || msg.includes('subscription')) {
    return 'Apify account out of credits. Add funds at apify.com/billing'
  }
  if (status === 401 || status === 403 || msg.includes('token') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return 'Invalid Apify API token. Check your token in Settings > Integrations at apify.com'
  }
  if (status === 429 || msg.includes('rate')) {
    return 'Apify rate limit hit. Wait a few minutes and try again.'
  }
  if (status >= 500) {
    return 'Apify servers are having issues. Try again in a few minutes.'
  }
  return body?.error?.message || body?.error || 'Failed to start Apify scraper. Check your Apify account.'
}

export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pageUrls } = await request.json()

    if (!pageUrls?.length) {
      return NextResponse.json({ error: 'No page URLs provided' }, { status: 400 })
    }

    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'Apify API token not configured. Add APIFY_API_TOKEN to your environment variables.' }, { status: 500 })
    }

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${process.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: pageUrls.map((url) => ({ url })),
          resultsLimit: 30,
        }),
      }
    )

    if (!apifyRes.ok) {
      let errBody
      try { errBody = await apifyRes.json() } catch { errBody = {} }
      const userMessage = parseApifyError(apifyRes.status, errBody)
      console.error('Apify start error:', apifyRes.status, errBody)
      return NextResponse.json({ error: userMessage, userMessage }, { status: 502 })
    }

    const apifyData = await apifyRes.json()
    const runId = apifyData.data?.id

    if (!runId) {
      return NextResponse.json({ error: 'No run ID returned from Apify' }, { status: 500 })
    }

    return NextResponse.json({ runId })
  } catch (err) {
    console.error('Scan start error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}