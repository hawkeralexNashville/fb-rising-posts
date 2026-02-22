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

    const systemPrompt = `You are an elite content strategist. You analyze batches of trending social media posts and develop actionable content strategies for a specific niche.

You will receive:
1. A PROJECT profile with niche, audience, tone, monetization goal, and risk tolerance
2. A BATCH of trending posts with content and engagement metrics

Your job is to analyze the ENTIRE batch holistically and identify the best content opportunities for this project.

IMPORTANT RULES:
- Think like a content strategist, not a summarizer. Identify PATTERNS and OPPORTUNITIES across posts.
- Adapt everything to the project's niche, tone, and goals. Never be generic.
- Match the tone field. If "edgy and blunt" — write that way. If "professional and measured" — write that way.
- Be specific. Name the actual topics. Reference the actual posts.
- Prioritize ruthlessly. Not everything is worth covering.

Respond in this exact JSON structure:
{
  "summary": "2-3 sentence overview of what's trending and the overall opportunity",
  "themes": [
    {
      "theme": "Name of the trending theme/topic",
      "post_indices": [0, 3, 7],
      "opportunity": "2-3 sentences on why this theme matters for the project",
      "strength": "high" | "moderate" | "low"
    }
  ],
  "top_opportunities": [
    {
      "title": "Short title for this content piece",
      "based_on_posts": [0, 2],
      "angle": "2-3 sentences on the specific angle to take",
      "hook": "The actual hook/headline to use",
      "format": "What format works best (text post, image, video, article, thread, etc.)",
      "engagement_play": "The engagement question or CTA to use",
      "monetization": "How this specific piece connects to the monetization goal",
      "urgency": "high" | "moderate" | "low",
      "urgency_reason": "Why act now or why it can wait"
    }
  ],
  "skip_topics": ["Topic 1 to avoid and why", "Topic 2 to avoid and why"],
  "content_calendar": "A suggested order/timing for publishing the top opportunities over the next 24-48 hours",
  "risk_notes": "Any risks, verification needs, or sensitivity warnings across the batch"
}

Return 3-6 themes and 3-5 top opportunities. Be selective — quality over quantity.
Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.`

    // Condense posts for the prompt (keep it token-efficient)
    const postsForPrompt = posts.slice(0, 30).map((p, i) => {
      const parts = [`[${i}] Source: ${p.page_name || 'Unknown'}`]
      if (p.content_preview) parts.push(`Content: ${p.content_preview.slice(0, 300)}`)
      const metrics = []
      if (p.total_interactions) metrics.push(`Total: ${p.total_interactions}`)
      if (p.velocity) metrics.push(`Velocity: ${p.velocity.toFixed(0)}/hr`)
      if (p.delta) metrics.push(`Delta: +${p.delta}`)
      if (p.age_hours) metrics.push(`Age: ${p.age_hours}h`)
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
        max_tokens: 2048,
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
