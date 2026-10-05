import { useEffect, useRef } from 'react';
import type { GraphNode, GraphState } from './graph';
import type { Video } from './videos';

export type VisualNodeState = 'current' | 'visited' | 'next' | 'unexplored';

export function Brand() {
  return <div className="brand" aria-label="hexwalk"><span className="brand-mark hex" aria-hidden="true" /><span>hexwalk</span></div>;
}

export function VideoNode({ node, state, hovered, onHover, onSelect }: {
  node: GraphNode; state: VisualNodeState; hovered: boolean; onHover: (id: string | null) => void; onSelect: (id: string) => void;
}) {
  return <button className={`video-node is-${state} ${hovered ? 'is-hovered' : ''}`}
    style={{ left: node.x, top: node.y }} data-node-id={node.id} data-node-state={state} data-x={node.x} data-y={node.y}
    aria-label={`${state === 'current' ? 'Current video:' : state === 'visited' ? 'Revisit' : 'Explore'} ${node.video.title}`}
    aria-current={state === 'current' ? 'true' : undefined} aria-describedby={hovered ? 'node-tooltip' : undefined}
    onMouseEnter={() => state !== 'current' && onHover(node.id)} onMouseLeave={() => onHover(null)}
    onFocus={() => state !== 'current' && onHover(node.id)} onBlur={() => onHover(null)} onClick={() => onSelect(node.id)}>
    <span className="node-shell hex" />
    <span className="node-separation hex" />
    <span className="node-inner hex" />
    <img className="node-image hex" src={node.video.thumbnail} alt="" draggable="false" />
  </button>;
}

export function HoverVideoCard({ node, state, x, y }: { node: GraphNode; state: VisualNodeState; x: number; y: number }) {
  return <div id="node-tooltip" role="tooltip" className="hover-video-card" style={{ left: x, top: y }}>
    <div className="mono hover-status">{state === 'visited' ? 'VISITED' : state === 'unexplored' ? 'UNEXPLORED' : 'NEXT'}</div>
    <div className="hover-title">{node.video.title}</div>
    <div className="mono metadata">{node.video.channel} · {node.video.duration}</div>
  </div>;
}

export function NowPlaying({ video, onWatch }: { video: Video; onWatch: () => void }) {
  return <section className="now-playing" aria-label="Current video">
    <div className="now-playing-status mono"><span className="mini-hex is-filled" aria-hidden="true" />NOW PLAYING</div>
    <h1>{video.title}</h1>
    <div className="mono metadata">{video.channel} · {video.duration}</div>
    <button className="watch-link" onClick={onWatch}>Watch <span aria-hidden="true">→</span></button>
  </section>;
}

export function TraversalBreadcrumb({ graph, onSelect }: { graph: GraphState; onSelect: (id: string) => void }) {
  const visible = graph.history.slice(-8);
  return <nav className="traversal-breadcrumb" aria-label="Traveled path">
    <div className="breadcrumb-markers">
      {graph.history.length > 8 && <span className="breadcrumb-overflow mono" aria-hidden="true">…</span>}
      {visible.map((id, index) => {
        const node = graph.nodes.find((item) => item.id === id)!;
        return <button key={`${id}-${index}`} className={`breadcrumb-step ${index === visible.length - 1 ? 'is-current' : ''}`}
          aria-label={`Step ${graph.history.length - visible.length + index + 1}: ${node.video.title}`}
          aria-current={index === visible.length - 1 ? 'step' : undefined} onClick={() => onSelect(id)}>
          <span className={`mini-hex ${index === visible.length - 1 ? 'is-filled' : ''}`} aria-hidden="true" />
        </button>;
      })}
    </div>
    <span className="mono step-counter">STEP {String(graph.history.length).padStart(2, '0')}</span>
  </nav>;
}

export function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (factor: number) => void }) {
  return <>
    <div className="graph-legend mono" aria-label="Graph legend">
      <div>TRAVELED<span className="legend-line traveled" /></div>
      <div>AVAILABLE<span className="legend-line" /></div>
      <div>UNEXPLORED<span className="legend-hex"><span className="mini-hex" /></span></div>
    </div>
    <div className="zoom-controls mono" aria-label="Canvas zoom">
      <button aria-label="Zoom out" disabled={zoom <= 0.4} onClick={() => onZoom(1 / 1.2)}>−</button>
      <output aria-label="Zoom percentage">{Math.round(zoom * 100)}%</output>
      <button aria-label="Zoom in" disabled={zoom >= 1.8} onClick={() => onZoom(1.2)}>+</button>
    </div>
  </>;
}

function CloseIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>;
}

export function HistoryPanel({ graph, onSelect, onClose }: { graph: GraphState; onSelect: (id: string) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <section className="history-panel" id="history-panel" aria-label="Exploration history" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <header><span className="mono">YOUR PATH</span><button ref={closeRef} className="close-control" aria-label="Close history" onClick={onClose}><CloseIcon /></button></header>
    <ol className="history-list">
      {graph.history.map((id, index) => {
        const node = graph.nodes.find((item) => item.id === id)!;
        const isLatest = index === graph.history.length - 1;
        return <li key={`${id}-${index}`}><button onClick={() => onSelect(id)} aria-current={isLatest ? 'step' : undefined}>
          <span className="history-index mono">{String(index + 1).padStart(2, '0')}</span>
          <span className={`history-thumbnail hex ${isLatest ? 'is-current' : ''}`}><img src={node.video.thumbnail} alt="" /></span>
          <span className="history-copy"><span>{node.video.title}</span><span className="mono metadata">{node.video.channel} · {node.video.duration}</span></span>
        </button></li>;
      })}
    </ol>
    <footer className="mono">{graph.history.length} {graph.history.length === 1 ? 'STEP' : 'STEPS'} · {graph.nodes.filter((node) => node.visited || node.current).length} VIDEOS EXPLORED</footer>
  </section>;
}

export function VideoPreview({ video, onClose }: { video: Video; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <section className="video-preview" role="dialog" aria-label={`Video preview: ${video.title}`} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <header><span className="mono">VIDEO PREVIEW</span><button ref={closeRef} className="close-control" aria-label="Close video preview" onClick={onClose}><CloseIcon /></button></header>
    <div className="preview-poster"><img src={video.thumbnail} alt={`Illustration for ${video.title}`} /><span className="preview-duration mono">{video.duration}</span></div>
    <h2>{video.title}</h2>
    <div className="mono metadata">{video.channel} · {video.duration}</div>
    <p>Playback is not connected in this prototype.</p>
  </section>;
}
