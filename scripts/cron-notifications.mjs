#!/usr/bin/env node

// This script runs via GitHub Actions on a schedule.
// It checks for due stream notifications, runs Apify scans, and sends email reports via SendGrid.
//
// Required env vars (set as GitHub Actions secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APIFY_API_TOKEN, SENDGRID_API_KEY

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const SENDGRID_KEY = process.env.SENDGRID_API_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !APIFY_TOKEN || !SENDGRID_KEY) {
  console.error('Missing required env vars')
  process.exit(1)
}

// ─── Supabase helpers ───
async function supabaseQuery(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase ${path}: ${res.status} ${err}`)
  }
  return res.json()
}

// ─── Get due notifications ───
function parseTimeToHour(timeStr) {
  // Parse "8:00 AM" -> 8, "2:00 PM" -> 14, "12:00 PM" -> 12, "12:00 AM" -> 0
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let h = parseInt(match[1])
  const p = match[3].toUpperCase()
  if (p === 'PM' && h !== 12) h += 12
  if (p === 'AM' && h === 12) h = 0
  return h
}

function isDayAllowed(nowCST, sendDays) {
  // sendDays: array of 0-6 (0=Sun, 6=Sat). If null/empty, all days allowed.
  if (!sendDays || sendDays.length === 0) return true
  return sendDays.includes(nowCST.getDay())
}

async function getDueNotifications() {
  // Get current time in CST (America/Chicago)
  const nowCST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const currentHour = nowCST.getHours()
  const nowMs = Date.now()
  console.log(`Current CST time: ${nowCST.toLocaleString('en-US', { timeZone: 'America/Chicago' })} (day ${nowCST.getDay()})`)

  const notifs = await supabaseQuery(
    'stream_notifications?enabled=eq.true&select=*'
  )

  return notifs.filter(n => {
    // Day-of-week check applies to all modes
    if (!isDayAllowed(nowCST, n.send_days)) return false

    const scheduleMode = n.schedule_mode || (n.send_times?.length > 0 ? 'specific_times' : 'legacy')

    // Interval mode: send every N minutes within active hours
    if (scheduleMode === 'interval') {
      const startHour = n.active_hours_start ?? 0
      const endHour = n.active_hours_end ?? 23
      if (currentHour < startHour || currentHour > endHour) return false
      const intervalMs = (n.interval_minutes || 60) * 60000
      if (!n.last_sent_at) return true
      return nowMs - new Date(n.last_sent_at).getTime() >= intervalMs
    }

    // Specific times mode
    if (scheduleMode === 'specific_times') {
      const sendTimes = n.send_times || []
      if (sendTimes.length === 0) return false
      const matchesHour = sendTimes.some(t => parseTimeToHour(t) === currentHour)
      if (!matchesHour) return false
      // Don't send twice in the same hour on the same day
      if (n.last_sent_at) {
        const lastCST = new Date(new Date(n.last_sent_at).toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        if (lastCST.getHours() === currentHour &&
            lastCST.toDateString() === nowCST.toDateString()) return false
      }
      return true
    }

    // Legacy mode: frequency_hours (backward compat)
    if (!n.last_sent_at) return true
    const lastSent = new Date(n.last_sent_at)
    const nextDue = new Date(lastSent.getTime() + n.frequency_hours * 3600000)
    return new Date() >= nextDue
  })
}

// ─── Get stream pages ───
async function getStreamPages(streamId) {
  return supabaseQuery(
    `monitored_pages?stream_id=eq.${streamId}&select=url,name`
  )
}

// ─── Get stream name ───
async function getStreamName(streamId) {
  const rows = await supabaseQuery(
    `streams?id=eq.${streamId}&select=name&limit=1`
  )
  return rows[0]?.name || 'Unknown Stream'
}

// ─── Get stream audience profile ───
async function getStreamAudienceProfile(streamId) {
  const rows = await supabaseQuery(
    `streams?id=eq.${streamId}&select=audience_profile&limit=1`
  )
  return rows[0]?.audience_profile || null
}

// ─── AI relevance scoring ───
async function scoreRelevance(posts, audienceProfile) {
  if (!OPENAI_KEY || !audienceProfile || posts.length === 0) return posts

  try {
    const postSummaries = posts.slice(0, 30).map((p, i) => (
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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 3000, temperature: 0.3 }),
    })

    if (!res.ok) throw new Error(`OpenAI ${res.status}`)

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || '[]'
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()
    const scores = JSON.parse(cleaned)

    return posts.map((post, i) => {
      const s = scores.find(x => x.i === i)
      return { ...post, relevance_score: s?.s ?? null, relevance_reason: s?.r ?? null, relevance_angle: s?.a ?? null }
    })
  } catch (err) {
    console.error('  Relevance scoring failed, sending all posts:', err.message)
    return posts
  }
}

// ─── Apify scan ───
function getResultsLimit(timeWindowHours) {
  if (timeWindowHours <= 2) return 5
  if (timeWindowHours <= 6) return 10
  if (timeWindowHours <= 12) return 15
  if (timeWindowHours <= 24) return 20
  return 30
}

async function startApifyScan(pageUrls, timeWindowHours) {
  const resultsLimit = getResultsLimit(timeWindowHours)
  const newerThan = new Date(Date.now() - timeWindowHours * 3600000).toISOString()
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: pageUrls.map(url => ({ url })),
        resultsLimit,
        newerThan,
      }),
    }
  )
  if (!res.ok) throw new Error(`Apify start failed: ${res.status}`)
  const data = await res.json()
  return data.data?.id
}

async function pollApifyRun(runId, maxWaitMs = 300000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const data = await res.json()
    const status = data.data?.status
    if (status === 'SUCCEEDED') return data.data
    if (status === 'FAILED' || status === 'ABORTED') throw new Error(`Apify run ${status}`)
    await new Promise(r => setTimeout(r, 10000)) // wait 10s
  }
  throw new Error('Apify run timed out')
}

async function getApifyResults(datasetId) {
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=500`)
  return res.json()
}

// ─── Normalize + filter rising posts ───
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

function filterRisingPosts(posts, timeWindowHours, minInteractions) {
  const nowMs = Date.now()
  const minVelocity = 50

  function getAgeMultiplier(ageHours) {
    if (ageHours <= 0.5) return 4.0
    if (ageHours <= 1) return 3.0
    if (ageHours <= 2) return 2.0
    if (ageHours <= 4) return 1.5
    return 1.0
  }

  const rising = []

  for (const post of posts) {
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

    rising.push({
      ...post,
      velocity,
      age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null,
      score: Math.round(score),
      tags,
    })
  }

  rising.sort((a, b) => (b.score || 0) - (a.score || 0))
  return rising
}

// ─── Send email via SendGrid ───
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

  return `
<!DOCTYPE html>
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
      ${posts.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse;">
        ${postRows}
      </table>
      ` : `
      <div style="padding: 32px 28px; text-align: center; color: #94a3b8;">
        No rising posts detected in this scan.
      </div>
      `}
      <div style="padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
        <a href="https://risingposts.com" style="font-size: 12px; color: #94a3b8; text-decoration: none;">risingposts.com</a>
      </div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: to.map(email => ({ email })) }],
      from: { email: 'noreply@risingposts.com', name: 'Rising Posts' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SendGrid error: ${res.status} ${err}`)
  }
}

// ─── Update last_sent_at ───
async function updateLastSent(notifId) {
  await supabaseQuery(
    `stream_notifications?id=eq.${notifId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ last_sent_at: new Date().toISOString() }),
    }
  )
}

// ─── Main ───
async function main() {
  console.log(`[${new Date().toISOString()}] Checking for due notifications...`)

  const due = await getDueNotifications()
  console.log(`Found ${due.length} notification(s) due`)

  if (due.length === 0) return

  for (const notif of due) {
    try {
      const streamName = await getStreamName(notif.stream_id)
      console.log(`\nProcessing: ${streamName} (every ${notif.frequency_hours}h, min ${notif.min_interactions} interactions)`)

      // Get pages
      const pages = await getStreamPages(notif.stream_id)
      if (pages.length === 0) {
        console.log('  No pages in stream, skipping')
        continue
      }
      console.log(`  ${pages.length} pages`)

      // Start Apify scan
      console.log(`  Starting Apify scan (${notif.time_window_hours}h window)...`)
      const runId = await startApifyScan(pages.map(p => p.url), notif.time_window_hours)
      console.log(`  Run ID: ${runId}`)

      // Poll for completion
      console.log('  Waiting for scan to complete...')
      const runData = await pollApifyRun(runId)
      const costUsd = runData.usageTotalUsd ?? 0
      console.log(`  Scan complete. Cost: $${costUsd.toFixed(4)}`)

      // Get results
      const rawPosts = await getApifyResults(runData.defaultDatasetId)
      console.log(`  ${rawPosts.length} posts scraped`)

      // Normalize + filter
      const normalized = rawPosts
        .map(p => normalizeFacebookPost(p))
        .filter(p => p.post_id)
      const rising = filterRisingPosts(normalized, notif.time_window_hours, notif.min_interactions)
      console.log(`  ${rising.length} rising posts found`)

      // AI relevance scoring
      const audienceProfile = await getStreamAudienceProfile(notif.stream_id)
      let emailPosts = rising
      let relevanceFiltered = 0
      if (audienceProfile && rising.length > 0) {
        console.log('  Running AI relevance scoring...')
        const scored = await scoreRelevance(rising, audienceProfile)
        emailPosts = scored.filter(p => p.relevance_score === null || p.relevance_score >= 6)
        relevanceFiltered = rising.length - emailPosts.length
        console.log(`  ${emailPosts.length} relevant, ${relevanceFiltered} filtered out`)
      }

      // Send email
      if (notif.emails && notif.emails.length > 0) {
        const subject = `📈 ${streamName}: ${emailPosts.length} rising post${emailPosts.length !== 1 ? 's' : ''}${relevanceFiltered > 0 ? ` (${relevanceFiltered} irrelevant filtered)` : ''}`
        const html = buildEmailHtml(streamName, emailPosts, notif.time_window_hours)
        await sendEmail(notif.emails, subject, html)
        console.log(`  Email sent to: ${notif.emails.join(', ')}`)
      } else {
        console.log('  No email addresses configured, skipping send')
      }

      // Update last_sent_at
      await updateLastSent(notif.id)
      console.log('  ✓ Done')

    } catch (err) {
      console.error(`  ✗ Error processing notification ${notif.id}:`, err.message)
    }
  }

  console.log('\nAll done.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
