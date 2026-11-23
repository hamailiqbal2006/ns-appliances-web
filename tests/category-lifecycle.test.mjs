import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const nodeRequire = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Execute the real server modules with deterministic HTTP and Next.js boundaries.
// No database credentials, production records, or extra test packages are needed.
function harness(initial = []) {
  const db = { categories: structuredClone(initial), products: [], calls: [], tags: [], paths: [],
    connected: true, productReadFails: false, categoryReadFails: false, noDelete: false, noUpdate: false,
    showcase: [], verifiedMedia: [], savedShowcase: null };
  const cache = new Map();
  const admin = {
    getSupabaseConfig: () => db.connected ? { url: 'https://catalog.test', key: 'test-public-key' } : null,
    isSupabaseConfigured: () => db.connected,
    requireAdminForAction: async () => ({ accessToken: 'test-session', admin: { id: 'admin' } }),
    productImageUrl: () => null,
    verifyShowcaseMediaPath: async (path, kind, slot) => { db.verifiedMedia.push({ path, kind, slot }); return path; },
    saveCategoryShowcaseSettings: async payload => { db.savedShowcase = payload; },
    cleanupReplacedShowcaseMedia: async () => {},
  };
  async function fetchMock(input, init = {}) {
    const url = new URL(input, 'https://catalog.test');
    const method = init.method || 'GET';
    db.calls.push({ url, method, init });
    if (url.pathname === '/api/admin/showcase-media-upload') return Response.json({ path: 'category-showcase/cooling-12345678-1234-1234-1234-123456789012.png', uploadUrl: 'https://storage.test/upload' });
    if (url.hostname === 'storage.test') return new Response(null, { status: 200 });
    if (url.pathname.endsWith('/homepage_category_showcase')) return Response.json(db.showcase);
    if (url.pathname.endsWith('/categories')) {
      if (method === 'GET') {
        if (db.categoryReadFails) return Response.json({ message: 'unavailable' }, { status: 503 });
        const rows = url.searchParams.has('is_active') ? db.categories.filter(c => c.is_active) : db.categories;
        return Response.json(rows);
      }
      const id = url.searchParams.get('id')?.slice(3);
      if (method === 'DELETE') {
        const removed = db.noDelete ? [] : db.categories.filter(c => c.id === id);
        if (!db.noDelete) db.categories = db.categories.filter(c => c.id !== id);
        return Response.json(removed);
      }
      const payload = JSON.parse(init.body);
      if (method === 'PATCH') {
        if (db.noUpdate) return Response.json([]);
        const row = db.categories.find(c => c.id === id);
        if (!row) return Response.json([]);
        Object.assign(row, payload);
        return Response.json([row]);
      }
      const row = { ...payload, id: `created-${db.categories.length}` };
      db.categories.push(row);
      return Response.json([row]);
    }
    if (url.pathname.endsWith('/products')) {
      if (db.productReadFails) return Response.json({}, { status: 503 });
      let rows = db.products;
      const filter = url.searchParams.get('or');
      if (filter) rows = rows.filter(p => filter.includes(`"${p.category_slug}"`) || filter.includes(`"${p.subcategory_slug}"`));
      return Response.json(rows);
    }
    return Response.json([]);
  }
  function load(relative) {
    let filename = path.resolve(__dirname, '..', relative);
    if (!fs.existsSync(filename)) filename += '.ts';
    if (cache.has(filename)) return cache.get(filename).exports;
    const moduleShim = { exports: {} };
    cache.set(filename, moduleShim);
    function localRequire(specifier) {
      if (specifier === 'server-only') return {};
      if (specifier === '@/lib/supabase-admin' || filename.endsWith('category-showcase.server.ts') && specifier === './supabase-admin') return admin;
      if (specifier === 'next/cache') return {
        updateTag: tag => db.tags.push(tag), revalidatePath: (...args) => db.paths.push(args),
        cacheLife() {}, cacheTag() {},
      };
      if (specifier === 'next/navigation') return {
        redirect: destination => { throw Object.assign(new Error('NEXT_REDIRECT'), { destination }); },
        notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
      };
      if (specifier === 'next/server') return { NextResponse: { json: Response.json } };
      if (specifier.startsWith('@/')) return load(`src/${specifier.slice(2)}`);
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(filename), specifier);
        if (resolved.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'));
        return load(path.relative(path.resolve(__dirname, '..'), resolved));
      }
      if (specifier.startsWith('next/')) return {};
      return nodeRequire(specifier);
    }
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText;
    vm.runInNewContext(output, { module: moduleShim, exports: moduleShim.exports, require: localRequire,
      fetch: fetchMock, Response, FormData, File, URL, URLSearchParams, Error, console, process,
      Buffer, structuredClone, setTimeout, clearTimeout }, { filename });
    return moduleShim.exports;
  }
  return { db, load };
}
const category = (overrides = {}) => ({ id: 'cat1', name: 'Washing Machines', slug: 'washing-machines',
  editorial_group: 'laundry', display_order: 2, is_active: true, description: null,
  subcategories: [{ name: 'Single Tub Washer', slug: 'single-tub' }], ...overrides });

test('showcase image saves use scoped uploaded references and preserve existing media', async () => {
  const { db, load } = harness([category()]);
  const oldPath = 'category-showcase/laundry-12345678-1234-1234-1234-123456789012.png';
  const newPath = 'category-showcase/cooling-12345678-1234-1234-1234-123456789012.webp';
  db.showcase = [{ category_slug: 'laundry', sort_order: 0, image_path: oldPath }];
  const { saveCategoryShowcaseAction } = load('src/app/admin/actions.ts');
  const form = new FormData();
  form.set('showcase_configuration', JSON.stringify(['cooling', 'laundry', 'kitchen-everyday', 'home'].map(categorySlug => ({ categorySlug, imagePath: 'untrusted-client-path' }))));
  form.set('image_path_cooling', newPath);
  const result = await saveCategoryShowcaseAction({ error: null }, form);
  assert.equal(result.success, true, result.error);
  assert.equal(db.savedShowcase.find(row => row.category_slug === 'laundry').image_path, oldPath);
  assert.equal(db.savedShowcase.find(row => row.category_slug === 'cooling').image_path, newPath);
  assert.equal(db.verifiedMedia.length, 1);
});

test('showcase media references stay within their intended bucket and slot', () => {
  const { load } = harness();
  const { isShowcaseMediaPath, showcaseMediaTarget } = load('src/lib/showcase-media.ts');
  const uuid = '12345678-1234-1234-1234-123456789012';
  assert.equal(showcaseMediaTarget('desktop', 'banner_4').bucket, 'homepage-banners');
  assert.equal(isShowcaseMediaPath(`category-showcase/cooling-${uuid}.png`, 'category', 'cooling'), true);
  assert.equal(isShowcaseMediaPath(`category-showcase/laundry-${uuid}.png`, 'category', 'cooling'), false);
  assert.equal(isShowcaseMediaPath(`banner/m-${uuid}.png`, 'desktop', 'banner_4'), false);
  assert.throws(() => showcaseMediaTarget('desktop', '../other'));
});

test('showcase uploads send only metadata to the Worker and reuse successful uploads on retry', async () => {
  const { db, load } = harness();
  const { uploadShowcaseMedia } = load('src/lib/showcase-media-client.ts');
  const photo = new File([new Uint8Array(1024)], 'cutout.png', { type: 'image/png' });
  const first = await uploadShowcaseMedia(photo, 'category', 'cooling');
  assert.equal(await uploadShowcaseMedia(photo, 'category', 'cooling'), first);
  assert.equal(db.calls.length, 2);
  assert.equal(db.calls[0].method, 'POST');
  assert.deepEqual(JSON.parse(db.calls[0].init.body), { kind: 'category', slot: 'cooling', contentType: 'image/png', size: 1024 });
  assert.equal(db.calls[1].method, 'PUT');
  assert.equal(db.calls[1].url.hostname, 'storage.test');
  assert.equal(db.calls[1].init.body, photo);
});
function form(overrides = {}) {
  const result = new FormData();
  Object.entries({ name: 'New Fans', slug: 'new-fans', editorial_group: 'cooling',
    display_order: '0', is_active: 'true', subcategories: '', ...overrides }).forEach(([k, v]) => result.set(k, v));
  return result;
}
async function redirects(action, data, destination = '/admin/categories') {
  await assert.rejects(action({ error: null }, data), e => e.message === 'NEXT_REDIRECT' && e.destination === destination);
}

test('create persists Active=true and redirects instead of returning NEXT_REDIRECT as an error', async () => {
  const { db, load } = harness();
  await redirects(load('src/app/admin/actions').saveCategoryAction, form());
  assert.equal(db.categories[0].is_active, true);
  assert.deepEqual(db.tags.sort(), ['categories', 'category-showcase', 'public-products'].sort());
  assert.ok(db.paths.some(p => p[0] === '/category/[category]/[subcategory]'));
});
test('archive and restore use the hidden switch value correctly', async () => {
  const { db, load } = harness([category()]);
  const action = load('src/app/admin/actions').saveCategoryAction;
  const data = { id: 'cat1', name: 'Washing Machines', slug: 'washing-machines', editorial_group: 'laundry' };
  await redirects(action, form({ ...data, is_active: 'false' }));
  assert.equal(db.categories[0].is_active, false);
  await redirects(action, form({ ...data, is_active: 'true' }));
  assert.equal(db.categories[0].is_active, true);
});
test('existing subcategory slugs survive a normal category edit', async () => {
  const { db, load } = harness([category()]);
  await redirects(load('src/app/admin/actions').saveCategoryAction, form({ id: 'cat1', name: 'Washers',
    slug: 'washing-machines', editorial_group: 'laundry', subcategories: 'Single Tub Washer' }));
  assert.equal(db.categories[0].subcategories[0].slug, 'single-tub');
});
test('invalid display orders and duplicate subcategory slugs do not write records', async () => {
  const { db, load } = harness();
  const action = load('src/app/admin/actions').saveCategoryAction;
  for (const display_order of ['-1', '1.5', '1abc', 'Infinity', '2147483648']) {
    assert.match((await action({ error: null }, form({ display_order }))).error, /whole number/);
  }
  assert.match((await action({ error: null }, form({ subcategories: 'One:shared\nTwo:shared' }))).error, /different URL slug/);
  assert.equal(db.categories.length, 0);
});
test('empty managed categories and backend failures never resurrect demo categories', async () => {
  const { db, load } = harness();
  const get = load('src/lib/categories').getStorefrontCategories;
  assert.equal((await get()).length, 0);
  db.categoryReadFails = true;
  assert.equal((await get()).length, 0);
  db.connected = false;
  assert.equal((await get()).length, 9);
});
test('homepage links use live names, order, and editorial groups; archived/deleted categories disappear', () => {
  const { load } = harness();
  const { bindShowcaseCategories, getDefaultCategoryShowcase } = load('src/lib/category-showcase');
  const bound = bindShowcaseCategories(getDefaultCategoryShowcase(), [
    category({ name: 'New Laundry Name' }), category({ id: 'archived', is_active: false, slug: 'dryer-machines' }),
    category({ id: 'new', name: 'Custom Appliances', slug: 'custom-appliances', editorial_group: 'home' }),
  ], true);
  assert.equal(bound.length, 2);
  assert.equal(bound[0].subcategories[0].name, 'New Laundry Name');
  assert.equal(bound[1].subcategories[0].slug, 'custom-appliances');
  assert.equal(bindShowcaseCategories(getDefaultCategoryShowcase(), [], true).length, 0);
});
test('missing category routes fail resolution instead of showing the first unrelated category', () => {
  const { load } = harness();
  const { findCategoryForRoute, findCategoryForProduct } = load('src/lib/category-types');
  const categories = [category()];
  assert.equal(findCategoryForRoute('laundry', 'dryer-machines', categories), null);
  assert.equal(findCategoryForRoute('cooling', 'washing-machines', categories), null);
  assert.equal(findCategoryForProduct('dryer-machines', 'spin-dryer', categories), null);
  assert.equal(findCategoryForRoute('laundry', 'washing-machines', categories).id, 'cat1');
  assert.equal(findCategoryForRoute('washing-machines', 'single-tub', categories).id, 'cat1');
});
test('delete removes the actual row, invalidates caches, and redirects', async () => {
  const { db, load } = harness([category()]);
  await redirects(load('src/app/admin/actions').deleteCategoryAction, form({ id: 'cat1', slug: 'washing-machines' }));
  assert.equal(db.categories.length, 0);
  assert.ok(db.tags.includes('category-showcase'));
  assert.ok(db.calls.find(c => c.method === 'DELETE').init.headers.Prefer.includes('representation'));
});
test('failed product checks and no-op deletes report errors instead of pretending success', async () => {
  const { db, load } = harness([category()]);
  const action = load('src/app/admin/actions').deleteCategoryAction;
  const data = form({ id: 'cat1', slug: 'washing-machines' });
  db.productReadFails = true;
  assert.match((await action({ error: null }, data)).error, /Cannot verify assigned products/);
  assert.equal(db.calls.filter(c => c.method === 'DELETE').length, 0);
  db.productReadFails = false; db.noDelete = true;
  assert.match((await action({ error: null }, data)).error, /No category was deleted/);
  assert.equal(db.categories.length, 1);
});
test('assigned active, draft, and legacy products block category deletion', async () => {
  for (const product of [{ category_slug: 'washing-machines', subcategory_slug: 'single-tub', status: 'draft' },
    { category_slug: 'laundry', subcategory_slug: 'washing-machines', status: 'active' }]) {
    const { db, load } = harness([category()]); db.products = [product];
    const state = await load('src/app/admin/actions').deleteCategoryAction({ error: null }, form({ id: 'cat1', slug: 'washing-machines' }));
    assert.match(state.error, /products are assigned/);
    assert.equal(db.categories.length, 1);
  }
});
test('no-op updates report an error and never redirect', async () => {
  const { db, load } = harness([category()]); db.noUpdate = true;
  const result = await load('src/app/admin/actions').saveCategoryAction({ error: null }, form({ id: 'cat1' }));
  assert.match(result.error, /could not be updated/);
});
test('live search discovers custom categories and excludes deleted static category links', async () => {
  const { load } = harness([category({ name: 'Custom Fans', slug: 'custom-fans', editorial_group: 'cooling' })]);
  const get = load('src/app/api/catalog-search/route').GET;
  const custom = await (await get(new Request('https://store.test/api/catalog-search?q=custom'))).json();
  assert.ok(custom.some(result => result.href === '/category/cooling/custom-fans'));
  const removed = await (await get(new Request('https://store.test/api/catalog-search?q=dryers'))).json();
  assert.equal(removed.length, 0);
});

test('products belonging to archived or deleted categories are hidden rather than reassigned', async () => {
  const { db, load } = harness([category()]);
  db.products = [{ id: 'gone-product', slug: 'gone-product', name: 'Old Dryer', category_slug: 'dryer-machines', subcategory_slug: 'spin-dryer', specifications: {} }];
  assert.equal((await load('src/lib/public-catalog').getStorefrontProducts()).length, 0);
});
test('a connected catalog never resurrects deleted demo product detail routes', async () => {
  const { load } = harness([category()]);
  assert.equal(await load('src/lib/public-catalog').getStorefrontProductBySlug('front-load-washer'), null);
});
test('a category slug cannot orphan assigned products or change when product counts are unknown', async () => {
  const { db, load } = harness([category()]);
  const action = load('src/app/admin/actions').saveCategoryAction;
  db.products = [{ category_slug: 'washing-machines', subcategory_slug: 'single-tub' }];
  assert.match((await action({ error: null }, form({ id: 'cat1', slug: 'new-url' }))).error, /Reassign/);
  db.productReadFails = true;
  assert.match((await action({ error: null }, form({ id: 'cat1', slug: 'new-url' }))).error, /Cannot verify assigned products/);
  assert.equal(db.categories[0].slug, 'washing-machines');
});
