import { Search, FolderOpen, GitBranch, FileCode, Zap } from 'lucide-react'

function Pill({ icon: Icon, value, label, color }) {
  return (
    <div className="stat-pill">
      <Icon size={13} color={color} />
      <span className="stat-value" style={{ color }}>{value.toLocaleString()}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default function Toolbar({ repoPath, setRepoPath, onAnalyze, loading, stats }) {
  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <GitBranch size={18} color="#58A6FF" />
        <span className="brand-text">RepoViz</span>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-input-wrap">
        <FolderOpen size={15} className="input-icon" />
        <input className="toolbar-input" type="text"
          placeholder="/absolute/path/to/your/repository"
          value={repoPath} onChange={e => setRepoPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAnalyze()} spellCheck={false} />
      </div>
      <button className={`analyze-btn ${loading ? 'loading' : ''}`}
        onClick={onAnalyze} disabled={loading || !repoPath.trim()}>
        {loading ? <><span className="spinner" />Analysing…</> : <><Search size={14} />Analyze</>}
      </button>
      {stats && (
        <>
          <div className="toolbar-divider" />
          <div className="stats-strip">
            <Pill icon={FileCode} value={stats.total_files} label="files" color="#58A6FF" />
            <Pill icon={Zap} value={stats.total_code_loc} label="LoC" color="#3FB950" />
            <Pill icon={GitBranch} value={stats.total_edges} label="edges" color="#D2A8FF" />
          </div>
        </>
      )}
    </div>
  )
}
