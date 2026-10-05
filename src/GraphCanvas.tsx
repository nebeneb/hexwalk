import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { axialToPoint, HEX_DIRECTIONS, shortestPath } from './graph';
import type { GraphNode, GraphState } from './graph';
import { HoverVideoCard, VideoNode } from './components';
import type { VisualNodeState } from './components';

type Point = { x: number; y: number };
type Camera = Point & { zoom: number };
type Segment = { x1: number; y1: number; x2: number; y2: number };
type Rectangle = Point & { width: number; height: number };
export type CanvasControls = { recenter: () => void; zoomBy: (factor: number) => void };
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.8;
const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
const nodeWidth = (state: VisualNodeState) => state === 'current' ? 134 : state === 'unexplored' ? 36 : 100;
const cellKey = (q: number, r: number) => `${q}:${r}`;
const overlapArea = (a: Rectangle, b: Rectangle) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

function segment(from: Point, to: Point, fromRadius: number, toRadius: number): Segment {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / distance;
  const uy = (to.y - from.y) / distance;
  return { x1: from.x + ux * fromRadius, y1: from.y + uy * fromRadius, x2: to.x - ux * toRadius, y2: to.y - uy * toRadius };
}

function GraphEdge({ coordinates, traveled = false, preview = false, quiet = false }: {
  coordinates: Segment; traveled?: boolean; preview?: boolean; quiet?: boolean;
}) {
  return <line {...coordinates} className={`graph-edge ${traveled ? 'is-traveled' : ''} ${preview ? 'is-preview' : ''} ${quiet ? 'is-quiet' : ''}`}
    data-edge-state={preview ? 'preview' : traveled ? 'traveled' : 'available'} vectorEffect="non-scaling-stroke" />;
}

export const GraphCanvas = forwardRef<CanvasControls, {
  graph: GraphState; onSelect: (id: string) => void; onZoomChange: (zoom: number) => void;
}>(function GraphCanvas({ graph, onSelect, onZoomChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  const [bounds, setBounds] = useState({ width: window.innerWidth, height: window.innerHeight });
  const boundsRef = useRef(bounds);
  const initialized = useRef(false);
  const [easing, setEasing] = useState(false);
  const easeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const gesture = useRef({
    pointers: new Map<number, Point>(),
    previous: null as Point | null,
    pinch: null as { distance: number; world: Point; zoom: number } | null,
  });

  const applyCamera = useCallback((next: Camera, smooth = false) => {
    clearTimeout(easeTimeout.current);
    cameraRef.current = next;
    setEasing(smooth);
    setCamera(next);
    if (smooth) easeTimeout.current = setTimeout(() => setEasing(false), 280);
  }, []);

  const recenter = useCallback((smooth = true) => {
    const { width, height } = boundsRef.current;
    const current = graphRef.current.nodes.find((node) => node.id === graphRef.current.currentId)!;
    const zoom = cameraRef.current.zoom;
    const focusY = width < 650 ? (height < 650 ? Math.max(150, (height - 140) / 2) : height * .4) : height * .478;
    applyCamera({ zoom, x: width * (width < 650 ? 0.5 : 0.58) - current.x * zoom, y: focusY - current.y * zoom }, smooth);
  }, [applyCamera]);

  const zoomAt = useCallback((factor: number, anchor: Point, smooth = false) => {
    const previous = cameraRef.current;
    const zoom = clampZoom(previous.zoom * factor);
    const worldX = (anchor.x - previous.x) / previous.zoom;
    const worldY = (anchor.y - previous.y) / previous.zoom;
    applyCamera({ zoom, x: anchor.x - worldX * zoom, y: anchor.y - worldY * zoom }, smooth);
  }, [applyCamera]);

  useImperativeHandle(ref, () => ({
    recenter: () => recenter(),
    zoomBy: (factor) => zoomAt(factor, { x: boundsRef.current.width / 2, y: boundsRef.current.height / 2 }, true),
  }), [recenter, zoomAt]);

  useLayoutEffect(() => {
    const container = containerRef.current!;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      boundsRef.current = next;
      setBounds(next);
      setHovered(null);
      if (!initialized.current) {
        initialized.current = true;
        cameraRef.current.zoom = next.width < 650 ? Math.min(.8, Math.max(.55, (next.height - 300) / 484)) : 1;
      }
      recenter(false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [recenter]);

  useEffect(() => {
    if (initialized.current) recenter();
    setHovered(null);
  }, [graph.currentId, recenter]);

  useEffect(() => { onZoomChange(camera.zoom); }, [camera.zoom, onZoomChange]);
  useEffect(() => () => clearTimeout(easeTimeout.current), []);

  useEffect(() => {
    const container = containerRef.current!;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomAt(Math.exp(-delta * 0.0015), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    container.addEventListener('wheel', wheel, { passive: false });
    return () => container.removeEventListener('wheel', wheel);
  }, [zoomAt]);

  const model = useMemo(() => {
    const current = graph.nodes.find((node) => node.id === graph.currentId)!;
    const adjacent = new Set(current.recommendations);
    const states = new Map(graph.nodes.map((node) => [node.id, (node.current ? 'current' : node.visited ? 'visited' : adjacent.has(node.id) ? 'next' : 'unexplored') as VisualNodeState]));
    const occupied = new Set(graph.nodes.map((node) => cellKey(node.q, node.r)));
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const placeholders = new Map<string, { id: string; source: GraphNode; x: number; y: number }>();
    for (const node of graph.nodes) {
      if (states.get(node.id) !== 'next' || !node.parentId) continue;
      const parent = byId.get(node.parentId)!;
      const q = node.q + node.q - parent.q;
      const r = node.r + node.r - parent.r;
      const id = cellKey(q, r);
      if (!occupied.has(id) && !placeholders.has(id)) placeholders.set(id, { id, source: node, ...axialToPoint(q, r) });
    }
    const stubs: { coordinates: Segment; quiet: boolean }[] = [];
    for (const node of graph.nodes) {
      const state = states.get(node.id)!;
      if (state !== 'next' && state !== 'visited') continue;
      const free = HEX_DIRECTIONS.filter((direction) => !occupied.has(cellKey(node.q + direction.q, node.r + direction.r)) && !placeholders.has(cellKey(node.q + direction.q, node.r + direction.r)));
      for (const direction of free.slice(0, state === 'next' ? 2 : 3)) {
        const target = axialToPoint(node.q + direction.q, node.r + direction.r);
        const distance = Math.hypot(target.x - node.x, target.y - node.y);
        const radius = nodeWidth(state) / 2;
        const length = state === 'next' ? 22 : 10;
        stubs.push({ coordinates: { x1: node.x + (target.x - node.x) / distance * radius, y1: node.y + (target.y - node.y) / distance * radius, x2: node.x + (target.x - node.x) / distance * (radius + length), y2: node.y + (target.y - node.y) / distance * (radius + length) }, quiet: state === 'visited' });
      }
    }
    return { states, byId, placeholders: [...placeholders.values()], stubs };
  }, [graph]);

  const previewEdges = useMemo(() => {
    if (!hovered) return [];
    const route = shortestPath(graph, hovered);
    return route.slice(1).map((id, index) => graph.edges.find((edge) => (edge.source === id && edge.target === route[index]) || (edge.target === id && edge.source === route[index]))).filter((edge) => edge && !edge.traveled);
  }, [graph, hovered]);

  const pointFor = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button') || (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1)) return;
    event.preventDefault();
    containerRef.current!.setPointerCapture(event.pointerId);
    const point = pointFor(event);
    const active = gesture.current;
    active.pointers.set(event.pointerId, point);
    active.previous = point;
    setDragging(true);
    setHovered(null);
    setEasing(false);
    if (active.pointers.size === 2) {
      const [a, b] = [...active.pointers.values()];
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      active.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: cameraRef.current.zoom, world: { x: (center.x - cameraRef.current.x) / cameraRef.current.zoom, y: (center.y - cameraRef.current.y) / cameraRef.current.zoom } };
    }
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active.pointers.has(event.pointerId)) return;
    const point = pointFor(event);
    active.pointers.set(event.pointerId, point);
    if (active.pointers.size === 2 && active.pinch) {
      const [a, b] = [...active.pointers.values()];
      const zoom = clampZoom(active.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, active.pinch.distance));
      applyCamera({ zoom, x: (a.x + b.x) / 2 - active.pinch.world.x * zoom, y: (a.y + b.y) / 2 - active.pinch.world.y * zoom });
    } else if (active.previous) {
      applyCamera({ ...cameraRef.current, x: cameraRef.current.x + point.x - active.previous.x, y: cameraRef.current.y + point.y - active.previous.y });
    }
    active.previous = point;
  };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    gesture.current.pointers.delete(event.pointerId);
    gesture.current.pinch = null;
    gesture.current.previous = [...gesture.current.pointers.values()][0] ?? null;
    if (!gesture.current.pointers.size) setDragging(false);
  };

  const hoveredNode = hovered ? model.byId.get(hovered) : undefined;
  const hoveredState = hovered ? model.states.get(hovered)! : 'next';
  let tooltipX = 0;
  let tooltipY = 0;
  if (hoveredNode) {
    const x = hoveredNode.x * camera.zoom + camera.x;
    const y = hoveredNode.y * camera.zoom + camera.y;
    const radius = nodeWidth(hoveredState) / 2 * camera.zoom;
    const cardHeight = 112;
    const right = { x: x + radius + 40, y: y - 32 };
    const left = { x: x - radius - 250, y: y - 32 };
    const below = { x: x - 105, y: y + radius * .866 + 20 };
    const above = { x: x - 105, y: y - radius * .866 - cardHeight - 20 };
    const candidates = bounds.width < 650 ? [below, above, right, left] : [right, left, below, above];
    const obstacles: Rectangle[] = graph.nodes.map((node) => {
      const width = nodeWidth(model.states.get(node.id)!) * camera.zoom;
      return { x: node.x * camera.zoom + camera.x - width / 2 - 6, y: node.y * camera.zoom + camera.y - width * .433 - 6, width: width + 12, height: width * .866 + 12 };
    });
    obstacles.push(
      { x: 16, y: 16, width: 115, height: 48 },
      { x: bounds.width - 240, y: 16, width: 224, height: 48 },
      { x: 24, y: bounds.height - 236, width: bounds.width < 650 ? 270 : 405, height: 212 },
      { x: bounds.width - 190, y: bounds.height - 180, width: 174, height: 164 },
    );
    const ranked = candidates.map((point, index) => {
      const position = { x: Math.max(16, Math.min(bounds.width - 226, point.x)), y: Math.max(16, Math.min(bounds.height - cardHeight - 16, point.y)) };
      const card = { ...position, width: 210, height: cardHeight };
      const score = obstacles.reduce((total, obstacle) => total + overlapArea(card, obstacle), 0) + Math.hypot(position.x - point.x, position.y - point.y) * 8 + index * 24;
      return { position, score };
    }).sort((a, b) => a.score - b.score);
    tooltipX = ranked[0].position.x;
    tooltipY = ranked[0].position.y;
  }

  return <div ref={containerRef} className={`graph-canvas ${dragging ? 'is-dragging' : ''}`} role="region" aria-label="Video exploration canvas"
    aria-describedby="canvas-instructions" tabIndex={0} data-testid="graph-canvas" data-camera-x={camera.x} data-camera-y={camera.y} data-zoom={camera.zoom}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
    onKeyDown={(event) => {
      if (event.key === 'Escape') setHovered(null);
      if (event.target !== event.currentTarget) return;
      const offsets: Record<string, Point> = { ArrowLeft: { x: 60, y: 0 }, ArrowRight: { x: -60, y: 0 }, ArrowUp: { x: 0, y: 60 }, ArrowDown: { x: 0, y: -60 } };
      if (offsets[event.key]) { event.preventDefault(); applyCamera({ ...cameraRef.current, x: cameraRef.current.x + offsets[event.key].x, y: cameraRef.current.y + offsets[event.key].y }, true); }
      if (event.key === '+' || event.key === '=') zoomAt(1.2, { x: bounds.width / 2, y: bounds.height / 2 }, true);
      if (event.key === '-') zoomAt(1 / 1.2, { x: bounds.width / 2, y: bounds.height / 2 }, true);
      if (event.key === 'Home') { event.preventDefault(); recenter(); }
    }}>
    <p className="sr-only" id="canvas-instructions">Drag the canvas to pan. Scroll or pinch to zoom. Use arrow keys to pan, plus and minus to zoom, and Home to recenter. Select a video to explore its neighbors.</p>
    <div className={`graph-world ${easing ? 'is-easing' : ''}`} style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
      <svg className="graph-edges" width="1" height="1" aria-hidden="true">
        {graph.edges.map((edge) => {
          const source = model.byId.get(edge.source)!;
          const target = model.byId.get(edge.target)!;
          return <GraphEdge key={edge.id} coordinates={segment(source, target, nodeWidth(model.states.get(source.id)!) / 2, nodeWidth(model.states.get(target.id)!) / 2)} traveled={edge.traveled} quiet={!edge.traveled && !source.current && !target.current} />;
        })}
        {model.placeholders.map((placeholder) => <GraphEdge key={`edge-${placeholder.id}`} coordinates={segment(placeholder.source, placeholder, 50, 18)} quiet />)}
        {model.stubs.map((stub, index) => <GraphEdge key={`stub-${index}`} coordinates={stub.coordinates} quiet={stub.quiet} />)}
        {previewEdges.map((edge) => {
          if (!edge) return null;
          const source = model.byId.get(edge.source)!;
          const target = model.byId.get(edge.target)!;
          return <GraphEdge key={`preview-${edge.id}`} coordinates={segment(source, target, nodeWidth(model.states.get(source.id)!) / 2, nodeWidth(model.states.get(target.id)!) / 2)} preview />;
        })}
      </svg>
      {model.placeholders.map((placeholder) => <span key={`placeholder-${placeholder.id}`} className="unexplored-placeholder hex" style={{ left: placeholder.x, top: placeholder.y }} aria-hidden="true" />)}
      {graph.nodes.map((node) => <VideoNode key={node.id} node={node} state={model.states.get(node.id)!} hovered={hovered === node.id} onHover={setHovered} onSelect={onSelect} />)}
    </div>
    {hoveredNode && !dragging && <HoverVideoCard node={hoveredNode} state={hoveredState} x={tooltipX} y={tooltipY} />}
  </div>;
});
