import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 })

    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`
    )
    const data = await res.json()
    const status = data.data?.status || 'UNKNOWN'
    const costUsd = data.data?.usageTotalUsd ?? null

    return NextResponse.json({ status, costUsd })
  } catch (err) {
    console.error('Status check error:', err)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
