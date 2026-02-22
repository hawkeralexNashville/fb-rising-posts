'use client'

const TrendingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
)

export default function Homepage({ onSignIn, onGetStarted }) {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white">
              <TrendingIcon />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Rising Posts</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onSignIn} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign In
            </button>
            <button onClick={onGetStarted} className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-xl shadow-sm shadow-orange-500/20 transition-all hover:shadow-md hover:shadow-orange-500/25">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full text-sm font-medium text-orange-600 mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            Live trend detection
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6 animate-fade-in-up">
            Catch trending content
            <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent"> before it peaks</span>
          </h1>
          <p className="text-xl sm:text-2xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Monitor any Facebook page and get alerted to posts that are gaining momentum fast. Stop reacting to viral content — start predicting it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <button onClick={onGetStarted} className="px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-2xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5">
              Start Scanning — It&apos;s Free
            </button>
            <button onClick={onSignIn} className="px-8 py-4 text-base font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors">
              I have an account
            </button>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <section className="py-10 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <span>Real-time scanning</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            <span>Velocity-based detection</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span>No login to Facebook required</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            <span>Organize with streams</span>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">Three steps to find trending content in your niche before anyone else.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 font-bold text-lg mb-5">1</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Add pages to watch</h3>
              <p className="text-base text-slate-500 leading-relaxed">Paste any public Facebook page URL. Organize them into streams by niche — finance, news, local, whatever you follow.</p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 font-bold text-lg mb-5">2</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Scan for rising posts</h3>
              <p className="text-base text-slate-500 leading-relaxed">Hit scan and our algorithm checks every recent post. It calculates velocity — how fast each post is gaining interactions per hour.</p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 font-bold text-lg mb-5">3</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Catch trends early</h3>
              <p className="text-base text-slate-500 leading-relaxed">See which posts are accelerating. A post with 100 interactions in 30 minutes is more interesting than 5,000 over two days.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Built for content strategists</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">Everything you need to find, filter, and act on rising content.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Feature cards */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Quick Scan</h3>
              <p className="text-base text-slate-500 leading-relaxed">Paste a single URL and scan instantly. No setup needed. Perfect for checking a page on the fly.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Stream Organization</h3>
              <p className="text-base text-slate-500 leading-relaxed">Group pages by topic into streams. Scan an entire niche at once — finance pages, local news, competitor brands.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Smart Filters</h3>
              <p className="text-base text-slate-500 leading-relaxed">Filter by time window, interaction range, and velocity. Find the sweet spot — posts gaining traction but haven&apos;t peaked yet.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Save &amp; Compare</h3>
              <p className="text-base text-slate-500 leading-relaxed">Save scan results and come back to them anytime. Track what&apos;s rising over time and spot patterns in your niche.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Who it&apos;s for</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Content Creators</h3>
              <p className="text-base text-slate-500">Find trending topics in your niche before they saturate. Create content while it&apos;s still rising.</p>
            </div>
            <div>
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Social Media Managers</h3>
              <p className="text-base text-slate-500">Monitor competitor pages and industry leaders. Know what&apos;s resonating before your morning standup.</p>
            </div>
            <div>
              <div className="text-4xl mb-4">📰</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">News &amp; Media</h3>
              <p className="text-base text-slate-500">Catch breaking stories early by watching local news pages, officials, and community groups.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-6 bg-gradient-to-br from-orange-500 to-rose-500">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Stop chasing trends. Start catching them.</h2>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">Set up your first scan in under a minute. No credit card, no commitment.</p>
          <button onClick={onGetStarted} className="px-8 py-4 text-base font-semibold text-orange-600 bg-white hover:bg-orange-50 rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5">
            Get Started Free
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
            </div>
            <span className="text-sm font-semibold text-slate-900">Rising Posts</span>
          </div>
          <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Rising Posts. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
