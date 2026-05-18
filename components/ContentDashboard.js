'use client'
import { useState, useEffect, useRef } from 'react'

// ─── Icons ───
const Icons = {
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  key: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  image: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  upload: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  spinner: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>,
}

function tok(session) { return session?.access_token }

async function apiFetch(path, method, body, session) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok(session)}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── API Keys Setup ───
function ApiKeysPanel({ session, onDone }) {
  const [keys, setKeys] = useState({ apify: '', anthropic: '', kie: '' })
  const [configured, setConfigured] = useState({ apify: false, anthropic: false, kie: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    apiFetch('/api/content/keys', 'GET', null, session).then(setConfigured).catch(() => {})
  }, [session])

  async function save() {
    setSaving(true); setError(null); setSuccess(false)
    try {
      const body = {}
      if (keys.apify) body.apify = keys.apify
      if (keys.anthropic) body.anthropic = keys.anthropic
      if (keys.kie) body.kie = keys.kie
      if (Object.keys(body).length === 0) { setError('Enter at least one key'); setSaving(false); return }
      await apiFetch('/api/content/keys', 'POST', body, session)
      setConfigured(prev => ({ ...prev, ...Object.fromEntries(Object.keys(body).map(k => [k, true])) }))
      setKeys({ apify: '', anthropic: '', kie: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      if (onDone) onDone()
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  const StatusBadge = ({ ok }) => ok
    ? <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full px-2 py-0.5">Configured</span>
    : <span className="text-xs bg-gray-700 text-gray-500 border border-gray-600 rounded-full px-2 py-0.5">Not set</span>

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-300">Apify API Key</label>
          <StatusBadge ok={configured.apify} />
        </div>
        <input type="password" value={keys.apify} onChange={e => setKeys(k => ({ ...k, apify: e.target.value }))}
          placeholder={configured.apify ? '••••••••••• (leave blank to keep)' : 'apify_api_xxxxx'}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20" />
        <p className="text-xs text-gray-600 mt-1">Used to scrape competitor Facebook pages</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-300">Anthropic API Key</label>
          <StatusBadge ok={configured.anthropic} />
        </div>
        <input type="password" value={keys.anthropic} onChange={e => setKeys(k => ({ ...k, anthropic: e.target.value }))}
          placeholder={configured.anthropic ? '••••••••••• (leave blank to keep)' : 'sk-ant-xxxxx'}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20" />
        <p className="text-xs text-gray-600 mt-1">Used by Claude to generate caption variants</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-300">Kie.ai API Key <span className="text-gray-600 font-normal">(optional)</span></label>
          <StatusBadge ok={configured.kie} />
        </div>
        <input type="password" value={keys.kie} onChange={e => setKeys(k => ({ ...k, kie: e.target.value }))}
          placeholder={configured.kie ? '••••••••••• (leave blank to keep)' : 'kieai_xxxxx'}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20" />
        <p className="text-xs text-gray-600 mt-1">FLUX.2 image generation — skip for captions-only output</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">Keys saved securely.</p>}

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
        {saving ? Icons.spinner : Icons.key}
        {saving ? 'Saving...' : 'Save Keys'}
      </button>
    </div>
  )
}

// ─── Page Wizard ───
const TONES = ['conversational', 'professional', 'humorous', 'inspirational', 'urgent', 'educational']
const ASPECT_RATIOS = [{ value: '1:1', label: 'Square (1:1)' }, { value: '3:4', label: 'Portrait (3:4)' }, { value: '4:3', label: 'Landscape (4:3)' }, { value: '16:9', label: 'Wide (16:9)' }]
const WATERMARK_POSITIONS = [{ value: 'bottom-right', label: 'Bottom Right' }, { value: 'bottom-left', label: 'Bottom Left' }, { value: 'top-right', label: 'Top Right' }, { value: 'top-left', label: 'Top Left' }]

function PageWizard({ session, page, onSave, onCancel }) {
  const editing = !!page
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: page?.name || '',
    competitor_urls: page?.competitor_urls?.join('\n') || '',
    brand_voice: page?.brand_voice || '',
    tone: page?.tone || 'conversational',
    hashtags: page?.hashtags?.join(' ') || '',
    image_style_prompt: page?.image_style_prompt || '',
    image_aspect_ratio: page?.image_aspect_ratio || '1:1',
    watermark_position: page?.watermark_position || 'bottom-right',
    logo_storage_path: page?.logo_storage_path || null,
    watermark_storage_path: page?.watermark_storage_path || null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function uploadAsset(file, type) {
    setUploadingLogo(true)
    try {
      const token = tok(session)
      const ext = file.name.split('.').pop()
      const path = `logos/${Date.now()}-${type}.${ext}`
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { error: uploadErr } = await supabase.storage.from('content-assets').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      if (type === 'logo') set('logo_storage_path', path)
      else set('watermark_storage_path', path)
    } catch (err) { setError('Upload failed: ' + err.message) }
    setUploadingLogo(false)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const body = {
        name: form.name.trim(),
        competitor_urls: form.competitor_urls.split('\n').map(s => s.trim()).filter(Boolean),
        brand_voice: form.brand_voice,
        tone: form.tone,
        hashtags: form.hashtags.split(/\s+/).map(s => s.startsWith('#') ? s : '#' + s).filter(Boolean),
        image_style_prompt: form.image_style_prompt,
        image_aspect_ratio: form.image_aspect_ratio,
        watermark_position: form.watermark_position,
        logo_storage_path: form.logo_storage_path,
        watermark_storage_path: form.watermark_storage_path,
      }
      if (!body.name) { setError('Page name is required'); setSaving(false); return }
      if (editing) {
        await apiFetch('/api/content/pages', 'PATCH', { id: page.id, ...body }, session)
        onSave({ ...page, ...body })
      } else {
        const created = await apiFetch('/api/content/pages', 'POST', body, session)
        onSave(created)
      }
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  const steps = ['Name', 'Competitors', 'Brand Voice', 'Images', 'Review']
  const inputClass = 'w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20'
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5'

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Step nav */}
      <div className="flex border-b border-gray-800">
        {steps.map((s, i) => (
          <button key={s} onClick={() => { if (i < step || form.name) setStep(i) }}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${i === step ? 'text-purple-400 border-b-2 border-purple-400' : i < step ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600'}`}>
            {i < step ? '✓ ' : ''}{s}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-5">
        {step === 0 && (
          <>
            <div>
              <label className={labelClass}>Page name <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Nashville News Network" className={inputClass} autoFocus />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <label className={labelClass}>Competitor Facebook page URLs</label>
              <textarea value={form.competitor_urls} onChange={e => set('competitor_urls', e.target.value)}
                placeholder="https://facebook.com/PageName&#10;https://facebook.com/AnotherPage&#10;One URL per line"
                rows={6} className={inputClass + ' resize-none font-mono text-xs'} />
              <p className="text-xs text-gray-600 mt-1">Apify will scrape the top posts from each page and score them by engagement</p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className={labelClass}>Brand voice</label>
              <textarea value={form.brand_voice} onChange={e => set('brand_voice', e.target.value)}
                placeholder="We speak to Nashville locals who care about community news. Keep it warm, direct, and conversational."
                rows={4} className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button key={t} onClick={() => set('tone', t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors capitalize ${form.tone === t ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Hashtags <span className="text-gray-600 font-normal">(added to every post)</span></label>
              <input value={form.hashtags} onChange={e => set('hashtags', e.target.value)}
                placeholder="#Nashville #Tennessee #LocalNews" className={inputClass} />
              <p className="text-xs text-gray-600 mt-1">Separate with spaces. # prefix is optional.</p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <label className={labelClass}>Image style prompt <span className="text-gray-600 font-normal">(optional — for Kie.ai)</span></label>
              <textarea value={form.image_style_prompt} onChange={e => set('image_style_prompt', e.target.value)}
                placeholder="Professional news graphic, bold typography, modern layout, dark blue and white color scheme"
                rows={3} className={inputClass + ' resize-none'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Aspect ratio</label>
                <select value={form.image_aspect_ratio} onChange={e => set('image_aspect_ratio', e.target.value)} className={inputClass}>
                  {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Watermark position</label>
                <select value={form.watermark_position} onChange={e => set('watermark_position', e.target.value)} className={inputClass}>
                  {WATERMARK_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Logo / watermark image</label>
              <label className="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors">
                {uploadingLogo ? Icons.spinner : Icons.upload}
                <span className="text-sm text-gray-400">{form.logo_storage_path ? 'Logo uploaded ✓' : 'Upload logo PNG (transparent background)'}</span>
                <input type="file" accept="image/png,image/webp" className="hidden" onChange={e => e.target.files[0] && uploadAsset(e.target.files[0], 'logo')} />
              </label>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">Review</h3>
            <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="text-gray-200">{form.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Competitors</span><span className="text-gray-200">{form.competitor_urls.split('\n').filter(Boolean).length} pages</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tone</span><span className="text-gray-200 capitalize">{form.tone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Hashtags</span><span className="text-gray-200">{form.hashtags || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Aspect ratio</span><span className="text-gray-200">{form.image_aspect_ratio}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Logo</span><span className="text-gray-200">{form.logo_storage_path ? 'Uploaded' : 'None'}</span></div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors">Back</button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => { if (step === 0 && !form.name.trim()) { setError('Name is required'); return }; setError(null); setStep(s => s + 1) }}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">Next</button>
            ) : (
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                {saving ? Icons.spinner : Icons.check}
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Page'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Batch Progress Bar ───
function BatchProgress({ batch }) {
  const pct = batch.progress_pct || 0
  const isDone = batch.status === 'done'
  const isError = batch.status === 'error'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={isError ? 'text-red-400' : isDone ? 'text-emerald-400' : 'text-purple-400'}>
          {isError ? '✗ Error' : isDone ? '✓ Done' : batch.progress_message || 'Processing...'}
        </span>
        <span className="text-gray-500">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isError ? 'bg-red-500' : isDone ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
      </div>
      {isError && batch.error_message && <p className="text-xs text-red-400">{batch.error_message}</p>}
    </div>
  )
}

// ─── Post Review Grid ───
function PostCard({ post, onUpdate }) {
  const [selectedCaption, setSelectedCaption] = useState(post.selected_caption || 0)
  const [editedCaption, setEditedCaption] = useState(post.edited_caption || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const reviewStatus = post.review_status || 'pending'

  async function updatePost(updates) {
    setSaving(true)
    try {
      const res = await fetch('/api/content/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${post._token}` },
        body: JSON.stringify({ id: post.id, ...updates }),
      })
      if (res.ok) onUpdate({ ...post, ...updates })
    } catch {}
    setSaving(false)
  }

  const captions = post.captions || []
  const activeCaption = editedCaption || captions[selectedCaption] || ''

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-all ${reviewStatus === 'approved' ? 'border-emerald-500/50' : reviewStatus === 'rejected' ? 'border-red-500/30 opacity-60' : 'border-gray-700'}`}>
      {/* Image */}
      {post.image_signed_url ? (
        <div className="relative bg-gray-800 aspect-square overflow-hidden">
          <img src={post.image_signed_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          {reviewStatus === 'approved' && (
            <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">{Icons.check}</div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 aspect-square flex items-center justify-center">
          <span className="text-gray-600">{Icons.image}</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Engagement score */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Engagement score</span>
          <span className="text-sm font-bold text-purple-400">{(post.engagement_score || 0).toLocaleString()}</span>
        </div>

        {/* Source link */}
        {post.source_url && (
          <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {Icons.link} View source post
          </a>
        )}

        {/* Caption variants */}
        {captions.length > 0 && (
          <div>
            <div className="flex gap-1.5 mb-2">
              {captions.map((_, i) => (
                <button key={i} onClick={() => { setSelectedCaption(i); updatePost({ selected_caption: i }) }}
                  className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${selectedCaption === i && !editedCaption ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-500'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setEditing(e => !e)}
                className={`ml-auto text-xs px-2 py-1 rounded-lg font-medium transition-colors ${editing ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-500'}`}>
                Edit
              </button>
            </div>

            {editing ? (
              <div>
                <textarea value={editedCaption} onChange={e => setEditedCaption(e.target.value)}
                  rows={4} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-400" />
                <button onClick={() => { updatePost({ edited_caption: editedCaption }); setEditing(false) }}
                  disabled={saving} className="mt-1 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg">Save edit</button>
              </div>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed">{activeCaption}</p>
            )}
          </div>
        )}

        {/* Review buttons */}
        <div className="flex gap-2 pt-1">
          <button onClick={() => updatePost({ review_status: reviewStatus === 'approved' ? 'pending' : 'approved' })}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${reviewStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-emerald-500/50 hover:text-emerald-400'}`}>
            {Icons.check} Approve
          </button>
          <button onClick={() => updatePost({ review_status: reviewStatus === 'rejected' ? 'pending' : 'rejected' })}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${reviewStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-red-500/50 hover:text-red-400'}`}>
            {Icons.x} Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Batch View ───
function BatchView({ batch, session, supabase, onBack }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [liveBatch, setLiveBatch] = useState(batch)

  useEffect(() => {
    loadPosts()
  }, [batch.id])

  // Realtime subscription for batch progress
  useEffect(() => {
    if (batch.status === 'done' || batch.status === 'error') return
    const channel = supabase
      .channel(`batch-${batch.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'content_batches', filter: `id=eq.${batch.id}` }, payload => {
        setLiveBatch(prev => ({ ...prev, ...payload.new }))
        if (payload.new.status === 'done') loadPosts()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [batch.id, batch.status])

  async function loadPosts() {
    setLoading(true)
    try {
      const token = tok(session)
      const res = await fetch(`/api/content/posts?batchId=${batch.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setPosts((data || []).map(p => ({ ...p, _token: token })))
    } catch {}
    setLoading(false)
  }

  async function download() {
    setDownloading(true)
    try {
      const token = tok(session)
      const res = await fetch(`/api/content/download?batchId=${batch.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const { url } = await res.json()
      if (url) window.open(url, '_blank')
    } catch {}
    setDownloading(false)
  }

  const approvedCount = posts.filter(p => p.review_status === 'approved').length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back</button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">Batch Results</h2>
            <p className="text-sm text-gray-500">{timeAgo(batch.created_at)} · {posts.length} posts</p>
          </div>
          {liveBatch.status === 'done' && (
            <button onClick={download} disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
              {downloading ? Icons.spinner : Icons.download}
              Download ZIP
            </button>
          )}
        </div>

        {/* Progress */}
        {liveBatch.status !== 'done' && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-6">
            <BatchProgress batch={liveBatch} />
          </div>
        )}

        {/* Stats */}
        {liveBatch.status === 'done' && (
          <div className="flex items-center gap-4 mb-6 text-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5">
              <span className="text-gray-500">Total</span> <span className="font-bold text-white">{posts.length}</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
              <span className="text-gray-500">Approved</span> <span className="font-bold text-emerald-400">{approvedCount}</span>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5">
              <span className="text-gray-500">Pending</span> <span className="font-bold text-gray-300">{posts.filter(p => p.review_status === 'pending').length}</span>
            </div>
          </div>
        )}

        {/* Posts grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-800 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 && liveBatch.status === 'done' ? (
          <div className="text-center py-20 text-gray-500">No posts generated.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? { ...updated, _token: p._token } : p))} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Content Dashboard ───
export default function ContentDashboard({ supabase, session }) {
  const [pages, setPages] = useState([])
  const [selectedPage, setSelectedPage] = useState(null)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [showWizard, setShowWizard] = useState(false)
  const [editingPage, setEditingPage] = useState(null)
  const [showKeys, setShowKeys] = useState(false)
  const [loading, setLoading] = useState(true)
  const [runningBatch, setRunningBatch] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('batches') // batches | settings | keys
  const [timeWindowHours, setTimeWindowHours] = useState(24)

  useEffect(() => {
    loadPages()
  }, [])

  useEffect(() => {
    if (selectedPage) loadBatches(selectedPage.id)
    else setBatches([])
  }, [selectedPage])

  async function loadPages() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/content/pages', 'GET', null, session)
      setPages(data || [])
      if (data?.length && !selectedPage) setSelectedPage(data[0])
    } catch {}
    setLoading(false)
  }

  async function loadBatches(pageId) {
    try {
      const token = tok(session)
      const res = await fetch(`/api/content/batches?pageId=${pageId}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setBatches(data || [])
    } catch {}
  }

  async function startBatch() {
    if (!selectedPage) return
    setRunningBatch(true); setError(null)
    try {
      const batch = await apiFetch('/api/content/batches', 'POST', { pageId: selectedPage.id, timeWindowHours }, session)
      setBatches(prev => [batch, ...prev])
      setSelectedBatch(batch)
    } catch (err) { setError(err.message) }
    setRunningBatch(false)
  }

  async function deletePage(pageId) {
    if (!confirm('Delete this content page?')) return
    await apiFetch('/api/content/pages', 'DELETE', null, session).catch(() => {})
    // re-fetch
    await fetch(`/api/content/pages?id=${pageId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok(session)}` } })
    const remaining = pages.filter(p => p.id !== pageId)
    setPages(remaining)
    if (selectedPage?.id === pageId) setSelectedPage(remaining[0] || null)
  }

  if (selectedBatch) {
    return <BatchView batch={selectedBatch} session={session} supabase={supabase} onBack={() => setSelectedBatch(null)} />
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left sidebar — pages list */}
      <div className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Content Pages</span>
            <button onClick={() => { setShowWizard(true); setEditingPage(null) }} className="text-gray-500 hover:text-purple-400 transition-colors">{Icons.plus}</button>
          </div>
          {pages.length === 0 && !loading && (
            <button onClick={() => setShowWizard(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-500/50 text-gray-500 hover:text-purple-400 text-xs font-medium transition-all">
              + Create first page
            </button>
          )}
          {pages.map(p => (
            <div key={p.id} onClick={() => setSelectedPage(p)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${selectedPage?.id === p.id ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <span className="text-sm font-medium truncate">{p.name}</span>
              <button onClick={e => { e.stopPropagation(); deletePage(p.id) }} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">{Icons.trash}</button>
            </div>
          ))}
        </div>

        <div className="p-3 mt-auto border-t border-gray-800">
          <button onClick={() => setShowKeys(s => !s)}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-colors ${showKeys ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}>
            {Icons.key} API Keys
          </button>
        </div>
      </div>

      {/* Right main panel */}
      <div className="flex-1 overflow-y-auto">
        {showKeys && (
          <div className="p-6 max-w-lg">
            <h2 className="text-lg font-bold text-white mb-5">API Keys</h2>
            <ApiKeysPanel session={session} onDone={() => setShowKeys(false)} />
          </div>
        )}

        {!showKeys && showWizard && (
          <div className="p-6 max-w-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editingPage ? 'Edit Page' : 'New Content Page'}</h2>
            <PageWizard session={session} page={editingPage}
              onSave={saved => {
                if (editingPage) setPages(prev => prev.map(p => p.id === saved.id ? saved : p))
                else { setPages(prev => [...prev, saved]); setSelectedPage(saved) }
                setShowWizard(false); setEditingPage(null)
              }}
              onCancel={() => { setShowWizard(false); setEditingPage(null) }} />
          </div>
        )}

        {!showKeys && !showWizard && !selectedPage && (
          <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <div className="w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-3xl mb-5">✨</div>
            <h2 className="text-xl font-bold text-white mb-2">Content Generation</h2>
            <p className="text-gray-500 text-sm max-w-sm mb-6">Scrape top competitor posts, generate 4 caption variants per post using Claude, and optionally generate images with Kie.ai FLUX.2.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowKeys(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors">
                {Icons.key} Set API Keys
              </button>
              <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                {Icons.plus} Create Page
              </button>
            </div>
          </div>
        )}

        {!showKeys && !showWizard && selectedPage && (
          <div className="p-6">
            {/* Page header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedPage.name}</h2>
                <p className="text-sm text-gray-500 mt-1 capitalize">{selectedPage.tone} · {selectedPage.competitor_urls?.length || 0} competitors · {selectedPage.image_aspect_ratio}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingPage(selectedPage); setShowWizard(true) }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-sm rounded-xl transition-colors">
                  {Icons.settings} Edit
                </button>
                <select value={timeWindowHours} onChange={e => setTimeWindowHours(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl focus:outline-none focus:border-purple-400">
                  <option value={6}>Last 6h</option>
                  <option value={12}>Last 12h</option>
                  <option value={24}>Last 24h</option>
                  <option value={48}>Last 48h</option>
                  <option value={72}>Last 72h</option>
                </select>
                <button onClick={startBatch} disabled={runningBatch}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {runningBatch ? Icons.spinner : Icons.play}
                  {runningBatch ? 'Starting...' : 'Run Batch'}
                </button>
              </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5 text-sm text-red-400">{error}</div>}

            {/* Batches list */}
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Batch History</h3>
            {batches.length === 0 ? (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                <p className="text-gray-500 text-sm">No batches yet. Click Run Batch to generate your first set of posts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {batches.map(b => (
                  <div key={b.id} onClick={() => setSelectedBatch(b)}
                    className="bg-gray-900 border border-gray-700 hover:border-purple-500/50 rounded-2xl p-4 cursor-pointer transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${b.status === 'done' ? 'bg-emerald-500' : b.status === 'error' ? 'bg-red-500' : 'bg-purple-500 animate-pulse'}`} />
                        <span className="text-sm font-semibold text-white capitalize">{b.status}</span>
                        <span className="text-xs text-gray-500">{timeAgo(b.created_at)}</span>
                        {b.time_window_hours && <span className="text-xs text-gray-600">· {b.time_window_hours}h window</span>}
                        {b.scrape_cost_usd != null && <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">${Number(b.scrape_cost_usd).toFixed(4)}</span>}
                      </div>
                      <span className="text-xs text-gray-600 group-hover:text-purple-400 transition-colors">View →</span>
                    </div>
                    {(b.status === 'running' || b.status === 'queued') && <BatchProgress batch={b} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
