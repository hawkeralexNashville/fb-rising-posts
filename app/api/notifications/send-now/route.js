import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getResultsLimit(timeWindowHours) {
  if (timeWindowHours <= 2) return 5
  if (timeWindowHours <= 6) return 10
  if (timeWindowHours <= 12) return 15
  if (timeWindowHours <= 24) return 20
  return 30
}

function normalizeFacebookPost(post) {
  const reactions = post.likesCount || post.likes || post.reactionsCount || post.reactions || 0
  const comments = post.commentsCount || post.comments || post.numberOfComments || 0
  const shares = post.sharesCount || post.shares || 0
  return {
    post_id: post.postId || post.id || post.postUrl || post.url || '',
    post_url: post.postUrl || post.url || post.link || '',
    content_preview: (post.postText || post.text || post.message || post.body || '').slice(0, 500),
    reactions, comments, shares,
    total_interactions: reactions + comments + shares,
    posted_at: post.time || post.postTimestamp || post.timestamp || post.date || post.createdAt || post.postedAt || null,
    page_name: post.pageName || post.authorName || post.pageTitle || post.groupName || post.author?.name || '',
    post_type: post.type || post.postType || post.mediaType || '',
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildEmailHtml(streamName, posts, timeWindowHours) {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })
  const postRows = posts.map((p, i) => {
    const isEarly = (p.tags || []).includes('early_riser')
    const isViral = (p.tags || []).includes('viral')
    const badge = isEarly ? '<span style="display:inline-block;background:#fef3c7;color:#d97706;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:4px;">🔥 EARLY RISER</span>' : isViral ? '<span style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:4px;">⚡ VIRAL</span>' : ''
    return `
    <tr style="border-bottom: 1px solid #e2e8f0;${isEarly ? 'background-color:#fffbeb;' : ''}">
      <td style="padding: 16px 12px; vertical-align: top;">
        <div style="font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">#${i + 1}</div>
      </td>
      <td style="padding: 16px 12px; vertical-align: top;">
        ${badge}<div style="font-size: 14px; color: #1e293b; margin-bottom: 6px;${isEarly ? 'display:inline;' : ''}">${escapeHtml(p.content_preview.slice(0, 200))}${p.content_preview.length > 200 ? '…' : ''}</div>
        <div style="font-size: 12px; color: #94a3b8;">
          ${p.page_name ? `<span style="font-weight: 600;">${escapeHtml(p.page_name)}</span> · ` : ''}
          ${p.post_type ? `${p.post_type} · ` : ''}
          ${p.age_hours ? `${p.age_hours}h old` : ''}
        </div>
        ${p.post_url ? `<div style="margin-top: 6px;"><a href="${p.post_url}" style="color: #f97316; font-size: 12px; text-decoration: none;">View post →</a></div>` : ''}
      </td>
      <td style="padding: 16px 12px; vertical-align: top; text-align: right; white-space: nowrap;">
        <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${p.total_interactions.toLocaleString()}</div>
        <div style="font-size: 11px; color: #94a3b8;">interactions</div>
        ${p.velocity ? `<div style="font-size: 13px; font-weight: 600; color: #f97316; margin-top: 4px;">${Math.round(p.velocity).toLocaleString()}/hr</div>` : ''}
      </td>
    </tr>
  `}).join('')

  const earlyCount = posts.filter(p => (p.tags || []).includes('early_riser')).length

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    <div style="background: linear-gradient(135deg, #f97316, #e11d48); border-radius: 16px 16px 0 0; padding: 24px 28px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: white;">📈 Rising Posts</h1>
      <p style="margin: 6px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">${escapeHtml(streamName)} · ${now}</p>
    </div>
    <div style="background: white; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
      <div style="padding: 20px 28px 12px;">
        <p style="margin: 0; font-size: 14px; color: #64748b;">
          <strong style="color: #f97316;">${posts.length}</strong> rising post${posts.length !== 1 ? 's' : ''} in the last ${timeWindowHours} hours${earlyCount > 0 ? ` · <strong style="color: #d97706;">${earlyCount} early riser${earlyCount !== 1 ? 's' : ''}</strong> — act now` : ''}
        </p>
      </div>
      ${posts.length > 0 ? `<table style="width: 100%; border-collapse: collapse;">${postRows}</table>` : `<div style="padding: 32px 28px; text-align: center; color: #94a3b8;">No rising posts detected in this scan.</div>`}
      <div style="padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
        <a href="https://risingposts.com" style="font-size: 12px; color: #94a3b8; text-decoration: none;">risingposts.com</a>
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request) {
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

    const { streamId, emails, timeWindowHours, minInteractions } = await request.json()
    if (!streamId || !emails?.length) return NextResponse.json({ error: 'Missing streamId or emails' }, { status: 400 })

    // Get stream name
    const { data: stream } = await supabase.from('streams').select('name').eq('id', streamId).single()
    const streamName = stream?.name || 'Unknown Stream'

    // Get pages
    const { data: pages } = await supabase.from('monitored_pages').select('url').eq('stream_id', streamId)
    if (!pages?.length) return NextResponse.json({ error: 'No pages in this stream' }, { status: 400 })

    // Start Apify scan
    const resultsLimit = getResultsLimit(timeWindowHours)
    const newerThan = new Date(Date.now() - timeWindowHours * 3600000).toISOString()
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${process.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: pages.map(p => ({ url: p.url })),
          resultsLimit,
          newerThan,
        }),
      }
    )
    if (!apifyRes.ok) return NextResponse.json({ error: 'Failed to start Apify scan' }, { status: 502 })
    const apifyData = await apifyRes.json()
    const runId = apifyData.data?.id
    if (!runId) return NextResponse.json({ error: 'No run ID from Apify' }, { status: 500 })

    // Poll for completion (max 5 min)
    const maxWait = Date.now() + 300000
    let runData = null
    while (Date.now() < maxWait) {
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`)
      const statusData = await statusRes.json()
      const status = statusData.data?.status
      if (status === 'SUCCEEDED') { runData = statusData.data; break }
      if (status === 'FAILED' || status === 'ABORTED') return NextResponse.json({ error: `Apify scan ${status}` }, { status: 500 })
      await new Promise(r => setTimeout(r, 8000))
    }
    if (!runData) return NextResponse.json({ error: 'Scan timed out' }, { status: 504 })

    // Get results
    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${runData.defaultDatasetId}/items?token=${process.env.APIFY_API_TOKEN}&limit=500`)
    const rawPosts = await dataRes.json()

    // Normalize + filter rising (age-weighted algorithm)
    const normalized = rawPosts.map(p => normalizeFacebookPost(p)).filter(p => p.post_id)
    const nowMs = Date.now()
    const minVelocity = 50
    const rising = []

    function getAgeMultiplier(ageHours) {
      if (ageHours <= 0.5) return 4.0
      if (ageHours <= 1) return 3.0
      if (ageHours <= 2) return 2.0
      if (ageHours <= 4) return 1.5
      return 1.0
    }

    for (const post of normalized) {
      let ageHours = null
      if (post.posted_at) {
        ageHours = (nowMs - new Date(post.posted_at).getTime()) / 3600000
        if (ageHours > timeWindowHours || ageHours < 0) continue
      }
      if (post.total_interactions < minInteractions) continue
      const velocity = ageHours && ageHours > 0 ? post.total_interactions / ageHours : null
      const isRising = velocity ? velocity >= minVelocity : post.total_interactions >= minVelocity * 2
      if (!isRising) continue

      const ageMult = ageHours !== null ? getAgeMultiplier(ageHours) : 1.0
      const score = (velocity || 0) * ageMult
      const tags = []
      if (ageHours !== null && ageHours <= 2 && velocity && velocity >= minVelocity) tags.push('early_riser')
      if (velocity && velocity >= minVelocity * 5) tags.push('viral')

      rising.push({ ...post, velocity, age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null, score: Math.round(score), tags })
    }
    rising.sort((a, b) => (b.score || 0) - (a.score || 0))

    // Send email via SendGrid
    const subject = `📈 ${streamName}: ${rising.length} rising post${rising.length !== 1 ? 's' : ''}`
    const html = buildEmailHtml(streamName, rising, timeWindowHours)

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: emails.map(email => ({ email })) }],
        from: { email: 'noreply@risingposts.com', name: 'Rising Posts' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    })

    if (!sgRes.ok) {
      const sgErr = await sgRes.text()
      console.error('SendGrid error:', sgErr)
      return NextResponse.json({ error: `Email send failed: ${sgRes.status}` }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      risingCount: rising.length,
      totalScraped: normalized.length,
      emailsSentTo: emails,
      costUsd: runData.usageTotalUsd ?? 0,
    })
  } catch (err) {
    console.error('Send now error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
