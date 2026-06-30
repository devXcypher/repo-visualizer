import { useCallback, useState } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  MarkerType, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import Toolbar from './components/Toolbar.jsx'
import SidePanel from './components/SidePanel.jsx'
import FileNode from './components/FileNode.jsx'
import { getLayoutedElements } from './utils/layout.js'
import { getLanguageColor } from './utils/colors.js'

const nodeTypes = { fileNode: FileNode }

const edgeBase = {
  type: 'smoothstep', animated: false,
  style: { stroke: '#30363D', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#388BFD', width: 14, height: 14 },
}

function AppInner() {
  const [repoPath, setRepoPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [selected, setSelected] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { fitView } = useReactFlow()

  const handleAnalyze = useCallback(async () => {
    if (!repoPath.trim()) return
    setLoading(true); setError(null); setSelected(null)
    try {
      const res = await fetch(`/api/analyze?path=${encodeURIComponent(repoPath.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `Server error ${res.status}`)
      if (!data.nodes?.length) {
        setError('No supported source files found in that directory.')
        setNodes([]); setEdges([]); setStats(null); return
      }
      const rawNodes = data.nodes.map(n => ({ id: n.id, type:'fileNode', position:{x:0,y:0}, data:n }))
      const rawEdges = data.edges.map(e => ({ ...edgeBase, id:e.id, source:e.source, target:e.target }))
      const { nodes:ln, edges:le } = getLayoutedElements(rawNodes, rawEdges)
      setNodes(ln); setEdges(le); setStats(data.stats)
      setTimeout(() => fitView({ padding:0.15, duration:600 }), 80)
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }, [repoPath, setNodes, setEdges, fitView])

  const handleNodeClick = useCallback((_e, node) => {
    setSelected(node.data)
    setEdges(prev => prev.map(e => {
      const active = e.source === node.id || e.target === node.id
      return { ...e, animated:active,
        style:{ ...e.style, stroke:active?'#388BFD':'#30363D', strokeWidth:active?2:1.5 },
        markerEnd:{ ...e.markerEnd, color:active?'#58A6FF':'#388BFD' } }
    }))
  }, [setEdges])

  const handlePaneClick = useCallback(() => {
    setSelected(null)
    setEdges(prev => prev.map(e => ({ ...e, animated:false,
      style:{...e.style, stroke:'#30363D', strokeWidth:1.5},
      markerEnd:{...e.markerEnd, color:'#388BFD'} })))
  }, [setEdges])

  return (
    <div className="app-root">
      <Toolbar repoPath={repoPath} setRepoPath={setRepoPath}
        onAnalyze={handleAnalyze} loading={loading} stats={stats} />
      <div className="canvas-wrap">
        {!loading && nodes.length === 0 && (
          <div className="empty-state">
            {error
              ? <><div className="empty-icon error-icon">⚠</div>
                  <p className="empty-title">Analysis failed</p>
                  <p className="empty-desc">{error}</p></>
              : <><div className="empty-icon">⬡</div>
                  <p className="empty-title">No repository loaded</p>
                  <p className="empty-desc">
                    Enter the absolute path to any local repository above and click <strong>Analyze</strong>.<br/>
                    Supports: Python · JS/TS · C/C++ · Java · Go · Rust · and more.
                  </p></>}
          </div>
        )}
        <ReactFlow nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick} onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes} fitView minZoom={0.05} maxZoom={2.5}
          proOptions={{ hideAttribution: true }}>
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#21262D" />
          <Controls style={{ background:'#161B22', border:'1px solid #21262D', borderRadius:'8px' }} />
          <MiniMap nodeColor={n => getLanguageColor(n.data?.language ?? 'Unknown')}
            maskColor="rgba(7,11,20,0.82)"
            style={{ background:'#0D1117', border:'1px solid #21262D', borderRadius:'8px' }} />
        </ReactFlow>
        <SidePanel node={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  )
}

export default function App() {
  return <ReactFlowProvider><AppInner /></ReactFlowProvider>
}
