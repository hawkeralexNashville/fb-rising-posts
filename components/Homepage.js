'use client'

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-md shadow-orange-500/30">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    </div>
    <span className="text-lg font-bold tracking-tight text-white">Rising Posts</span>
  </div>
)

// Mock rising post card for the hero visual
function MockPostCard({ rank, title, velocity, interactions, page, platform, hot }) {
  const platforms = {
    facebook: { color: '#1877F2', label: 'Facebook', icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12.073h2.54V9.844c0-2.502 1.493-3.886 3.776-3.886 1.094 0 2.24.195 2.24.195v2.459h-1.262c-1.244 0-1.632.773-1.632 1.563v1.898h2.773l-.443 2.878h-2.33V21.95C20.343 21.201 24 17.064 24 12.073z"/></svg>
    )},
    reddit: { color: '#FF4500', label: 'Reddit', icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
    )},
    twitter: { color: '#000000', label: 'X / Twitter', icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    )},
  }
  const p = platforms[platform]
  return (
    <div className={`bg-white/5 backdrop-blur border ${hot ? 'border-orange-500/40' : 'border-white/10'} rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden`}>
      {hot && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-rose-500" />}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: p.color + '22', color: p.color }}>
            {p.icon} {p.label}
          </span>
          <span className="text-xs text-white/40 truncate">{page}</span>
        </div>
        <p className="text-sm text-white/90 font-medium leading-snug truncate">{title}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-white/50">{interactions} interactions</span>
          <span className={`text-xs font-semibold flex items-center gap-1 ${hot ? 'text-orange-400' : 'text-emerald-400'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /></svg>
            {velocity}/hr
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Homepage({ session, onSignIn, onGetStarted, onSignOut }) {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                <button
                  onClick={onGetStarted}
                  className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block"
                >
                  Dashboard
                </button>
                <button
                  onClick={onSignOut}
                  className="px-4 py-2.5 text-sm font-semibold text-white/80 bg-white/10 hover:bg-white/15 rounded-xl transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetStarted}
                  className="px-4 sm:px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen bg-slate-950 flex flex-col justify-center overflow-hidden pt-16">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-orange-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs font-semibold text-orange-400 mb-8 animate-fade-in">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              Real-time trend detection
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6 animate-fade-in-up">
              Know what&apos;s going viral
              <span className="block bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent mt-1">
                before it does
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/50 leading-relaxed max-w-xl mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Our velocity algorithm scans Facebook, Reddit, Twitter and more — surfacing posts that are rising fast, so you can act while the trend is still early.
            </p>

            {/* Platform pills */}
            <div className="flex flex-wrap gap-2 mb-10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              {[
                { label: 'Facebook', color: '#1877F2' },
                { label: 'Reddit', color: '#FF4500' },
                { label: 'X / Twitter', color: '#ffffff' },
                { label: 'More coming', color: '#9ca3af' },
              ].map(p => (
                <span key={p.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/60">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <button
                onClick={onGetStarted}
                className="px-7 py-4 text-base font-semibold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-2xl shadow-xl shadow-orange-500/30 transition-all hover:shadow-orange-500/50 hover:-translate-y-0.5"
              >
                Start for free →
              </button>
              <button
                onClick={onSignIn}
                className="px-7 py-4 text-base font-medium text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-colors"
              >
                Sign in to your account
              </button>
            </div>
          </div>

          {/* Right: mock UI */}
          <div className="hidden lg:flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white/30 uppercase tracking-widest">Rising Now</span>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                Live scan
              </span>
            </div>
            <MockPostCard rank={1} platform="facebook" page="BBC News" title="Breaking: Markets surge after surprise rate decision" interactions="4,821" velocity="892" hot={true} />
            <MockPostCard rank={2} platform="reddit" page="r/worldnews" title="Scientists announce major climate breakthrough in carbon capture" interactions="2,310" velocity="541" hot={true} />
            <MockPostCard rank={3} platform="twitter" page="@TechCrunch" title="OpenAI launches new model that rewrites the benchmark leaderboard" interactions="1,104" velocity="312" hot={false} />
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-3/5 bg-gradient-to-r from-orange-500 to-rose-500 rounded-full animate-scanning-bar" />
              </div>
              <span className="text-xs text-white/30">Scanning 12 pages…</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social proof strip ─── */}
      <section className="py-8 border-y border-slate-100 bg-slate-50">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-400">
          {[
            { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, label: 'Velocity-based ranking' },
            { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, label: 'AI noise filtering' },
            { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, label: 'Know exactly when to post' },
            { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>, label: 'Track any competitor page' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              {icon}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Algorithm Section ─── */}
      <section className="py-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-xs font-semibold text-orange-500 mb-5">
                The Algorithm
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-5">
                It&apos;s not about the most popular — it&apos;s about the <span className="text-orange-500">fastest rising</span>
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed mb-8">
                A post with 200 interactions in 45 minutes is far more interesting than one with 10,000 interactions over 3 days. Our algorithm measures velocity — interactions per hour — so you spot trends at the very start of the curve.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Scan any timeframe', desc: 'Look back 1 hour, 6 hours, 24 hours, or up to 7 days. You control the window.' },
                  { title: 'Velocity score', desc: 'Every post gets a real-time interactions-per-hour score. Sort, filter, compare.' },
                  { title: 'Early signals only', desc: 'Filter to posts under a certain age — catch them while they\'re still rising, not peaked.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="mt-1 w-5 h-5 rounded-full bg-orange-500/10 border border-orange-200 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{title}</p>
                      <p className="text-sm text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual: velocity chart mockup */}
            <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-semibold text-white/70">Velocity Ranking</span>
                <span className="text-xs text-orange-400 font-medium px-2.5 py-1 bg-orange-500/10 rounded-full">Last 6 hours</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Stocks react to Fed decision', bar: 95, vel: '1,240/hr', tag: 'HOT' },
                  { label: 'This AI trick saves hours of work', bar: 78, vel: '892/hr', tag: '' },
                  { label: 'Local council blocks new development', bar: 55, vel: '541/hr', tag: '' },
                  { label: 'Weekend giveaway — enter now', bar: 30, vel: '210/hr', tag: '' },
                ].map(({ label, bar, vel, tag }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/60 truncate flex-1 mr-2">{label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {tag && <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">{tag}</span>}
                        <span className="text-xs font-semibold text-emerald-400">{vel}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500"
                        style={{ width: `${bar}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-white/5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-white/30">Refreshed 2 minutes ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-24 px-5 sm:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything you need to ride trends first</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">Scan smarter. Post earlier. Win the algorithm.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
                color: 'orange',
                title: 'Multi-platform scanning',
                desc: 'Watch Facebook pages, Reddit communities, and Twitter accounts from one dashboard. More platforms added regularly.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
                color: 'violet',
                title: 'AI noise filter',
                desc: 'Let AI separate signal from noise. Cut through promotional fluff and surface only the posts worth paying attention to.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
                color: 'rose',
                title: 'Competitor tracking',
                desc: 'Add any public page — competitors, industry leaders, niche accounts. Know what\'s working for them before it goes mainstream.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
                color: 'amber',
                title: 'Streams',
                desc: 'Group pages into topic streams — finance, news, local, lifestyle. Scan an entire niche with one click.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
                color: 'emerald',
                title: 'Posting timing insights',
                desc: 'See when trending posts were published and how fast they rose. Know exactly when to post in your niche for maximum traction.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>,
                color: 'sky',
                title: 'Save & revisit scans',
                desc: 'Save any scan result and come back to it. Track trends over time, spot patterns, build a research library.',
              },
            ].map(({ icon, color, title, desc }) => {
              const colors = {
                orange: 'bg-orange-50 text-orange-500 border-orange-100',
                violet: 'bg-violet-50 text-violet-500 border-violet-100',
                rose: 'bg-rose-50 text-rose-500 border-rose-100',
                amber: 'bg-amber-50 text-amber-500 border-amber-100',
                emerald: 'bg-emerald-50 text-emerald-500 border-emerald-100',
                sky: 'bg-sky-50 text-sky-500 border-sky-100',
              }
              return (
                <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${colors[color]}`}>
                    {icon}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Who It's For ─── */}
      <section className="py-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Who uses Rising Posts?</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">Anyone who needs to stay ahead of the curve in their niche.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: '📱', title: 'Content Creators', desc: 'Find hot topics before they saturate your feed. Create while the topic is still rising.' },
              { emoji: '📊', title: 'Social Media Managers', desc: 'Monitor clients, competitors, and industry leaders. Always know what\'s resonating.' },
              { emoji: '📰', title: 'News & Media', desc: 'Catch breaking stories early by watching officials, local pages, and community groups.' },
              { emoji: '🏪', title: 'Brand Marketers', desc: 'React to cultural moments as they happen. Be part of the conversation, not late to it.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="text-center">
                <div className="text-3xl mb-4">{emoji}</div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Teaser / locked section ─── */}
      <section className="py-20 px-5 sm:px-8 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/50 mb-4">Inside the app</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Your trend command centre</h2>
            <p className="text-white/40 max-w-md mx-auto text-base">Log in to see your streams, run scans, and catch what&apos;s rising in real time.</p>
          </div>

          {/* Blurred fake dashboard */}
          <div className="relative rounded-3xl overflow-hidden border border-white/10">
            <div className="bg-slate-900 p-6 select-none blur-sm pointer-events-none" aria-hidden="true">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {['Finance Stream', 'Local News', 'Competitors'].map(s => (
                  <div key={s} className="bg-white/5 rounded-xl p-4">
                    <div className="text-xs text-white/40 mb-1">{s}</div>
                    <div className="text-lg font-bold text-white">{Math.floor(Math.random() * 20 + 5)} pages</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {['Post about rising interest rates drives huge engagement', 'New product launch goes viral in under 2 hours', 'Community poll sparks debate — 8,000 comments'].map(t => (
                  <div key={t} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-sm text-white/60">{t}</span>
                    <span className="text-emerald-400 text-sm font-semibold ml-4 flex-shrink-0">↑ 892/hr</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-[2px]">
              <div className="text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <p className="text-white font-semibold text-lg mb-1">Sign up to unlock</p>
                <p className="text-white/40 text-sm mb-5">Start spotting trends in under 60 seconds</p>
                <button
                  onClick={onGetStarted}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold rounded-xl hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5"
                >
                  Get started free →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-5 sm:px-8 bg-gradient-to-br from-orange-500 to-rose-600 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Stop chasing trends. Start catching them.</h2>
          <p className="text-lg text-white/75 mb-10 max-w-xl mx-auto leading-relaxed">
            Set up your first scan in under a minute. No credit card required to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 text-base font-semibold text-orange-600 bg-white hover:bg-orange-50 rounded-2xl shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5"
            >
              Get Started Free
            </button>
            <button
              onClick={onSignIn}
              className="px-8 py-4 text-base font-medium text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-colors"
            >
              I already have an account
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 px-5 sm:px-8 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-900">Rising Posts</span>
          </div>
          <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Rising Posts. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
