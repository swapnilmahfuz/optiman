import assert from 'node:assert/strict';
import {loadLiveCatalog, localImageURL} from '../preview/live-catalog.mjs';
const origin = 'https://shop.example.test';
const calls = [];
const fetcher = async url => {
  calls.push(url);
  const path = url.searchParams.get('path');
  const data = path.endsWith('categories') ? [{id: 1, name: 'Frames'}]
    : url.searchParams.get('page') === '1' ? {total: 2, items: [{id: 1}]}
    : {total: 2, items: [{id: 2}]};
  return {ok: true, json: async () => ({data})};
};
const catalog = await loadLiveCatalog({fetcher, origin});
assert.equal(catalog.products.length, 2);
assert.equal(catalog.categories[0].name, 'Frames');
assert.equal(calls.length, 3);
assert(calls.every(url => url.origin === origin));
await assert.rejects(loadLiveCatalog({fetcher: async () => ({ok: false}), origin}));
await assert.rejects(loadLiveCatalog({fetcher: async () => ({ok: true, json: async () => ({data: {}})}), origin}));
const image = '/optiman-backend/uploads/products/' + 'a'.repeat(32) + '-640.webp';
assert.equal(localImageURL(image, origin), image);
assert.equal(localImageURL('https://evil.example.test' + image, origin), '');
assert.equal(localImageURL('/optiman-backend/uploads/products/evil.php', origin), '');
console.log('Live catalog pagination, errors and image URL validation passed.');
