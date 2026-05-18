import { inngest } from './client'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '../lib/content/encryption'
import sharp from 'sharp'
import { ZipArchive } from 'archiver'
import * as XLSX from 'xlsx'
import { Readable } from 'stream'

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function updateBatch(db, batchId, updates) {
  await db.from('content_batches').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', batchId)
}

async function updatePost(db, postId, updates) {
  await db.from('content_posts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', postId)
}

async function setProgress(db, batchId, step, pct, message) {
  await db.from('content_batches').update({
    progress_step: step,
    progress_pct: pct,
    progress_message: message,
    updated_at: new Date().toISOString(),
  }).eq('id', batchId)
}

// ─── Apify scrape ───
async function scrapeCompetitorPosts(apifyKey, pageUrls, limit = 20) {
  const url = `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token=${apifyKey}&timeout=120`
  const body = {
    startUrls: pageUrls.map(u => ({ url: u })),
    resultsLimit: limit,
    scrapeComments: false,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apify scrape failed: ${err.slice(0, 200)}`)
  }
  return res.json()
}

// ─── Engagement score ───
function engagementScore(post) {
  const reactions = post.likesCount || post.reactions || 0
  const comments = post.commentsCount || post.comments || 0
  const shares = post.sharesCount || post.shares || 0
  return reactions + (shares * 3) + (comments * 2)
}

// ─── Claude caption generation ───
async function generateCaptions(anthropicKey, post, page, count = 4) {
  const systemPrompt = `You are a social media content writer for a Facebook page.

Brand voice: ${page.brand_voice || 'Conversational and engaging'}
Tone: ${page.tone || 'Friendly'}
${page.hashtags?.length ? `Hashtags to use: ${page.hashtags.join(' ')}` : ''}

Write ${count} different Facebook post captions inspired by the reference post below.
Each caption should be 2-4 sentences, engaging, and end with a question or call to action.
Return ONLY a JSON array of ${count} strings. No markdown, no explanation.`

  const userContent = `Reference post:\n${post.text || post.content || '(no text)'}\n\nOriginal engagement: ${post._engagementScore} interactions`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `${systemPrompt}\n\n${userContent}` }],
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Claude API error: ${err.error?.message || res.status}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text || '[]'
  try {
    const captions = JSON.parse(text)
    if (Array.isArray(captions)) return captions.slice(0, count)
  } catch {}
  // Fallback: extract array from text
  const match = text.match(/\[[\s\S]*\]/)
  if (match) {
    try { return JSON.parse(match[0]).slice(0, count) } catch {}
  }
  return [text]
}

// ─── Kie.ai image generation ───
async function generateImage(kieKey, prompt, aspectRatio = '1:1') {
  const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${kieKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'flux-2/pro-text-to-image',
      prompt,
      aspectRatio,
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Kie.ai createTask failed: ${err.slice(0, 200)}`)
  }
  const { taskId } = await createRes.json()
  if (!taskId) throw new Error('Kie.ai: no taskId returned')

  // Poll for completion (max 3 minutes)
  for (let attempt = 0; attempt < 36; attempt++) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(`https://api.kie.ai/api/v1/jobs/taskStatus/${taskId}`, {
      headers: { 'Authorization': `Bearer ${kieKey}` },
    })
    if (!statusRes.ok) continue
    const statusData = await statusRes.json()
    const status = statusData.status || statusData.data?.status
    if (status === 'COMPLETED' || status === 'SUCCESS') {
      const imageUrl = statusData.imageUrl || statusData.data?.imageUrl || statusData.output?.imageUrl
      if (imageUrl) return imageUrl
    }
    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error(`Kie.ai image generation failed: ${statusData.error || status}`)
    }
  }
  throw new Error('Kie.ai image generation timed out')
}

// ─── Watermark composite ───
async function applyWatermark(imageBuffer, logoBuffer, position = 'bottom-right') {
  const base = sharp(imageBuffer)
  const meta = await base.metadata()
  const w = meta.width || 1024
  const h = meta.height || 1024

  const logoSize = Math.round(Math.min(w, h) * 0.15)
  const logo = await sharp(logoBuffer).resize(logoSize, logoSize, { fit: 'inside' }).toBuffer()
  const logoMeta = await sharp(logo).metadata()

  const margin = Math.round(logoSize * 0.1)
  const positions = {
    'bottom-right': { left: w - logoMeta.width - margin, top: h - logoMeta.height - margin },
    'bottom-left': { left: margin, top: h - logoMeta.height - margin },
    'top-right': { left: w - logoMeta.width - margin, top: margin },
    'top-left': { left: margin, top: margin },
  }
  const { left, top } = positions[position] || positions['bottom-right']

  return base.composite([{ input: logo, left, top, blend: 'over' }]).jpeg({ quality: 90 }).toBuffer()
}

// ─── Upload to Supabase Storage ───
async function uploadToStorage(db, buffer, path, contentType = 'image/jpeg') {
  const { error } = await db.storage.from('content-generated').upload(path, buffer, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}

// ─── Build ZIP + XLSX ───
async function buildBatchZip(db, batchId, posts, pageId, userId) {
  return new Promise(async (resolve, reject) => {
    const chunks = []
    const archive = new ZipArchive({ zlib: { level: 9 } })

    archive.on('data', chunk => chunks.push(chunk))
    archive.on('error', reject)
    archive.on('end', async () => {
      try {
        const zipBuffer = Buffer.concat(chunks)
        const zipPath = `users/${userId}/pages/${pageId}/batches/${batchId}/batch-${batchId}.zip`
        await uploadToStorage(db, zipBuffer, zipPath, 'application/zip')
        resolve(zipPath)
      } catch (err) {
        reject(err)
      }
    })

    // XLSX sheet
    const rows = posts.map((p, i) => ({
      '#': i + 1,
      'Source URL': p.source_url || '',
      'Engagement Score': p.engagement_score || 0,
      'Caption 1': p.captions?.[0] || '',
      'Caption 2': p.captions?.[1] || '',
      'Caption 3': p.captions?.[2] || '',
      'Caption 4': p.captions?.[3] || '',
      'Image File': p.image_storage_path ? `images/${p.image_storage_path.split('/').pop()}` : '',
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Posts')
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    archive.append(xlsxBuffer, { name: 'posts.xlsx' })

    // Download + include images
    for (const post of posts) {
      if (!post.image_storage_path) continue
      try {
        const { data } = await db.storage.from('content-generated').download(post.image_storage_path)
        if (data) {
          const imgBuf = Buffer.from(await data.arrayBuffer())
          const filename = post.image_storage_path.split('/').pop()
          archive.append(imgBuf, { name: `images/${filename}` })
        }
      } catch {}
    }

    archive.finalize()
  })
}

// ─── Main Inngest function ───
export const runContentBatch = inngest.createFunction(
  { id: 'run-content-batch', retries: 0, triggers: [{ event: 'content/batch.run' }] },
  async ({ event, step }) => {
    const { batchId, pageId, userId } = event.data
    const db = svc()

    await step.run('init', async () => {
      await updateBatch(db, batchId, { status: 'running' })
      await setProgress(db, batchId, 'init', 2, 'Starting batch...')
    })

    // Load page + user keys
    const { page, keys } = await step.run('load-config', async () => {
      const { data: pageData } = await db.from('content_pages').select('*').eq('id', pageId).eq('user_id', userId).single()
      if (!pageData) throw new Error('Content page not found')

      const { data: settingsData } = await db.from('user_settings').select('apify_key_enc, anthropic_key_enc, kie_key_enc').eq('user_id', userId).single()
      if (!settingsData) throw new Error('User API keys not configured')

      const apifyKey = settingsData.apify_key_enc ? decrypt(settingsData.apify_key_enc) : null
      const anthropicKey = settingsData.anthropic_key_enc ? decrypt(settingsData.anthropic_key_enc) : null
      const kieKey = settingsData.kie_key_enc ? decrypt(settingsData.kie_key_enc) : null

      if (!apifyKey) throw new Error('Apify key not configured')
      if (!anthropicKey) throw new Error('Anthropic key not configured')

      return { page: pageData, keys: { apifyKey, anthropicKey, kieKey } }
    })

    // Scrape competitor posts
    const scrapedPosts = await step.run('scrape', async () => {
      await setProgress(db, batchId, 'scrape', 10, 'Scraping competitor pages...')
      const raw = await scrapeCompetitorPosts(keys.apifyKey, page.competitor_urls || [], 30)
      // Score and sort
      const scored = raw.map(p => ({ ...p, _engagementScore: engagementScore(p) }))
        .sort((a, b) => b._engagementScore - a._engagementScore)
        .slice(0, 10) // top 10
      await setProgress(db, batchId, 'scrape', 25, `Scraped ${raw.length} posts, selected top ${scored.length}`)
      return scored
    })

    // Create post records
    const postIds = await step.run('create-posts', async () => {
      const records = scrapedPosts.map(p => ({
        batch_id: batchId,
        page_id: pageId,
        user_id: userId,
        source_url: p.url || p.postUrl || null,
        source_text: p.text || p.fullText || p.content || null,
        source_image_url: p.mainImage || p.imageUrl || null,
        engagement_score: p._engagementScore,
        status: 'pending',
      }))
      const { data } = await db.from('content_posts').insert(records).select('id')
      return (data || []).map(r => r.id)
    })

    // Load watermark/logo if configured
    let logoBuffer = null
    if (page.logo_storage_path) {
      await step.run('load-logo', async () => {
        try {
          const { data } = await db.storage.from('content-assets').download(page.logo_storage_path)
          if (data) logoBuffer = Buffer.from(await data.arrayBuffer())
        } catch {}
      })
    }

    // Process each post
    const processedPosts = []
    for (let i = 0; i < scrapedPosts.length; i++) {
      const post = scrapedPosts[i]
      const postId = postIds[i]
      if (!postId) continue

      const pct = 30 + Math.round((i / scrapedPosts.length) * 55)
      await setProgress(db, batchId, 'generate', pct, `Processing post ${i + 1} of ${scrapedPosts.length}...`)

      const result = await step.run(`process-post-${i}`, async () => {
        const postResult = { id: postId, source_url: post.url || post.postUrl, engagement_score: post._engagementScore }

        // Generate captions
        try {
          const captions = await generateCaptions(keys.anthropicKey, post, page)
          await updatePost(db, postId, { captions, status: 'captions_done' })
          postResult.captions = captions
        } catch (err) {
          await updatePost(db, postId, { error_message: `Caption error: ${err.message}`, status: 'error' })
          postResult.captions = []
        }

        // Generate image with Kie.ai (optional — skip if no key)
        if (keys.kieKey) {
          try {
            const imagePrompt = `${page.image_style_prompt || 'Professional social media graphic, modern design'}, inspired by: ${(post.text || '').slice(0, 200)}`
            const kieImageUrl = await generateImage(keys.kieKey, imagePrompt, page.image_aspect_ratio || '1:1')

            // Download the generated image
            const imgRes = await fetch(kieImageUrl)
            if (!imgRes.ok) throw new Error('Failed to download generated image')
            let imgBuffer = Buffer.from(await imgRes.arrayBuffer())

            // Apply watermark if logo exists
            if (logoBuffer) {
              imgBuffer = await applyWatermark(imgBuffer, logoBuffer, page.watermark_position || 'bottom-right')
            }

            // Upload to storage
            const filename = `post-${postId}-${Date.now()}.jpg`
            const storagePath = `users/${userId}/pages/${pageId}/batches/${batchId}/images/${filename}`
            await uploadToStorage(db, imgBuffer, storagePath)

            await updatePost(db, postId, { image_storage_path: storagePath, status: 'image_done' })
            postResult.image_storage_path = storagePath
          } catch (err) {
            await updatePost(db, postId, { error_message: (await db.from('content_posts').select('error_message').eq('id', postId).single())?.data?.error_message + ` | Image error: ${err.message}` })
          }
        }

        await updatePost(db, postId, { status: 'done' })
        return postResult
      })

      processedPosts.push(result)
    }

    // Build ZIP
    await step.run('build-zip', async () => {
      await setProgress(db, batchId, 'zip', 90, 'Building ZIP download...')
      const zipPath = await buildBatchZip(db, batchId, processedPosts, pageId, userId)
      await updateBatch(db, batchId, { zip_storage_path: zipPath })
    })

    // Finalize
    await step.run('finalize', async () => {
      await updateBatch(db, batchId, {
        status: 'done',
        progress_step: 'done',
        progress_pct: 100,
        progress_message: `Batch complete — ${processedPosts.length} posts processed`,
        completed_at: new Date().toISOString(),
      })
    })

    return { batchId, postCount: processedPosts.length }
  }
)
