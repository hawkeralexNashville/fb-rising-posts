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

    const { data: settings } = await supabase.from('user_settings').select('is_admin').eq('user_id', user.id).single()
    if (!settings?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured. Add it in Vercel env vars and redeploy.' }, { status: 500 })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Try to get users - the admin API requires the legacy JWT service_role key
    let users = []
    try {
      const { data, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      if (usersError) throw usersError
      users = data?.users || []
    } catch (authErr) {
      console.error('auth.admin.listUsers error:', authErr.message || authErr)
      return NextResponse.json({ 
        error: `Cannot list users. Make sure you're using the legacy service_role JWT key (starts with eyJ...) from Supabase > Settings > API > Legacy tab. Error: ${authErr.message}` 
      }, { status: 500 })
    }

    const { data: scans } = await adminClient.from('saved_scans').select('user_id, id')
    const { data: streams } = await adminClient.from('streams').select('user_id, id')

    const scanCountMap = {}
    if (scans) { for (const s of scans) { scanCountMap[s.user_id] = (scanCountMap[s.user_id] || 0) + 1 } }

    const streamCountMap = {}
    if (streams) { for (const s of streams) { streamCountMap[s.user_id] = (streamCountMap[s.user_id] || 0) + 1 } }

    const result = users.map(u => ({
      id: u.id,
      email: u.email || 'Unknown',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      scans: scanCountMap[u.id] || 0,
      streams: streamCountMap[u.id] || 0,
    }))

    result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

    return NextResponse.json({ users: result, total: result.length })
  } catch (err) {
    console.error('Admin error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
