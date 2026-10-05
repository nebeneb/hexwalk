# hexwalk

A visual video discovery prototype. Search for a starting video, then follow recommendations through a persistent hexagonal map. Video data, recommendations, and the preview player are mocked; no YouTube API key is needed.

## Development

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm test
```

Browser checks use system Chromium when available. Otherwise install the Playwright browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a Chromium executable.

## Exploring

- Type a query and select a result, or press Enter to start with the first result.
- Hover or focus a hexagon for its title and metadata. Select it to move along the graph.
- Drag empty canvas space to pan. Scroll or pinch to zoom; the zoom controls work too.
- Recenter returns to the current video. History and the miniature path markers let you revisit earlier videos. Clear returns to the empty search screen.
- Focus the canvas to pan with arrow keys, zoom with `+` / `−`, and recenter with Home.

`src/graph.ts` owns the pure traversal state and fixed axial coordinates. `src/videos.ts` supplies local mock search and recommendations. The SVG edges and HTML hexagons in `GraphCanvas` share a camera transform; exploring never rearranges existing nodes.

The supplied HTML design archives are treated as visual reference data. Their ten thumbnail illustrations and corner lattice are reused locally in `public/`; Geist and Geist Mono are bundled locally. No remote asset requests are required.
