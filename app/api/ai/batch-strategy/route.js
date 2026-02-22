import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

    const { posts, project } = await request.json()
    if (!posts?.length || !project) return NextResponse.json({ error: 'Missing posts or project' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })

    const systemPrompt = `You are a competitive content strategist embedded inside a viral content discovery tool.
You are not an analyst. You are not a summarizer. You are not a rewrite assistant.
Your job is to analyze live trending posts and recommend intelligent ways to exploit them based on: velocity, engagement growth, share-to-comment ratio, recency, emotional charge, format, and the Project's niche and positioning.

Do not produce a fixed number of posts. Only recommend opportunities that are worth acting on.

First, analyze the trending dataset and cluster it into emerging themes based on engagement signals.
Identify: what is breaking right now, what is accelerating fastest, what is high-share (viral potential), what is high-comment (debate potential), what is resurging evergreen content.

Prioritize based on momentum.

For each high-value opportunity:
1. Diagnose why the original post is working psychologically.
2. Identify the dominant emotional lever (anger, fear, identity, aspiration, curiosity, wallet pain, etc.).
3. Identify the content move type (blame frame, data shock, authority breakdown, debate trigger, momentum speculation, etc.).
4. Provide 2-3 strategic exploitation options: Escalate, Reframe, Authority pivot, Outflank, Data pivot, Humor pivot (if appropriate).

FORMAT AWARENESS RULES — adapt output to the original post type:
- If image/photo: return image headline (8-12 words max), optional subheadline, visual direction, short caption (3-5 lines), engagement question, link timing.
- If black background text or status: return headline under 128 chars, optional 1-line caption.
- If poll: return poll question, 3-4 answer options, caption line.
- If reel/video: return scroll-stopping hook, 10-20 second script outline, caption, engagement question.
- Do not default to long paragraph text posts. Think scroll-stopping creative first, caption second.

MONETIZATION LOGIC — align to project goal:
- Traffic-driven: instruct when to inject link (immediately or after engagement builds).
- Engagement-driven: no link.
- Newsletter-driven: soft CTA in pinned comment.
- Never insert links prematurely on momentum posts.

STRATEGIC FILTERING:
- If a trending post is weak, fading, or low-leverage: "Not worth exploiting."
- If multiple posts cover the same story, synthesize into one stronger angle.
- Never generate filler content just to produce output.

VOICE: Punchy. Clear. Visual-first thinking. No fluff. No generic summaries. No academic tone.

Always think: "If I were trying to dominate today's feed using this exact live data, what is the smartest move?"

Respond in this exact JSON structure:
{
  "skip": ["Topic — why it's not worth exploiting"],
  "opportunities": [
    {
      "order": 1,
      "source_summary": "What trending post(s) this is based on, 1 sentence",
      "why_its_working": "Psychological diagnosis of why the original is gaining traction",
      "emotional_lever": "anger | fear | identity | aspiration | curiosity | wallet pain | outrage | hope | nostalgia | etc.",
      "move_type": "blame frame | data shock | authority breakdown | debate trigger | momentum speculation | etc.",
      "moves": [
        {
          "strategy": "Escalate | Reframe | Authority pivot | Outflank | Data pivot | Humor pivot",
          "why_this_works": "1-2 sentences on why this move wins",
          "purpose": "engagement | traffic | authority | momentum | viral | debate",
          "format": "image | black background | poll | reel | video | text | carousel",
          "creative": {
            "headline": "The main hook or image headline",
            "subheadline": "Optional supporting line, empty string if none",
            "body": "Full post copy / caption / script. Use \\n for line breaks.",
            "visual_direction": "Image or visual suggestion if applicable, empty string if not",
            "poll_options": ["Only if format is poll, otherwise empty array"],
            "engagement_question": "The question to drive comments",
            "pinned_comment": "Pinned comment text, empty string if none",
            "link_strategy": "inject immediately | wait for momentum | no link | soft CTA in pinned comment",
            "monetization_instruction": "Specific action aligned to project goal, empty string if none"
          }
        }
      ]
    }
  ]
}

Return ONLY valid JSON. No markdown, no backticks, no commentary outside the JSON.`

    // Condense posts for the prompt
    const postsForPrompt = posts.slice(0, 30).map((p, i) => {
      const parts = [`[${i}] Source: ${p.page_name || 'Unknown'}`]
      if (p.post_type) parts.push(`Type: ${p.post_type}`)
      if (p.content_preview) parts.push(`Content: ${p.content_preview.slice(0, 300)}`)
      const metrics = []
      if (p.total_interactions) metrics.push(`Total: ${p.total_interactions}`)
      if (p.velocity) metrics.push(`Velocity: ${p.velocity.toFixed(0)}/hr`)
      if (p.delta) metrics.push(`Delta: +${p.delta}`)
      if (p.age_hours) metrics.push(`Age: ${p.age_hours}h`)
      if (p.shares && p.comments) metrics.push(`Share/Comment: ${(p.shares / Math.max(p.comments, 1)).toFixed(1)}`)
      if (p.shares) metrics.push(`Shares: ${p.shares}`)
      if (p.comments) metrics.push(`Comments: ${p.comments}`)
      if (metrics.length) parts.push(`Metrics: ${metrics.join(', ')}`)
      return parts.join('\n')
    }).join('\n\n---\n\n')

    const userPrompt = `PROJECT PROFILE:
- Niche: ${project.niche}
- Target Audience: ${project.audience}
- Tone: ${project.tone}
- Monetization Goal: ${project.monetization_goal}
- Risk Tolerance: ${project.risk_tolerance}
${project.custom_instructions ? `- Custom Instructions: ${project.custom_instructions}` : ''}

TRENDING POSTS (${posts.length} total):

${postsForPrompt}`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      console.error('OpenAI API error:', openaiRes.status, err)
      return NextResponse.json({ error: 'AI analysis failed. Check API key.' }, { status: 502 })
    }

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''

    let strategy
    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      strategy = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse AI response:', text.slice(0, 500))
      return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 })
    }

    return NextResponse.json({ strategy })
  } catch (err) {
    console.error('Batch strategy API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
