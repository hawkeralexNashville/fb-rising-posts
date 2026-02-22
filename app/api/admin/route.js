import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Auth with user's token to verify identity
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if admin
    const { data: adminRow } = await userClient.from('admin_users').select('user_id').eq('user_id', user.id).single()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Use service role to query all users
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get all users from auth
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    // Get scan stats per user
    const { data: scanStats } = await adminClient
      .from('saved_scans')
      .select('user_id, cost_usd')

    // Aggregate stats
    const statsMap = {}
    if (scanStats) {
      for (const scan of scanStats) {
        if (!statsMap[scan.user_id]) statsMap[scan.user_id] = { scan_count: 0, total_cost: 0 }
        statsMap[scan.user_id].scan_count++
        statsMap[scan.user_id].total_cost += (scan.cost_usd || 0)
      }
    }

    // Build response
    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
      scan_count: statsMap[u.id]?.scan_count || 0,
      total_cost: statsMap[u.id]?.total_cost || 0,
    }))

    // Sort by most recent signup first
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return NextResponse.json({ users: result })
  } catch (err) {
    console.error('Admin API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
