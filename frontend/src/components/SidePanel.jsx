import { useState } from 'react'
import { X, Sparkles, FileCode, ChevronDown, ChevronRight, ExternalLink, Hash, Code2, Layers } from 'lucide-react'
import { getLanguageColor, getLanguageBg } from '../utils/colors'

function MetricBox({ label, value, color }) {
  return (
    <div className="metric-box">
      <span className="metric-box-value" style={{ color }}>{value.toLocaleString()}</span>
      <span className="metric-box-label">{label}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sp-section">
      <button className="sp-section-header" onClick={() => setOpen(o => !o)}>
        {Icon && <Icon size={13} color="#7D8590" />}
        <span>{title}</span>
        {open ? <ChevronDown size={13} color="#7D8590" /> : <ChevronRight size={13} color="#7D8590" />}
      </button>
      {open && <div className="sp-section-body">{children}</div>}
    </div>
  )
}

export default function SidePanel({ node, onClose }) {
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [prevLoading, setPrevLoading] = useState(false)

  if (!node) return null
  const { label, language, path, abs_path, loc, complexity, dependencies, hash } = node
  const color = getLanguageColor(language)

  async function handleAI() {
    setAiLoading(true); setAiResult(null)
    try {
      const r = await fetch(`/api/explain?path=${encodeURIComponent(abs_path)}&hash=${hash}`)
      const d = await r.json()
      setAiResult(d.explanation ?? 'No explanation returned.')
    } catch { setAiResult('⚠️ Network error — is the backend running?') }
    finally { setAiLoading(false) }
  }

  async function handlePreview() {
    if (preview !== null) { setPreview(null); return }
    setPrevLoading(true)
    try {
      const r = await fetch(`/api/file?path=${encodeURIComponent(abs_path)}`)
      setPreview(await r.json())
    } catch { setPreview({ content:'⚠️ Could not load file.', truncated:false, total_lines:0 }) }
    finally { setPrevLoading(false) }
  }

  return (
    <div className="side-panel">
      <div className="sp-header">
        <div className="sp-header-left">
          <FileCode size={16} color={color} />
          <span className="sp-filename" title={label}>{label}</span>
          <span className="sp-lang-badge" style={{ color, background:getLanguageBg(language, 0.18) }}>{language}</span>
        </div>
        <button className="sp-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="sp-path">{path}</div>

      <div className="sp-scroll">
        <Section title="Lines of Code" icon={Hash}>
          <div className="metrics-grid">
            <MetricBox label="Total" value={loc.total} color="#E6EDF3" />
            <MetricBox label="Code" value={loc.code} color="#3FB950" />
            <MetricBox label="Comments" value={loc.comment} color="#58A6FF" />
            <MetricBox label="Blank" value={loc.blank} color="#7D8590" />
          </div>
        </Section>

        {(complexity.functions > 0 || complexity.classes > 0) && (
          <Section title="Complexity" icon={Layers}>
            <div className="metrics-grid">
              {complexity.functions > 0 && <MetricBox label="Functions" value={complexity.functions} color="#D2A8FF" />}
              {complexity.classes > 0 && <MetricBox label="Classes" value={complexity.classes} color="#FFA657" />}
            </div>
          </Section>
        )}

        <Section title={`Imports (${dependencies?.length ?? 0})`} icon={ExternalLink} defaultOpen={!!dependencies?.length}>
          {!dependencies?.length
            ? <p className="sp-empty">No internal imports detected.</p>
            : <ul className="dep-list">
                {dependencies.map(dep => (
                  <li key={dep} className="dep-item">
                    <Code2 size={11} color="#58A6FF" /><span title={dep}>{dep}</span>
                  </li>
                ))}
              </ul>}
        </Section>

        <Section title="AI Summary" icon={Sparkles}>
          {!aiResult && !aiLoading &&
            <button className="ai-btn" onClick={handleAI}><Sparkles size={14} />Analyze with Gemini AI</button>}
          {aiLoading && <div className="ai-loading"><span className="spinner" /><span>Asking Gemini…</span></div>}
          {aiResult && (
            <>
              <div className="ai-result">{aiResult}</div>
              <button className="ai-btn ai-btn-sm" onClick={handleAI} style={{ marginTop:10 }}>
                <Sparkles size={12} />Regenerate
              </button>
            </>
          )}
        </Section>

        <Section title="Code Preview" icon={Code2} defaultOpen={false}>
          <button className="ai-btn ai-btn-sm" onClick={handlePreview} disabled={prevLoading}>
            {prevLoading ? <><span className="spinner"/>Loading…</> : preview ? 'Hide Preview' : 'Show Code'}
          </button>
          {preview && (
            <>
              {preview.truncated && <p className="sp-note">Showing first 300 of {preview.total_lines.toLocaleString()} lines.</p>}
              <pre className="code-preview">{preview.content}</pre>
            </>
          )}
        </Section>
      </div>
    </div>
  )
}
