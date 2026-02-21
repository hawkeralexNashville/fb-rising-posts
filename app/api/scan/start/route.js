import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Verify user auth
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

    // Start Apify Facebook Posts Scraper
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${process.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: pageUrls.map((url) => ({ url })),
          resultsLimit: 30, // Last ~30 posts per page
        }),
      }
    )

    if (!apifyRes.ok) {
      const err = await apifyRes.text()
      console.error('Apify start error:', err)
      return NextResponse.json({ error: 'Failed to start Apify scraper' }, { status: 500 })
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
