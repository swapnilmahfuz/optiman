/** Read the public V2 catalog. No customer or prescription data is sent. */
export async function loadLiveCatalog({fetcher = fetch, origin = location.origin} = {}) {
  const endpoint = new URL('/optiman-backend/index.php', origin);
  const get = async (path, params = {}) => {
    const url = new URL(endpoint);
    url.searchParams.set('path', '/api/v1/' + path);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const response = await fetcher(url, {headers: {Accept: 'application/json'}, credentials: 'same-origin'});
    if (!response.ok) throw new Error('The collection is temporarily unavailable. Please try again.');
    const body = await response.json();
    if (!body || typeof body !== 'object' || !('data' in body)) throw new Error('The collection response was invalid.');
    return body.data;
  };
  const categories = await get('categories');
  if (!Array.isArray(categories)) throw new Error('The category response was invalid.');
  const products = [];
  const perPage = 100;
  for (let page = 1; ; page++) {
    const result = await get('products', {page, per_page: perPage});
    if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(Number(result.total))) {
      throw new Error('The collection response was invalid.');
    }
    products.push(...result.items);
    if (products.length >= Number(result.total)) break;
    if (!result.items.length || page >= 100000) throw new Error('The collection response was incomplete.');
  }
  return {categories, products};
}

/** Only local image URLs from the backend may be used in storefront markup. */
export function localImageURL(value, origin = location.origin) {
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/optiman-backend/uploads/products/')) return '';
    if (!/\/[a-f0-9]{32}-(320|640|1000)\.webp$/.test(url.pathname)) return '';
    return url.pathname;
  } catch {
    return '';
  }
}
