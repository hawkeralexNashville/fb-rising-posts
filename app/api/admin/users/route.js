import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Auth with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin
    const { data: settings } = await supabase.from('user_settings').select('is_admin').eq('user_id', user.id).single()
    if (!settings?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Use service role to read auth.users
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get all users
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    // Get scan stats per user
    const { data: scans } = await adminClient.from('saved_scans').select('user_id, id, created_at')
    
    // Get streams per user
    const { data: streams } = await adminClient.from('streams').select('user_id, id')

    // Build scan count map
    const scanCountMap = {}
    if (scans) {
      for (const scan of scans) {
        if (!scanCountMap[scan.user_id]) scanCountMap[scan.user_id] = 0
        scanCountMap[scan.user_id]++
      }
    }

    // Build stream count map
    const streamCountMap = {}
    if (streams) {
      for (const stream of streams) {
        if (!streamCountMap[stream.user_id]) streamCountMap[stream.user_id] = 0
        streamCountMap[stream.user_id]++
      }
    }

    // Combine
    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      scans: scanCountMap[u.id] || 0,
      streams: streamCountMap[u.id] || 0,
    }))

    // Sort by most recent signup
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return NextResponse.json({ users: result, total: result.length })
  } catch (err) {
    console.error('Admin error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
