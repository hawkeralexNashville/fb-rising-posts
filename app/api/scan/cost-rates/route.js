import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
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

    // Pull all saved scans that have cost data
    const { data: scans } = await supabase
      .from('saved_scans')
      .select('cost_usd, total_scraped, time_window, scan_type, stream_id, created_at')
      .gt('cost_usd', 0)
      .gt('total_scraped', 0)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!scans || scans.length === 0) {
      return NextResponse.json({ rates: null, scanCount: 0, message: 'No cost data yet' })
    }

    // We need page counts — pull stream page counts for scans that have stream_id
    const streamIds = [...new Set(scans.filter(s => s.stream_id).map(s => s.stream_id))]
    let pageCounts = {}
    if (streamIds.length > 0) {
      const { data: pages } = await supabase
        .from('monitored_pages')
        .select('stream_id')
        .in('stream_id', streamIds)
      if (pages) {
        for (const p of pages) {
          pageCounts[p.stream_id] = (pageCounts[p.stream_id] || 0) + 1
        }
      }
    }

    // Calculate cost per page per time window bucket
    const buckets = {
      pages: { '1-2h': [], '6h': [], '12h': [], '24h': [], '48h+': [] },
      groups: { '6h': [], '12h': [], '24h': [], '48h+': [] },
    }

    function getBucket(tw, type) {
      if (type === 'groups') {
        if (tw <= 6) return '6h'
        if (tw <= 12) return '12h'
        if (tw <= 24) return '24h'
        return '48h+'
      }
      if (tw <= 2) return '1-2h'
      if (tw <= 6) return '6h'
      if (tw <= 12) return '12h'
      if (tw <= 24) return '24h'
      return '48h+'
    }

    for (const scan of scans) {
      const type = scan.scan_type === 'groups' ? 'groups' : 'pages'
      const bucket = getBucket(scan.time_window, type)
      const pageCount = scan.stream_id ? (pageCounts[scan.stream_id] || 1) : 1
      const costPerPage = scan.cost_usd / pageCount

      if (buckets[type][bucket]) {
        buckets[type][bucket].push({
          costPerPage,
          costPerResult: scan.cost_usd / scan.total_scraped,
          totalCost: scan.cost_usd,
          pageCount,
          totalScraped: scan.total_scraped,
        })
      }
    }

    // Average each bucket
    const rates = { pages: {}, groups: {} }
    for (const type of ['pages', 'groups']) {
      for (const [bucket, entries] of Object.entries(buckets[type])) {
        if (entries.length > 0) {
          rates[type][bucket] = {
            avgCostPerPage: entries.reduce((s, e) => s + e.costPerPage, 0) / entries.length,
            avgCostPerResult: entries.reduce((s, e) => s + e.costPerResult, 0) / entries.length,
            sampleSize: entries.length,
          }
        }
      }
    }

    // Also compute an overall fallback rate
    const allPages = scans.filter(s => s.scan_type !== 'groups')
    const allGroups = scans.filter(s => s.scan_type === 'groups')

    const overallPageRate = allPages.length > 0
      ? allPages.reduce((s, sc) => s + sc.cost_usd, 0) / allPages.reduce((s, sc) => s + sc.total_scraped, 0)
      : null
    const overallGroupRate = allGroups.length > 0
      ? allGroups.reduce((s, sc) => s + sc.cost_usd, 0) / allGroups.reduce((s, sc) => s + sc.total_scraped, 0)
      : null

    return NextResponse.json({
      rates,
      overall: {
        pages: overallPageRate,
        groups: overallGroupRate,
      },
      scanCount: scans.length,
    })
  } catch (err) {
    console.error('Cost rates error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
