import { useRef, useState } from 'react';
import { createGraph, selectNode } from './graph';
import type { GraphState } from './graph';
import { searchVideos } from './videos';
import type { Video } from './videos';
import { GraphCanvas } from './GraphCanvas';
import { Brand, HistoryPanel, NowPlaying, TraversalBreadcrumb, VideoPreview, ZoomControls } from './components';
import type { CanvasControls } from './GraphCanvas';

function StartScreen({ onStart }: { onStart: (video: Video) => void }) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const results = query.trim() ? searchVideos(query).slice(0, 3) : [];
  const showResults = open && results.length > 0;

  return (
    <main className="start-screen">
      <Brand />
      <form className="search-area" onSubmit={(event) => {
        event.preventDefault();
        if (results.length) onStart(results[Math.min(highlighted, results.length - 1)]);
      }}>
        <label className="search-field">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="5.5" /><path d="m11.6 11.6 4.4 4.4" />
          </svg>
          <input autoComplete="off" type="search" role="combobox" aria-label="Search for a video to start from"
            placeholder="Search for a video to start from" value={query}
            aria-expanded={showResults} aria-controls="search-results" aria-autocomplete="list"
            aria-activedescendant={showResults ? `result-${highlighted}` : undefined}
            onChange={(event) => { setQuery(event.target.value); setHighlighted(0); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setOpen(true);
                setHighlighted((index) => (index + (event.key === 'ArrowDown' ? 1 : results.length - 1)) % Math.max(1, results.length));
              }
            }} />
        </label>
        {showResults && <div className="search-results-wrap">
          <div className="search-result-heading mono"><span>STARTING POINTS</span><span>↵ EXPLORE</span></div>
          <div id="search-results" className="search-results" role="listbox" aria-label="Video search results">
            {results.map((video, index) => <button key={video.id} id={`result-${index}`} type="button" role="option"
              aria-selected={index === highlighted} className={`search-result ${index === highlighted ? 'is-highlighted' : ''}`}
              onMouseEnter={() => setHighlighted(index)} onClick={() => onStart(video)}>
              <span className="result-thumbnail hex"><img src={video.thumbnail} alt="" /></span>
              <span className="result-copy"><span className="result-title">{video.title}</span><span className="mono metadata">{video.channel} · {video.duration}</span></span>
              <span className="result-arrow" aria-hidden="true">↗</span>
            </button>)}
          </div>
        </div>}
      </form>
    </main>
  );
}

function Explorer({ graph, onSelect, onClear }: { graph: GraphState; onSelect: (id: string) => void; onClear: () => void }) {
  const canvas = useRef<CanvasControls>(null);
  const [zoom, setZoom] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const current = graph.nodes.find((node) => node.id === graph.currentId)!;
  const chooseNode = (id: string) => { onSelect(id); setHistoryOpen(false); setPreviewOpen(false); };

  return <main className="explorer">
    <img className="canvas-lattice" src="/lattice.svg" alt="" aria-hidden="true" />
    <GraphCanvas ref={canvas} graph={graph} onSelect={chooseNode} onZoomChange={setZoom} />
    <Brand />
    <nav className="top-navigation" aria-label="Graph controls">
      <button onClick={() => canvas.current?.recenter()}>Recenter</button>
      <button aria-expanded={historyOpen} aria-controls="history-panel" onClick={() => { setHistoryOpen(!historyOpen); setPreviewOpen(false); }}>History</button>
      <button onClick={onClear}>Clear</button>
    </nav>
    <NowPlaying video={current.video} onWatch={() => { setPreviewOpen(true); setHistoryOpen(false); }} />
    <TraversalBreadcrumb graph={graph} onSelect={chooseNode} />
    <ZoomControls zoom={zoom} onZoom={(factor) => canvas.current?.zoomBy(factor)} />
    {historyOpen && <HistoryPanel graph={graph} onSelect={chooseNode} onClose={() => setHistoryOpen(false)} />}
    {previewOpen && <VideoPreview video={current.video} onClose={() => setPreviewOpen(false)} />}
    <span className="sr-only" role="status" aria-live="polite">Step {graph.history.length}. Current video: {current.video.title}. {current.recommendations.filter((id) => !graph.nodes.find((node) => node.id === id)?.visited).length} neighboring videos.</span>
  </main>;
}

export function App() {
  const [graph, setGraph] = useState<GraphState | null>(null);
  return graph
    ? <Explorer graph={graph} onSelect={(id) => setGraph((previous) => previous ? selectNode(previous, id) : previous)} onClear={() => setGraph(null)} />
    : <StartScreen onStart={(video) => setGraph(createGraph(video))} />;
}
