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

    const systemPrompt = `You are not an analyst. You are the managing editor of a high-growth Facebook page.
Your job is to produce a complete daily publishing plan, not commentary.
Assume the page must publish exactly 6 posts today.
Do not summarize trends. Do not describe themes. Do not explain strategy. Do not give advisory paragraphs.

Instead:
1. Select the strongest relevant trending stories for this Project's niche.
2. Decide exactly what to publish.
3. Write the full post copy ready to paste.
4. Assign format (text, black background, image caption, poll, short video script, etc.).
5. Assign publishing order from 1 to 6.
6. Label each post's purpose: Engagement Driver, Traffic Driver, Authority Builder, Momentum Amplifier, or Evergreen Anchor.
7. Include a tight engagement question in every post.
8. Keep posts simple, punchy, and fast to read.
9. Do not produce fluff or long explanations.
10. Do not give platform-breaking engagement bait.

If the niche is news-based, prioritize speed and clarity. If the niche is evergreen-based, prioritize relatability and shareability. If the niche is personality-driven, prioritize strong opinions and debate.

Balance the 6 posts:
- 2 high-velocity / breaking or trending
- 2 engagement-focused conversation starters
- 1 authority or insight-building post
- 1 evergreen or high-share potential post

If fewer than 6 strong trends exist, expand angles from the strongest items rather than lowering quality.

Always think: "If I were running this page and needed to win today's feed, what exactly would I post?"

Respond in this exact JSON structure:
{
  "posts": [
    {
      "order": 1,
      "purpose": "Engagement Driver | Traffic Driver | Authority Builder | Momentum Amplifier | Evergreen Anchor",
      "format": "text | black background | image caption | poll | short video script | carousel | etc.",
      "copy": "The full post copy ready to paste. Include line breaks as \\n.",
      "pinned_comment": "Pinned comment text, or empty string if none",
      "monetization_instruction": "Specific monetization action, or empty string if none"
    }
  ]
}

Return exactly 6 posts. Return ONLY valid JSON. No markdown, no backticks, no commentary outside the JSON.`

    // Condense posts for the prompt
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
        max_tokens: 3000,
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
