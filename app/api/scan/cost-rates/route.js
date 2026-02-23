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
      .select('cost_usd, total_scraped, time_window, scan_type, created_at')
      .gt('cost_usd', 0)
      .gt('total_scraped', 0)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!scans || scans.length === 0) {
      return NextResponse.json({ rates: null, scanCount: 0, message: 'No cost data yet' })
    }

    // Bucket by time window — use cost_per_result (always accurate, no page count guessing)
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
      if (buckets[type][bucket]) {
        buckets[type][bucket].push(scan.cost_usd / scan.total_scraped)
      }
    }

    // Average cost-per-result for each bucket
    const rates = { pages: {}, groups: {} }
    for (const type of ['pages', 'groups']) {
      for (const [bucket, entries] of Object.entries(buckets[type])) {
        if (entries.length > 0) {
          rates[type][bucket] = {
            costPerResult: entries.reduce((s, v) => s + v, 0) / entries.length,
            sampleSize: entries.length,
          }
        }
      }
    }

    // Overall fallback
    const allPages = scans.filter(s => s.scan_type !== 'groups')
    const allGroups = scans.filter(s => s.scan_type === 'groups')

    return NextResponse.json({
      rates,
      overall: {
        pages: allPages.length > 0
          ? allPages.reduce((s, sc) => s + sc.cost_usd, 0) / allPages.reduce((s, sc) => s + sc.total_scraped, 0)
          : null,
        groups: allGroups.length > 0
          ? allGroups.reduce((s, sc) => s + sc.cost_usd, 0) / allGroups.reduce((s, sc) => s + sc.total_scraped, 0)
          : null,
      },
      scanCount: scans.length,
    })
  } catch (err) {
    console.error('Cost rates error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
