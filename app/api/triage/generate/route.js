import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  ).auth.getUser()
  return user
}

async function callOpenAI(systemPrompt, userContent) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 400,
      temperature: 0.75,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `OpenAI error ${res.status}`)
  }
  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('Empty response from OpenAI')
  return text
}

function buildUserContent(textPrompt, exampleImages) {
  if (exampleImages.length === 0) return textPrompt
  return [
    { type: 'text', text: 'The following images are example posts from this page — use them as style and tone reference:\n' },
    ...exampleImages.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
    { type: 'text', text: '\n' + textPrompt },
  ]
}

export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cardId, type, sourceContent } = await request.json()
  if (!cardId || !['headline', 'caption', 'both'].includes(type)) {
    return NextResponse.json({ error: 'Missing cardId or invalid type (headline|caption|both)' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  const db = svc()

  const { data: card } = await db.from('triage_cards').select('*').eq('id', cardId).single()
  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

  const { data: page } = await db.from('triage_pages').select('*').eq('id', card.triage_page_id).single()
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  const isOwner = page.user_id === user.id
  const isCollab = page.collaborator_email?.toLowerCase() === user.email?.toLowerCase()
  if (!isOwner && !isCollab) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Fetch example posts (with images) for visual style context
  const { data: examplePosts } = await db.from('triage_example_posts').select('image_url, content, url').eq('triage_page_id', page.id).limit(4)
  const exampleImages = (examplePosts || []).map(e => e.image_url).filter(Boolean)

  // Build content block — prefer pasted sourceContent, fall back to card content
  const contentBlock = [
    card.title ? `Source: ${card.title}` : null,
    card.url ? `URL: ${card.url}` : null,
    sourceContent
      ? `Content: ${sourceContent.slice(0, 1500)}`
      : (card.content ? `Content: ${card.content.slice(0, 800)}` : null),
  ].filter(Boolean).join('\n')

  const persona = page.persona || 'General Facebook audience'

  const headlineSystemPrompt = page.headline_prompt ||
    'You are a social media content writer for a Facebook page. Write a single engaging Facebook post headline for the content below. Make it attention-grabbing and conversational. Return ONLY the headline — no quotes, no hashtags, no explanation.'

  const captionSystemPrompt = page.caption_prompt ||
    'You are a social media content writer for a Facebook page. Write an engaging Facebook post caption (2–4 sentences). Be conversational, relatable, and end with a question or call to action that encourages comments. Return ONLY the caption — no quotes, no hashtags, no explanation.'

  try {
    if (type === 'both') {
      const headlinePromptText = `AUDIENCE PERSONA:\n${persona}\n\nCONTENT TO WRITE HEADLINE FOR:\n${contentBlock}`
      const captionPromptText = `AUDIENCE PERSONA:\n${persona}\n\nCONTENT TO WRITE CAPTION FOR:\n${contentBlock}`

      const [headline, caption] = await Promise.all([
        callOpenAI(headlineSystemPrompt, buildUserContent(headlinePromptText, exampleImages)),
        callOpenAI(captionSystemPrompt, buildUserContent(captionPromptText, exampleImages)),
      ])

      try {
        await db.from('triage_cards').update({ generated_headline: headline, generated_caption: caption }).eq('id', cardId)
      } catch {}

      return NextResponse.json({ headline, caption })
    }

    // Single-type generation (headline or caption) — kept for backward compatibility
    const isHeadline = type === 'headline'
    const systemPrompt = isHeadline ? headlineSystemPrompt : captionSystemPrompt
    const textPrompt = `AUDIENCE PERSONA:\n${persona}\n\nCONTENT TO WRITE ${isHeadline ? 'HEADLINE' : 'CAPTION'} FOR:\n${contentBlock}`
    const text = await callOpenAI(systemPrompt, buildUserContent(textPrompt, exampleImages))

    const field = isHeadline ? 'generated_headline' : 'generated_caption'
    try {
      await db.from('triage_cards').update({ [field]: text }).eq('id', cardId)
    } catch {}

    return NextResponse.json({ text })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
