import { recommendVideos, type Video } from './videos';

export type GraphNode = {
  id: string;
  video: Video;
  q: number;
  r: number;
  x: number;
  y: number;
  visited: boolean;
  current: boolean;
  recommendations: string[];
  parentId?: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  traveled: boolean;
};

export type GraphState = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  currentId: string;
  history: string[];
};

export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
] as const;

export const SPACING = 230;

export function axialToPoint(q: number, r: number) {
  return { x: SPACING * (q + r / 2), y: SPACING * Math.sqrt(3) / 2 * r };
}

const cellId = (q: number, r: number) => `node:${q}:${r}`;
const edgeId = (a: string, b: string) => [a, b].sort().join('|');

function makeNode(video: Video, q: number, r: number, parentId?: string): GraphNode {
  return {
    id: cellId(q, r), video, q, r, ...axialToPoint(q, r),
    visited: false, current: false, recommendations: [], parentId,
  };
}

/** Reveal spokes from the expanded node; retain every earlier connection. */
function connectNeighbors(nodes: GraphNode[], existingEdges: GraphEdge[], currentId: string): GraphEdge[] {
  const occupied = new Map(nodes.map((node) => [node.id, node]));
  const edges = new Map(existingEdges.map((edge) => [edge.id, { ...edge }]));
  const current = occupied.get(currentId);
  if (current) {
    for (const direction of HEX_DIRECTIONS) {
      const neighbor = occupied.get(cellId(current.q + direction.q, current.r + direction.r));
      if (!neighbor) continue;
      const id = edgeId(current.id, neighbor.id);
      if (!edges.has(id)) edges.set(id, { id, source: current.id, target: neighbor.id, traveled: false });
    }
  }
  const connections = new Map<string, Set<string>>();
  for (const edge of edges.values()) {
    if (!connections.has(edge.source)) connections.set(edge.source, new Set());
    if (!connections.has(edge.target)) connections.set(edge.target, new Set());
    connections.get(edge.source)!.add(edge.target);
    connections.get(edge.target)!.add(edge.source);
  }
  for (const node of nodes) {
    node.recommendations = HEX_DIRECTIONS
      .map((direction) => cellId(node.q + direction.q, node.r + direction.r))
      .filter((id) => connections.get(node.id)?.has(id));
  }
  return [...edges.values()];
}

export function createGraph(video: Video): GraphState {
  const current = { ...makeNode(video, 0, 0), current: true };
  const recommended = recommendVideos(video, [video.id], HEX_DIRECTIONS.length);
  const nodes = [current, ...HEX_DIRECTIONS.map((direction, index) => makeNode(recommended[index], direction.q, direction.r, current.id))];
  return {
    nodes, edges: connectNeighbors(nodes, [], current.id), currentId: current.id, history: [current.id],
  };
}

/** Includes both endpoints; an unknown or disconnected target has no route. */
export function shortestPath(state: GraphState, targetId: string): string[] {
  if (!state.nodes.some((node) => node.id === targetId)) return [];
  if (targetId === state.currentId) return [state.currentId];
  const adjacency = new Map<string, string[]>();
  for (const edge of state.edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
    adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), edge.source]);
  }
  const previous = new Map<string, string | null>([[state.currentId, null]]);
  const queue = [state.currentId];
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    for (const neighbor of adjacency.get(id) ?? []) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, id);
      if (neighbor === targetId) {
        const path = [neighbor];
        let step = previous.get(neighbor);
        while (step != null) {
          path.unshift(step);
          step = previous.get(step);
        }
        return path;
      }
      queue.push(neighbor);
    }
  }
  return [];
}

/** Travel existing edges, then reveal adjacent cells without moving old nodes. */
export function selectNode(state: GraphState, id: string): GraphState {
  if (id === state.currentId) return state;
  const route = shortestPath(state, id);
  if (!route.length) return state;

  const passed = new Set(route.slice(0, -1));
  const nodes = state.nodes.map((node) => ({
    ...node, current: node.id === id,
    visited: node.visited || passed.has(node.id),
    recommendations: [...node.recommendations],
  }));
  const selected = nodes.find((node) => node.id === id)!;
  const occupied = new Set(nodes.map((node) => node.id));
  const prior = nodes.find((node) => node.id === route[route.length - 2])!;
  const forwardIndex = HEX_DIRECTIONS.findIndex((direction) => direction.q === selected.q - prior.q && direction.r === selected.r - prior.r);
  // Start directly ahead and work around the current heading. This makes
  // newly exposed territory read as a continuation of the user's journey.
  const offsets = [0, 1, -1, 2, -2, 3];
  const directions = offsets.map((offset) => HEX_DIRECTIONS[(Math.max(0, forwardIndex) + offset + 6) % 6]);
  const freeCells = directions.map((direction) => ({ q: selected.q + direction.q, r: selected.r + direction.r }))
    .filter((cell) => !occupied.has(cellId(cell.q, cell.r)));
  const recommended = recommendVideos(selected.video, nodes.map((node) => node.video.id), freeCells.length);
  freeCells.forEach((cell, index) => nodes.push(makeNode(recommended[index], cell.q, cell.r, selected.id)));

  const traveled = new Set(route.slice(1).map((target, index) => edgeId(route[index], target)));
  const edges = connectNeighbors(nodes, state.edges, id).map((edge) => ({ ...edge, traveled: edge.traveled || traveled.has(edge.id) }));
  return { nodes, edges, currentId: id, history: [...state.history, ...route.slice(1)] };
}

export function getNodeState(node: GraphNode): 'current' | 'visited' | 'next' {
  return node.current ? 'current' : node.visited ? 'visited' : 'next';
}
