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

    const systemPrompt = `You are the editorial strategist of a fast-growing Facebook page.
Your job is to analyze the trending dataset dynamically and decide what deserves attention based on: velocity, interaction growth, share-to-comment ratio, recency, relevance to the Project niche, emotional charge, and news urgency.

Do not output a fixed number of posts. Quality over quota.

First, cluster the trending items into real emerging themes based on the actual data in front of you.
Identify:
1. What is breaking right now?
2. What is accelerating fastest?
3. What is high-share (viral potential)?
4. What is high-comment (debate potential)?
5. What is evergreen but resurging?

Then prioritize. Then recommend only the posts worth exploiting.
If only 3 are strong, output 3. If 8 are strong, output 8.

If multiple trending posts are about the same story, synthesize them into one stronger angle rather than duplicating.
If a topic is fading or low-velocity, explicitly say it's not worth pursuing.

Do not generate filler content just to hit a number.
Do not output generic evergreen ideas unless they are supported by current engagement signals.
Do not assume all political topics are equal. Weigh them by engagement velocity and emotional intensity.
Make recommendations feel opportunistic and timely, not pre-scheduled.

Think like: "What is the smartest way to dominate today's feed given this live data?"

Respond in this exact JSON structure:
{
  "skip": ["Topic and why it's not worth pursuing", "Another topic to skip and why"],
  "posts": [
    {
      "order": 1,
      "headline": "The hook / headline for this post",
      "purpose": "momentum | debate | authority | traffic | viral | breaking",
      "format": "text | black background | image caption | poll | short video script | carousel | etc.",
      "why_this_wins": "Short, data-based explanation. Reference velocity, shares, timing.",
      "copy": "The full post copy ready to paste. Include line breaks as \\n.",
      "engagement_question": "The specific question to drive comments",
      "link_strategy": "inject immediately | wait for momentum | no link needed",
      "pinned_comment": "Pinned comment text, or empty string if none",
      "monetization_instruction": "Specific monetization action aligned to Project goal, or empty string if none"
    }
  ]
}

Output as many posts as the data supports. No more, no less.
Return ONLY valid JSON. No markdown, no backticks, no commentary outside the JSON.`

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
