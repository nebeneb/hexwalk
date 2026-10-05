import { expect, test, type Page } from '@playwright/test';

async function startExploring(page: Page) {
  await page.goto('/');
  await page.getByRole('combobox').fill('ocean');
  await page.getByRole('combobox').press('Enter');
  await expect(page.locator('[data-node-state="current"]')).toHaveCount(1);
}

test('the empty start screen preserves the reference layout and local typography', async ({ page }) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4173/')) remoteRequests.push(request.url()); });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const field = page.locator('.search-field');
  await expect(field).toHaveCSS('width', '640px');
  await expect(field).toHaveCSS('height', '56px');
  await expect(field).toHaveCSS('border-radius', '28px');
  const box = (await field.boundingBox())!;
  expect(box.x).toBe(400);
  expect(box.y).toBe(422);
  await expect(page.getByRole('combobox')).toHaveValue('');
  await expect(page.locator('.brand')).toHaveCSS('font-family', 'Geist, sans-serif');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByTestId('graph-canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('search supports result selection with keyboard and pointer', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox');
  await search.fill('wave');
  const options = page.getByRole('option');
  await expect(options).toHaveCount(3);
  const selectedTitle = await options.nth(1).locator('.result-title').innerText();
  await search.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(selectedTitle);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await search.fill('ocean');
  const pointerTitle = await options.first().locator('.result-title').innerText();
  await options.first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(pointerTitle);
});

test('hover previews and repeated traversal preserve the map and red journey', async ({ page }) => {
  await startExploring(page);
  await expect(page.locator('[data-node-state="next"]')).toHaveCount(6);
  const initial = await page.locator('[data-node-id]').evaluateAll((nodes) => nodes.map((node) => ({ id: node.getAttribute('data-node-id')!, x: node.getAttribute('data-x')!, y: node.getAttribute('data-y')! })));
  const first = page.locator('[data-node-state="next"]').first();
  const nextId = await first.getAttribute('data-node-id');
  await first.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(page.getByRole('tooltip').locator('.hover-status')).toHaveText('NEXT');
  await expect(page.locator('[data-edge-state="preview"]')).toHaveCount(1);
  const nextTitle = await page.getByRole('tooltip').locator('.hover-title').innerText();
  await first.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(nextTitle);
  await expect(page.locator(`[data-node-id="${nextId}"]`)).toHaveAttribute('data-node-state', 'current');
  const previous = page.locator('[data-node-id="node:0:0"]');
  await expect(previous).toHaveAttribute('data-node-state', 'visited');
  await expect(previous.locator('img')).toHaveCSS('filter', 'grayscale(1)');
  await expect(page.locator('[data-edge-state="traveled"]')).toHaveCount(1);
  await expect(page.locator('[data-node-state="next"]')).toHaveCount(5);
  expect(await page.locator('[data-node-id]').count()).toBeGreaterThan(7);
  for (const node of initial) {
    await expect(page.locator(`[data-node-id="${node.id}"]`)).toHaveAttribute('data-x', node.x);
    await expect(page.locator(`[data-node-id="${node.id}"]`)).toHaveAttribute('data-y', node.y);
  }
  for (let step = 0; step < 3; step++) {
    await page.locator('[data-node-state="next"]').first().click();
    await page.waitForTimeout(300);
  }
  await expect(page.locator('.step-counter')).toHaveText('STEP 05');
  await expect(page.locator('[data-node-state="visited"]')).toHaveCount(4);
  await expect(page.locator('[data-edge-state="traveled"]')).toHaveCount(4);
  expect(await page.locator('[data-node-state="unexplored"]').count()).toBeGreaterThan(0);
});

test('pan, cursor-centered wheel zoom, zoom limits, recenter and keyboard controls work', async ({ page }) => {
  await startExploring(page);
  const canvas = page.getByTestId('graph-canvas');
  const readCamera = () => canvas.evaluate((element) => ({ x: Number(element.getAttribute('data-camera-x')), y: Number(element.getAttribute('data-camera-y')), zoom: Number(element.getAttribute('data-zoom')) }));
  const original = await readCamera();
  await page.mouse.move(400, 100);
  await page.mouse.down();
  await page.mouse.move(490, 170, { steps: 5 });
  await page.mouse.up();
  const panned = await readCamera();
  expect(panned.x).toBeCloseTo(original.x + 90);
  expect(panned.y).toBeCloseTo(original.y + 70);
  const anchor = { x: 450, y: 300 };
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.wheel(0, -180);
  await expect.poll(async () => (await readCamera()).zoom).toBeGreaterThan(panned.zoom);
  const zoomed = await readCamera();
  expect((anchor.x - zoomed.x) / zoomed.zoom).toBeCloseTo((anchor.x - panned.x) / panned.zoom);
  expect((anchor.y - zoomed.y) / zoomed.zoom).toBeCloseTo((anchor.y - panned.y) / panned.zoom);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  expect((await readCamera()).zoom).toBeGreaterThan(zoomed.zoom);
  await page.getByRole('button', { name: 'Recenter', exact: true }).click();
  const centered = await readCamera();
  expect(centered.x).toBeCloseTo(1440 * .58);
  expect(centered.y).toBeCloseTo(900 * .478);
  await canvas.focus();
  await canvas.press('ArrowLeft');
  expect((await readCamera()).x).toBeCloseTo(centered.x + 60);
  await canvas.press('Home');
  expect((await readCamera()).x).toBeCloseTo(centered.x);
  await page.mouse.move(450, 300);
  await page.mouse.wheel(0, -10000);
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled();
  await page.mouse.wheel(0, 10000);
  await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
  await expect(page.getByRole('status', { name: 'Zoom percentage' })).toHaveText('40%');
});

test('history revisits, the mock preview, and clear work without losing the graph', async ({ page }) => {
  await startExploring(page);
  const originalTitle = await page.getByRole('heading', { level: 1 }).innerText();
  await page.locator('[data-node-state="next"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('[data-node-state="next"]').first().click();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Exploration history' }).locator('li')).toHaveCount(3);
  await page.locator('.history-list button').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(originalTitle);
  await expect(page.getByRole('button', { name: 'History', exact: true })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('[data-edge-state="traveled"]').count()).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Watch', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Playback is not connected in this prototype.')).toBeVisible();
  await page.getByRole('button', { name: 'Close video preview' }).press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Watch', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('combobox')).toHaveValue('');
  await expect(page.locator('[data-node-id]')).toHaveCount(0);
});

test('mobile keeps the canvas, readable controls, and touch pinch interaction', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: 'http://127.0.0.1:4173' });
  const page = await context.newPage();
  await startExploring(page);
  await expect(page.locator('.zoom-controls output')).toHaveText('80%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const navigation = (await page.locator('.top-navigation').boundingBox())!;
  const brand = (await page.locator('.brand').boundingBox())!;
  expect(navigation.x).toBeGreaterThan(brand.x + brand.width);
  const nowPlaying = (await page.locator('.now-playing').boundingBox())!;
  const zoomControls = (await page.locator('.zoom-controls').boundingBox())!;
  expect(nowPlaying.y + nowPlaying.height).toBeLessThan(zoomControls.y);
  const canvas = page.getByTestId('graph-canvas');
  const session = await context.newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number; id: number }[]) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await send('touchStart', [{ x: 100, y: 300, id: 0 }, { x: 290, y: 400, id: 1 }]);
  await send('touchMove', [{ x: 70, y: 270, id: 0 }, { x: 320, y: 430, id: 1 }]);
  await send('touchEnd', []);
  await expect.poll(async () => Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThan(.8);
  await page.getByRole('button', { name: 'Recenter', exact: true }).tap();
  await expect(page.locator('[data-node-state="current"]')).toHaveCount(1);
  await context.close();
});

test('hover metadata avoids neighboring nodes when there is free space', async ({ page }) => {
  await startExploring(page);
  await page.locator('[data-node-id="node:0:-1"]').hover();
  const card = (await page.getByRole('tooltip').boundingBox())!;
  const neighbor = (await page.locator('[data-node-id="node:1:-1"]').boundingBox())!;
  const overlapWidth = Math.max(0, Math.min(card.x + card.width, neighbor.x + neighbor.width) - Math.max(card.x, neighbor.x));
  const overlapHeight = Math.max(0, Math.min(card.y + card.height, neighbor.y + neighbor.height) - Math.max(card.y, neighbor.y));
  expect(overlapWidth * overlapHeight).toBe(0);
});

test('the preview remains closable in a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await startExploring(page);
  await page.getByRole('button', { name: 'Watch', exact: true }).click();
  const close = page.getByRole('button', { name: 'Close video preview' });
  const box = (await close.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(360);
  await close.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the lower branches remain selectable in a narrow compact viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const id of ['node:0:1', 'node:-1:1']) {
    await startExploring(page);
    const option = page.locator(`[data-node-id="${id}"]`);
    const nodeBox = (await option.boundingBox())!;
    const information = (await page.locator('.now-playing').boundingBox())!;
    expect(nodeBox.y + nodeBox.height / 2).toBeLessThan(information.y);
    await option.click();
    await expect(option).toHaveAttribute('data-node-state', 'current');
  }
});
