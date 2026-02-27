import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const { posts, audienceProfile } = await request.json()
    if (!posts?.length || !audienceProfile) return NextResponse.json({ error: 'Missing posts or audience profile' }, { status: 400 })

    // Build compact post summaries for the AI
    const postSummaries = posts.slice(0, 30).map((p, i) => (
      `[${i}] ${p.page_name ? p.page_name + ': ' : ''}${(p.content_preview || '').slice(0, 200)}`
    )).join('\n')

    const prompt = `You are a relevance filter for a specific Facebook page and its audience.

ABOUT THE PAGE:
${audienceProfile}

TASK: Score each post below from 1-10 for how relevant it is to this page's audience. Consider:
- Direct relevance (explicitly about the page's core topics)
- Crossover relevance (a national trend the audience would care about — e.g. a major concert tour, viral food trend, celebrity visiting the area)
- Engagement potential (would this audience actually engage with content about this topic?)

Score guide:
- 8-10: Perfect fit. Post directly or create content about this immediately.
- 6-7: Good crossover. The audience would engage with a smart angle on this.
- 4-5: Weak connection. Could work with a stretch but probably not worth it.
- 1-3: Not relevant. Skip entirely.

POSTS TO SCORE:
${postSummaries}

Respond ONLY with valid JSON array. No markdown, no backticks, no explanation. Each item:
{"i": post_index, "s": score_1_to_10, "r": "one line reason", "a": "suggested angle if score >= 6, otherwise null"}

Example: [{"i": 0, "s": 8, "r": "Major concert announcement with Nashville connection", "a": "Announce the Nashville dates and ask followers who's going"}, {"i": 1, "s": 2, "r": "Political commentary with no local angle", "a": null}]`

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('OpenAI error:', err)
      return NextResponse.json({ error: 'AI scoring failed' }, { status: 502 })
    }

    const aiData = await aiRes.json()
    const raw = aiData.choices?.[0]?.message?.content || '[]'

    let scores
    try {
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()
      scores = JSON.parse(cleaned)
    } catch (e) {
      console.error('Failed to parse AI scores:', raw)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Map scores back to posts
    const scoredPosts = posts.map((post, i) => {
      const score = scores.find(s => s.i === i)
      return {
        ...post,
        relevance_score: score?.s ?? null,
        relevance_reason: score?.r ?? null,
        relevance_angle: score?.a ?? null,
      }
    })

    // Sort by relevance score descending, then by original score
    scoredPosts.sort((a, b) => {
      if ((b.relevance_score || 0) !== (a.relevance_score || 0)) return (b.relevance_score || 0) - (a.relevance_score || 0)
      return (b.score || 0) - (a.score || 0)
    })

    const usage = aiData.usage
    const costEstimate = usage ? ((usage.prompt_tokens * 0.00000015) + (usage.completion_tokens * 0.0000006)).toFixed(4) : null

    return NextResponse.json({
      posts: scoredPosts,
      stats: {
        total: scoredPosts.length,
        relevant: scoredPosts.filter(p => p.relevance_score >= 6).length,
        borderline: scoredPosts.filter(p => p.relevance_score >= 4 && p.relevance_score < 6).length,
        irrelevant: scoredPosts.filter(p => p.relevance_score !== null && p.relevance_score < 4).length,
        costEstimate,
      },
    })
  } catch (err) {
    console.error('Relevance scoring error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
