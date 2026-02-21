import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Apify run status
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to check run status' }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ status: data.data?.status || 'UNKNOWN' })
  } catch (err) {
    console.error('Status check error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
