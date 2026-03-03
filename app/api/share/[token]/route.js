import { createClient } from '@supabase/supabase-js'

export async function GET(req, { params }) {
  const { token } = await params

  // Use anon key — RLS policy allows public SELECT on shared_scans
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data, error } = await supabase
    .from('shared_scans')
    .select('*')
    .eq('share_token', token)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Share not found' }, { status: 404 })
  }

  return Response.json(data)
}
