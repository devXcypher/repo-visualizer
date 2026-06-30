import dagre from '@dagrejs/dagre'

const W = 230, H = 95

export function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir:'LR', ranksep:90, nodesep:24, marginx:40, marginy:40 })
  nodes.forEach(n => g.setNode(n.id, { width:W, height:H }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return {
    nodes: nodes.map(n => {
      const p = g.node(n.id)
      return { ...n, position:{ x:p.x - W/2, y:p.y - H/2 } }
    }),
    edges,
  }
}
