import { Handle, Position } from '@xyflow/react'
import { getLanguageColor, getLanguageBg } from '../utils/colors'

const trunc = (s, n) => s.length > n ? s.slice(0, n-1) + '…' : s

export default function FileNode({ data, selected }) {
  const color = getLanguageColor(data.language)
  return (
    <div className="file-node" style={{
      borderLeftColor: color,
      background: selected ? '#161B22' : '#0D1117',
      boxShadow: selected ? `0 0 0 2px ${color}55, 0 4px 20px rgba(0,0,0,.5)` : '0 2px 8px rgba(0,0,0,.4)',
    }}>
      <Handle type="target" position={Position.Left}
        style={{ background:color, width:8, height:8, border:'none', left:-5 }} />
      <div className="fn-name" title={data.label}>{trunc(data.label, 24)}</div>
      <span className="fn-lang" style={{ color, background:getLanguageBg(data.language, 0.18) }}>
        {data.language}
      </span>
      <div className="fn-metrics">
        <span className="fn-metric" title="Lines of code"><span className="fn-icon">≡</span>{data.loc?.code ?? 0}</span>
        {(data.complexity?.functions ?? 0) > 0 &&
          <span className="fn-metric" title="Functions"><span className="fn-icon">ƒ</span>{data.complexity.functions}</span>}
        {(data.complexity?.classes ?? 0) > 0 &&
          <span className="fn-metric" title="Classes"><span className="fn-icon">◆</span>{data.complexity.classes}</span>}
        {(data.dependencies?.length ?? 0) > 0 &&
          <span className="fn-metric" title="Imports"><span className="fn-icon">→</span>{data.dependencies.length}</span>}
      </div>
      <Handle type="source" position={Position.Right}
        style={{ background:color, width:8, height:8, border:'none', right:-5 }} />
    </div>
  )
}
