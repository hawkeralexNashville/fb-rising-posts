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
    const relevanceBadge = p.relevance_score ? `<span style="display:inline-block;background:${p.relevance_score >= 8 ? '#dcfce7' : '#dbeafe'};color:${p.relevance_score >= 8 ? '#16a34a' : '#2563eb'};font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:4px;">🎯 ${p.relevance_score}/10</span>` : ''
    const angleHtml = p.relevance_angle ? `<div style="margin-top: 6px; padding: 6px 10px; background: #eef2ff; border-radius: 6px; font-size: 12px; color: #4338ca;">💡 <strong>Angle:</strong> ${escapeHtml(p.relevance_angle)}</div>` : ''
    return `
    <tr style="border-bottom: 1px solid #e2e8f0;${isEarly ? 'background-color:#fffbeb;' : ''}">
      <td style="padding: 16px 12px; vertical-align: top;">
        <div style="font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">#${i + 1}</div>
      </td>
      <td style="padding: 16px 12px; vertical-align: top;">
        ${badge}${relevanceBadge}<div style="font-size: 14px; color: #1e293b; margin-bottom: 6px;${badge || relevanceBadge ? 'display:inline;' : ''}">${escapeHtml(p.content_preview.slice(0, 200))}${p.content_preview.length > 200 ? '…' : ''}</div>
        <div style="font-size: 12px; color: #94a3b8;">
          ${p.page_name ? `<span style="font-weight: 600;">${escapeHtml(p.page_name)}</span> · ` : ''}
          ${p.post_type ? `${p.post_type} · ` : ''}
          ${p.age_hours ? `${p.age_hours}h old` : ''}
          ${p.relevance_reason ? ` · <span style="color: #6366f1;">${escapeHtml(p.relevance_reason)}</span>` : ''}
        </div>
        ${p.post_url ? `<div style="margin-top: 6px;"><a href="${p.post_url}" style="color: #f97316; font-size: 12px; text-decoration: none;">View post →</a></div>` : ''}
        ${angleHtml}
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

    // Get stream name + audience profile
    const { data: stream } = await supabase.from('streams').select('name, audience_profile').eq('id', streamId).single()
    const streamName = stream?.name || 'Unknown Stream'
    const audienceProfile = stream?.audience_profile || null

    // Get pages
    const { data: pages } = await supabase.from('monitored_pages').select('url').eq('stream_id', streamId)
    if (!pages?.length) return NextResponse.json({ error: 'No pages in this stream' }, { status: 400 })

    // Get user's own Apify token
    const { data: settingsRow } = await supabase.from('user_settings').select('apify_api_token').eq('user_id', user.id).single()
    const apifyApiToken = settingsRow?.apify_api_token
    if (!apifyApiToken) return NextResponse.json({ error: 'No Apify API key found. Add your key in Settings.' }, { status: 400 })

    // Start Apify scan
    const resultsLimit = getResultsLimit(timeWindowHours)
    const newerThan = new Date(Date.now() - timeWindowHours * 3600000).toISOString()
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${apifyApiToken}`,
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
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyApiToken}`)
      const statusData = await statusRes.json()
      const status = statusData.data?.status
      if (status === 'SUCCEEDED') { runData = statusData.data; break }
      if (status === 'FAILED' || status === 'ABORTED') return NextResponse.json({ error: `Apify scan ${status}` }, { status: 500 })
      await new Promise(r => setTimeout(r, 8000))
    }
    if (!runData) return NextResponse.json({ error: 'Scan timed out' }, { status: 504 })

    // Get results
    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${runData.defaultDatasetId}/items?token=${apifyApiToken}&limit=500`)
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

    // AI relevance scoring — filter to relevant posts only
    let emailPosts = rising
    let relevanceFiltered = 0
    if (audienceProfile && rising.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        const postSummaries = rising.slice(0, 30).map((p, i) => (
          `[${i}] ${p.page_name ? p.page_name + ': ' : ''}${(p.content_preview || '').slice(0, 200)}`
        )).join('\n')

        const prompt = `You are a relevance filter for a specific Facebook page and its audience.

ABOUT THE PAGE:
${audienceProfile}

TASK: Score each post below from 1-10 for how relevant it is to this page's audience.
Score guide:
- 8-10: Perfect fit. Direct match to core topics.
- 6-7: Good crossover. The audience would engage with this.
- 4-5: Weak connection. Probably not worth posting about.
- 1-3: Not relevant. Skip entirely.

POSTS TO SCORE:
${postSummaries}

Respond ONLY with valid JSON array. No markdown, no backticks.
Each item: {"i": post_index, "s": score_1_to_10, "r": "one line reason", "a": "suggested angle if score >= 6, otherwise null"}`

        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 3000, temperature: 0.3 }),
        })

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const raw = aiData.choices?.[0]?.message?.content || '[]'
          const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()
          const scores = JSON.parse(cleaned)

          // Attach scores and filter
          const scored = rising.map((post, i) => {
            const s = scores.find(x => x.i === i)
            return { ...post, relevance_score: s?.s ?? null, relevance_reason: s?.r ?? null, relevance_angle: s?.a ?? null }
          })
          emailPosts = scored.filter(p => p.relevance_score === null || p.relevance_score >= 6)
          relevanceFiltered = rising.length - emailPosts.length
          console.log(`Relevance: ${emailPosts.length} relevant, ${relevanceFiltered} filtered out`)
        }
      } catch (err) {
        console.error('Relevance scoring failed, sending all posts:', err.message)
      }
    }

    // Send email via SendGrid
    const subject = `📈 ${streamName}: ${emailPosts.length} rising post${emailPosts.length !== 1 ? 's' : ''}${relevanceFiltered > 0 ? ` (${relevanceFiltered} irrelevant filtered)` : ''}`
    const html = buildEmailHtml(streamName, emailPosts, timeWindowHours)

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
      risingCount: emailPosts.length,
      totalRising: rising.length,
      relevanceFiltered,
      totalScraped: normalized.length,
      emailsSentTo: emails,
      costUsd: runData.usageTotalUsd ?? 0,
    })
  } catch (err) {
    console.error('Send now error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
