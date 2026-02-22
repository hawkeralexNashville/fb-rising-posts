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

    const { post, project } = await request.json()
    if (!post || !project) return NextResponse.json({ error: 'Missing post or project' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })

    const systemPrompt = `You are a strategic content analyst. You help content creators turn trending social media posts into winning content for their specific niche.

You will receive:
1. A PROJECT profile describing the creator's niche, audience, tone, monetization goal, and risk tolerance
2. A TRENDING POST with its content, engagement metrics, and source

Your job is to analyze whether this trending post is relevant to the project, and if so, provide actionable strategic guidance.

IMPORTANT RULES:
- Adapt ALL analysis to the project's specific niche and goals. Never give generic advice.
- Match the tone field exactly. If tone is "edgy and blunt" write that way. If "professional and measured" write that way.
- Monetization suggestions must align with the stated monetization goal.
- Risk warnings must calibrate to the stated risk tolerance.
- Be specific and actionable. No filler. No "consider your audience" generics.

Respond in this exact JSON structure:
{
  "relevance": "high" | "moderate" | "low",
  "relevance_reason": "1-2 sentence explanation of why this is or isn't relevant to the project niche",
  "why_trending": "2-3 sentences on why this post is gaining traction right now",
  "positioning_fit": "2-3 sentences on whether/how this fits the project's positioning",
  "best_angle": "2-3 sentences describing the most effective angle for this specific niche and tone",
  "hooks": ["hook 1", "hook 2", "hook 3"],
  "engagement_question": "A suggested question to post that drives comments, tailored to the audience",
  "monetization_direction": "2-3 sentences on how to monetize this specific content opportunity",
  "risk_warnings": "Any verification needs, sensitivity concerns, or risks. Empty string if none."
}

If relevance is "low", only populate relevance, relevance_reason, and why_trending. Leave other fields as empty strings or empty arrays.
Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.`

    const metricsStr = [
      post.total_interactions ? `Total interactions: ${post.total_interactions}` : null,
      post.velocity ? `Velocity: ${post.velocity.toFixed(0)}/hr` : null,
      post.delta ? `Delta growth: +${post.delta}` : null,
      post.age_hours ? `Age: ${post.age_hours} hours` : null,
      post.reactions ? `Reactions: ${post.reactions}` : null,
      post.comments ? `Comments: ${post.comments}` : null,
      post.shares ? `Shares: ${post.shares}` : null,
    ].filter(Boolean).join('\n')

    const userPrompt = `PROJECT PROFILE:
- Niche: ${project.niche}
- Target Audience: ${project.audience}
- Tone: ${project.tone}
- Monetization Goal: ${project.monetization_goal}
- Risk Tolerance: ${project.risk_tolerance}
${project.custom_instructions ? `- Custom Instructions: ${project.custom_instructions}` : ''}

TRENDING POST:
Source: ${post.page_name || 'Unknown'}
Content: ${post.content_preview || '[No text content]'}

ENGAGEMENT METRICS:
${metricsStr}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}))
      console.error('Anthropic API error:', anthropicRes.status, err)
      return NextResponse.json({ error: 'AI analysis failed. Check API key.' }, { status: 502 })
    }

    const anthropicData = await anthropicRes.json()
    const text = anthropicData.content?.[0]?.text || ''

    // Parse JSON from response
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
    console.error('Strategy API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
