import { expect, test } from '@playwright/test';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  axialToPoint, createGraph, getNodeState, HEX_DIRECTIONS,
  selectNode, shortestPath, SPACING, type GraphNode, type GraphState,
} from '../src/graph';
import { recommendVideos, searchVideos, videos } from '../src/videos';

const rootVideo = videos[0];

function byId(state: GraphState, id: string): GraphNode {
  const node = state.nodes.find((candidate) => candidate.id === id);
  expect(node, `graph includes ${id}`).toBeDefined();
  return node!;
}

function axialDistance(a: GraphNode, b: GraphNode): number {
  return Math.max(
    Math.abs(a.q - b.q), Math.abs(a.r - b.r),
    Math.abs(a.q + a.r - b.q - b.r),
  );
}

function nextOutwardNode(state: GraphState): GraphNode {
  const current = byId(state, state.currentId);
  const options = current.recommendations.map((id) => byId(state, id))
    .filter((node) => !node.visited && !node.current)
    .sort((a, b) => b.q - a.q || b.r - a.r);
  expect(options.length, 'the frontier always offers a next step').toBeGreaterThan(0);
  return options[0];
}

function edgeBetween(state: GraphState, a: string, b: string) {
  return state.edges.find((edge) => (edge.source === a && edge.target === b)
    || (edge.source === b && edge.target === a));
}

test('a starting video has six equal-distance options and local video data', () => {
  const state = createGraph(rootVideo);
  expect(state.nodes).toHaveLength(7);
  expect(state.edges).toHaveLength(6);
  expect(state.history).toEqual([state.currentId]);
  expect(state.nodes.filter((node) => node.current)).toHaveLength(1);
  expect(state.nodes.filter((node) => node.visited)).toHaveLength(0);
  expect(state.edges.every((edge) => !edge.traveled)).toBe(true);

  const current = byId(state, state.currentId);
  expect(current.video).toEqual(rootVideo);
  expect([current.q, current.r, current.x, current.y]).toEqual([0, 0, 0, 0]);
  expect(current.recommendations).toHaveLength(6);
  expect(getNodeState(current)).toBe('current');
  for (const direction of HEX_DIRECTIONS) {
    const option = state.nodes.find((node) => node.q === direction.q && node.r === direction.r)!;
    expect(option).toBeDefined();
    expect(getNodeState(option)).toBe('next');
    expect(Math.hypot(option.x, option.y)).toBeCloseTo(SPACING, 8);
    expect(edgeBetween(state, current.id, option.id)?.traveled).toBe(false);
  }
  expect(new Set(state.nodes.map((node) => node.video.id)).size).toBe(7);
});

test('selection visits the previous video, travels its edge, and reveals new options', () => {
  const initial = createGraph(rootVideo);
  const selectedId = byId(initial, initial.currentId).recommendations[0];
  const next = selectNode(initial, selectedId);
  expect(next.currentId).toBe(selectedId);
  expect(next.history).toEqual([initial.currentId, selectedId]);
  expect(getNodeState(byId(next, initial.currentId))).toBe('visited');
  expect(getNodeState(byId(next, selectedId))).toBe('current');
  expect(edgeBetween(next, initial.currentId, selectedId)?.traveled).toBe(true);
  expect(next.edges.filter((edge) => edge.traveled)).toHaveLength(1);
  expect(next.nodes.length).toBeGreaterThan(initial.nodes.length);

  const current = byId(next, selectedId);
  const options = current.recommendations.map((id) => byId(next, id)).filter((node) => !node.visited);
  expect(options.length).toBeGreaterThanOrEqual(4);
  expect(options.length).toBeLessThanOrEqual(6);
  expect(next.nodes.some((node) => node.parentId === selectedId)).toBe(true);
  expect(initial.nodes.every((node) => next.nodes.some((candidate) => candidate.id === node.id))).toBe(true);
});

test('graph transitions are immutable and preserve every existing coordinate', () => {
  let state = createGraph(rootVideo);
  for (let step = 0; step < 10; step += 1) {
    const previous = state;
    const snapshot = structuredClone(previous);
    const coordinates = new Map(previous.nodes.map((node) => [node.id, [node.q, node.r, node.x, node.y]]));
    state = selectNode(previous, nextOutwardNode(previous).id);
    expect(previous).toEqual(snapshot);
    expect(state).not.toBe(previous);
    for (const [id, position] of coordinates) {
      const node = byId(state, id);
      expect([node.q, node.r, node.x, node.y]).toEqual(position);
    }
    for (const edge of previous.edges.filter((candidate) => candidate.traveled)) {
      expect(state.edges.find((candidate) => candidate.id === edge.id)?.traveled).toBe(true);
    }
  }
});

test('twenty frontier steps keep unique occupied cells and connect only adjacent cells', () => {
  let state = createGraph(rootVideo);
  for (let step = 0; step < 20; step += 1) {
    state = selectNode(state, nextOutwardNode(state).id);
    expect(new Set(state.nodes.map((node) => node.id)).size).toBe(state.nodes.length);
    expect(new Set(state.nodes.map((node) => `${node.q}:${node.r}`)).size).toBe(state.nodes.length);
    expect(new Set(state.edges.map((edge) => edge.id)).size).toBe(state.edges.length);
    expect(state.nodes.filter((node) => node.current)).toHaveLength(1);
    for (const node of state.nodes) {
      expect({ x: node.x, y: node.y }).toEqual(axialToPoint(node.q, node.r));
      expect(new Set(node.recommendations).size).toBe(node.recommendations.length);
      for (const id of node.recommendations) {
        expect(axialDistance(node, byId(state, id))).toBe(1);
        expect(edgeBetween(state, node.id, id)).toBeDefined();
      }
    }
    for (const edge of state.edges) {
      expect(axialDistance(byId(state, edge.source), byId(state, edge.target))).toBe(1);
    }
  }
  expect(state.history).toHaveLength(21);
  expect(state.nodes.length).toBeGreaterThan(videos.length);
});

test('returning to history walks a shortest existing route and records each intermediate step', () => {
  let state = createGraph(rootVideo);
  const originId = state.currentId;
  for (let step = 0; step < 12; step += 1) state = selectNode(state, nextOutwardNode(state).id);
  const route = shortestPath(state, originId);
  expect(route[0]).toBe(state.currentId);
  expect(route.at(-1)).toBe(originId);
  expect(route.length).toBeGreaterThan(2);
  for (let index = 1; index < route.length; index += 1) {
    expect(edgeBetween(state, route[index - 1], route[index])).toBeDefined();
  }

  const next = selectNode(state, originId);
  expect(next.history).toEqual([...state.history, ...route.slice(1)]);
  expect(next.currentId).toBe(originId);
  expect(next.nodes).toHaveLength(state.nodes.length);
  for (const id of route.slice(0, -1)) expect(byId(next, id).visited).toBe(true);
  for (let index = 1; index < route.length; index += 1) {
    expect(edgeBetween(next, route[index - 1], route[index])?.traveled).toBe(true);
  }
  expect(getNodeState(byId(next, originId))).toBe('current');
});

test('current, unknown, and unreachable selections leave the graph unchanged', () => {
  const state = createGraph(rootVideo);
  expect(selectNode(state, state.currentId)).toBe(state);
  expect(shortestPath(state, state.currentId)).toEqual([state.currentId]);
  expect(selectNode(state, 'missing')).toBe(state);
  expect(shortestPath(state, 'missing')).toEqual([]);
  const disconnected = { ...state, edges: [] };
  expect(shortestPath(disconnected, state.nodes[1].id)).toEqual([]);
  expect(selectNode(disconnected, state.nodes[1].id)).toBe(disconnected);
});

test('mock videos have realistic metadata and existing local reference thumbnails', () => {
  expect(videos.length).toBeGreaterThanOrEqual(24);
  expect(new Set(videos.map((video) => video.id)).size).toBe(videos.length);
  expect(videos[0]).toMatchObject({
    id: 'ocean-motion', title: 'Why ocean swells travel thousands of miles', channel: 'Littoral', duration: '18:42',
  });
  expect(videos.find((video) => video.id === 'deep-sea')).toMatchObject({
    title: 'How whales sing across entire oceans', channel: 'Deep Field', duration: '14:08',
  });
  for (const video of videos) {
    expect(video.title.length).toBeGreaterThan(10);
    expect(video.channel.length).toBeGreaterThan(1);
    expect(video.duration).toMatch(/^\d{1,2}:\d{2}$/);
    expect(video.thumbnail).toMatch(/^\/thumbnails\/[a-f0-9]+\.jpg$/);
    const thumbnail = fileURLToPath(new URL(`../public${video.thumbnail}`, import.meta.url));
    expect(statSync(thumbnail).isFile()).toBe(true);
  }
  expect(new Set(videos.map((video) => video.thumbnail)).size).toBe(10);
  expect(searchVideos('ocean')[0].title.toLowerCase()).toContain('ocean');
  expect(searchVideos('Littoral')).toContainEqual(rootVideo);
  expect(searchVideos('an entirely unknown query')).toHaveLength(5);
});

test('recommendations are stable, varied, and exhaust unseen videos before catalog reuse', () => {
  const recommendations = recommendVideos(rootVideo, [rootVideo.id], 6);
  expect(recommendVideos(rootVideo, [rootVideo.id], 6)).toEqual(recommendations);
  expect(new Set(recommendations.map((video) => video.id)).size).toBe(6);
  expect(new Set(recommendations.map((video) => video.thumbnail)).size).toBe(6);
  expect(recommendations.every((video) => video.id !== rootVideo.id)).toBe(true);
  expect(recommendVideos(rootVideo, [], 0)).toEqual([]);

  const unseen = videos.slice(-2);
  const excluded = videos.slice(0, -2).map((video) => video.id);
  const recycled = recommendVideos(rootVideo, excluded, 5);
  expect(new Set(recycled.slice(0, 2).map((video) => video.id))).toEqual(new Set(unseen.map((video) => video.id)));
  expect(recycled.slice(2).every((video) => excluded.includes(video.id))).toBe(true);
  expect(recycled.every((video) => video.id !== rootVideo.id)).toBe(true);
});
