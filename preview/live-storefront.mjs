import {loadLiveCatalog, localImageURL} from './live-catalog.mjs';

const main = document.querySelector('main');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = amount => '৳' + Number(amount).toLocaleString('en-US', {maximumFractionDigits:2});
const state = {products:[],categories:[],selected:null,image:null,status:'loading',query:'',audience:'',maxPrice:0,sort:'low'};
const variants = product => (product.variants || []).filter(v => v.status === 'active');
const defaultVariant = product => variants(product).find(v => String(v.id) === String(product.default_variant_id)) || variants(product)[0];
const productById = id => state.products.find(p => String(p.id) === String(id));
const categorySlug = slug => slug === 'optical' ? 'eyeglasses' : slug;
function photo(product, variant, size='card') {
  const images = variant?.images || [];
  const chosen = (size === 'gallery' && state.image !== null ? images[state.image] : null) || images.find(image => Number(image.is_primary)) || images[0];
  const src = localImageURL(chosen?.urls?.[size === 'gallery' ? 'main' : 'card']);
  return src ? `<img data-product-image src="${escapeHTML(src)}" alt="${escapeHTML(product.name)} in ${escapeHTML(variant.color_name)}" ${size === 'gallery' ? 'fetchpriority="high"' : 'loading="lazy"'}>` : '<div class="empty">Image coming soon</div>';
}
function card(product) {
  const variant = defaultVariant(product);
  if (!variant) return '';
  const id=encodeURIComponent(product.id);
  return `<article class="product-card"><a class="product-image" href="#product/${id}">${photo(product,variant)}<span class="image-arrow"><i class="arrow" aria-hidden="true"></i></span></a><div class="card-meta"><div><a href="#product/${id}"><h3>${escapeHTML(product.name)}</h3></a><p>${escapeHTML(variant.color_name)}</p></div><strong>${money(variant.price)}</strong></div><small class="online-availability">${Number(variant.available)>0?'Available':'Out of stock'}</small></article>`;
}
function pills() {
  return `<a class="category-pill" href="#shop">All Eyewear</a>${state.categories.map(c=>`<a class="category-pill" href="#shop/${encodeURIComponent(c.slug)}">${escapeHTML(c.name)}</a>`).join('')}`;
}
function status() {
  if (state.status === 'loading') return '<div class="empty" role="status">Loading the collection…</div>';
  if (state.status === 'error') return '<div class="empty" role="alert"><h2>Collection temporarily unavailable</h2><p>Please try again.</p><button class="button" id="retry">Retry</button></div>';
  return '<div class="empty"><h2>No frames found.</h2><p>Explore the collection again soon.</p></div>';
}
function home() {
  return `<section class="hero campaign-hero"><div class="hero-copy"><p class="eyebrow">A fresh perspective</p><h1>See Better.<br><em>Look Sharper.</em></h1><p>Eyewear for your everyday life — style, comfort and clear vision.</p><a class="button" href="#shop">Explore Collection <i class="arrow" aria-hidden="true"></i></a></div><figure class="hero-art"><img src="assets/campaign-eyewear-duo-1200.webp" srcset="assets/campaign-eyewear-duo-768.webp 768w, assets/campaign-eyewear-duo-1200.webp 1200w, assets/campaign-eyewear-duo-1774.webp 1774w" sizes="100vw" width="1774" height="887" alt="Campaign photograph of two models wearing glasses" fetchpriority="high"></figure><p class="campaign-credit">AI-generated campaign photograph</p></section><div class="benefit-strip"><span>Frames with character</span><span>Lens choices, made clear</span><span>One collection. Every perspective.</span></div><section class="section category-section"><div class="section-title"><div><p class="eyebrow">EXPLORE THE COLLECTION</p><h2>Find your frame.</h2></div></div><div class="category-pills">${pills()}</div></section><section class="section"><div class="section-title"><div><p class="eyebrow">The collection</p><h2>Your next everyday frame.</h2></div><a href="#shop">Shop all frames <i class="arrow" aria-hidden="true"></i></a></div>${state.products.length?`<div class="product-grid">${state.products.slice(0,4).map(card).join('')}</div>`:status()}</section>${state.products.length?`<section class="editorial">${photo(state.products[1]||state.products[0],defaultVariant(state.products[1]||state.products[0]),'editorial')}<div><p class="eyebrow">MADE PERSONAL</p><h2>Your frame.<br>Your way of seeing.</h2><p>Keep it simple with frame-only, or explore lenses chosen around your needs.</p><a class="button" href="#shop">Explore frames <i class="arrow" aria-hidden="true"></i></a></div></section>`:''}`;
}
function shop(slug) {
  const category = state.categories.find(c=>c.slug===categorySlug(slug));
  const filtered = state.products.filter(p => (!slug || (p.categories||[]).some(c=>c.slug===categorySlug(slug))) && (!state.audience || (p.audiences||[]).some(a=>a.slug===state.audience)) && (!state.maxPrice || Number(defaultVariant(p)?.price)<=state.maxPrice) && `${p.name} ${(p.variants||[]).map(v=>v.color_name).join(' ')}`.toLowerCase().includes(state.query.toLowerCase()));
  return `<div class="page-heading"><p class="eyebrow">THE COLLECTION</p><h1>${escapeHTML(category?.name || (slug ? 'Collection' : 'Find your perspective.'))}</h1></div><section class="section listing"><div class="filterbar"><label>Search<input id="filter-search" type="search" value="${escapeHTML(state.query)}" placeholder="Name or color"></label><label>Category<select id="filter-category"><option value="">All eyewear</option>${state.categories.map(c=>`<option value="${escapeHTML(c.slug)}" ${c.slug===categorySlug(slug)?'selected':''}>${escapeHTML(c.name)}</option>`).join('')}</select></label><label>Audience<select id="filter-audience"><option value="">Everyone</option>${['men','women','kids'].map(a=>`<option value="${a}" ${state.audience===a?'selected':''}>${a[0].toUpperCase()+a.slice(1)}</option>`).join('')}</select></label><label>Price<select id="filter-price"><option value="0">All prices</option><option value="3000" ${state.maxPrice===3000?'selected':''}>Up to ৳3,000</option></select></label><label>Sort<select id="sort"><option value="low" ${state.sort==='low'?'selected':''}>Price: low to high</option><option value="high" ${state.sort==='high'?'selected':''}>Price: high to low</option><option value="name" ${state.sort==='name'?'selected':''}>Name</option></select></label></div><p id="results-count" class="muted">${filtered.length} styles</p>${filtered.length?`<div class="product-grid" id="results">${filtered.sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name):(Number(defaultVariant(a)?.price)-Number(defaultVariant(b)?.price))*(state.sort==='high'?-1:1)).map(card).join('')}</div>`:status()}</section>`;
}
function detail(id) {
  const product=productById(id);
  if (!product) return state.status==='ready'?'<div class="empty"><h2>Frame not found.</h2><a class="button" href="#shop">Explore the collection</a></div>':status();
  const options=variants(product), variant=options.find(v=>String(v.id)===String(state.selected))||defaultVariant(product);
  if (!variant) return '<div class="empty">This frame is currently unavailable.</div>';
  state.selected=String(variant.id);
  color=variant.color_name;
  const images=variant.images||[];
  const reference=variant.tryon_asset || '';
  const vto=/^[A-Za-z0-9][A-Za-z0-9_./-]*\.(?:png|webp)$/i.test(reference) && !reference.split('/').includes('..') ? reference : '';
  return `<div class="breadcrumb"><a href="#shop">The collection</a> / ${escapeHTML(product.name)}</div>
  <section class="product-detail"><div class="gallery"><div class="gallery-main">${photo(product,variant,'gallery')}</div>
  ${images.length>1?`<div class="swatches" aria-label="Product photographs">${images.map((image,i)=>`<button class="quiet" data-image="${i}" aria-label="Image ${i+1}" aria-pressed="${state.image===i}">${i+1}</button>`).join('')}</div>`:''}
  ${vto?`<button class="button" id="live-vto" data-frame="${escapeHTML(vto)}">Virtual Try-On</button>`:''}
  <aside id="gallery-summary" class="gallery-summary" aria-live="polite">${rxCompactSummary()}</aside></div>
  <div class="product-config"><p class="eyebrow">${escapeHTML(product.frame_style)}</p><h1>${escapeHTML(product.name)}</h1>
  <div class="price-row"><strong>${money(variant.price)}</strong><span>Frame price</span></div><p>${escapeHTML(product.description)}</p>
  <p class="field-title">01 / Color — ${escapeHTML(variant.color_name)}</p><div class="swatches">${options.map(v=>`<button data-variant="${escapeHTML(v.id)}" aria-label="${escapeHTML(v.color_name)}" aria-pressed="${String(v.id)===state.selected}" style="--swatch:${/^#[a-f0-9]{6}$/i.test(v.color_hex||'')?v.color_hex:'#4a3328'}"></button>`).join('')}</div>
  <p class="muted">SKU ${escapeHTML(variant.sku)} · ${Number(variant.available)>0?'Available':'Out of stock'}</p><p>${escapeHTML(product.material)}</p>
  <p class="field-title">02 / Make it yours</p><div class="segmented purchase-modes" role="group" aria-label="Purchase configuration"><button data-mode="frame" aria-label="Frame Only" aria-pressed="${!lens}"><strong>Frame Only</strong><small>Keep your selection simple</small></button><button data-mode="lens" aria-label="With Power / Lens" aria-pressed="${lens}"><strong>With Power / Lens</strong><small>Explore explicit lens options</small></button></div>
  <p class="notice">Shopping and lens configuration are demonstrations. No order, payment or prescription is submitted. Lens prices and eligibility are illustrative.</p>
  ${lens?lensPanel():''}${rxQuantity()}${productPrice(current())}
  <div class="purchase"><button class="button" id="add-cart" ${rxCanAdd()?'':'disabled'}>${rxEditing!==null?'Save configuration':Number(variant.available)<=0?'Out of stock':rxCanAdd()?'Add to Cart':'Complete an eligible selection'}</button></div>
  ${checkoutGuidance()}${shippingPolicy()}${rxEditing!==null?'<button class="quiet" id="rx-cancel" type="button">Cancel editing</button>':''}
  <div class="bag-feedback"><p id="bag-feedback" role="status">Cart preview only. No stock is reserved or changed.</p><a id="view-bag" href="#cart" ${cart.length?'':'hidden'}>View Cart</a></div></div></section>`;
}
function render() {
  const [page, value] = (location.hash.slice(1)||'home').split('/');
  state.image = page==='product' ? state.image : null;
  main.innerHTML = page==='product'?detail(value):page==='shop'?shop(value||''):page==='cart'?bag():page==='checkout'?checkout():home();
  document.querySelector('#bag-count').textContent=cart.reduce((sum,item)=>sum+item.qty,0);
  document.querySelector('header nav').classList.remove('open');
  document.querySelector('.menu').setAttribute('aria-expanded','false');
}
async function refresh() {
  state.status='loading';render();
  try {const result=await loadLiveCatalog();state.products=result.products.filter(p=>p.status==='active' && defaultVariant(p));state.categories=result.categories;state.status='ready';}
  catch {state.products=[];state.categories=[];state.status='error';}
  render();
}
window.addEventListener('hashchange',()=>{state.selected=null;state.image=null;state.query='';lens=false;enterProductRoute();if(rxEditing!==null)state.selected=cart[rxEditing]?.variantId ?? null;render();window.scrollTo(0,0);});
document.querySelector('.menu').onclick=e=>{const open=document.querySelector('header nav').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));};
document.querySelector('#search-form').onsubmit=e=>{e.preventDefault();const query=document.querySelector('#search').value;if(location.hash!=='#shop'){location.hash='shop';setTimeout(()=>{state.query=query;render();},0);}else{state.query=query;render();}};
main.addEventListener('error',event=>{if(event.target.matches?.('img[data-product-image]')){const fallback=document.createElement('div');fallback.className='empty';fallback.textContent='Image coming soon';event.target.replaceWith(fallback);}},true);
main.addEventListener('input',event=>{if(event.target.id==='filter-search'){state.query=event.target.value;const pos=event.target.selectionStart;render();const input=document.querySelector('#filter-search');input.focus();input.setSelectionRange(pos,pos);}});
main.addEventListener('change',event=>{
  if(event.target.id==='filter-category'){location.hash='shop/'+encodeURIComponent(event.target.value);return;}
  if(event.target.id==='filter-audience')state.audience=event.target.value;
  else if(event.target.id==='filter-price')state.maxPrice=Number(event.target.value);
  else if(event.target.id==='sort')state.sort=event.target.value;
  else return;
  render();
});
main.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;if(button.id==='retry')return refresh();if(button.dataset.qty!==undefined||button.dataset.remove!==undefined){const index=Number(button.dataset.qty??button.dataset.remove);if(button.dataset.remove!==undefined)cart.splice(index,1);else{cart[index].qty+=Number(button.dataset.delta);if(cart[index].qty<1)cart.splice(index,1);}render();return;}if(button.dataset.variant){state.selected=button.dataset.variant;state.image=null;render();document.querySelector(`[data-variant="${CSS.escape(state.selected)}"]`)?.focus();}if(button.dataset.image){state.image=Number(button.dataset.image);render();}if(button.id==='live-vto'){const frame=button.dataset.frame;const url=new URL('/'+frame,location.origin);if(url.origin!==location.origin)return;try{const response=await fetch(url,{method:'HEAD'});if(!response.ok)throw new Error();const {openTryOn}=await import('./vto/controller.mjs');openTryOn({product:'selected',products:[{id:'selected',price:0}],specs:{selected:{name:'Selected frame',url:url.href,eyeSeparation:.46,anchorY:.53}},catalogOnly:true,money:()=>'',onChoose:()=>{}});}catch{button.disabled=true;button.textContent='Try-On image unavailable';}}});
window.liveShoppingCurrent=()=>{const product=productById(location.hash.split('/')[1]);if(!product)return null;const variant=variants(product).find(v=>String(v.id)===String(state.selected))||defaultVariant(product);return variant?{...product,id:String(product.id),name:product.name,price:Number(variant.price),color:variant.color_name,sku:variant.sku,available:Number(variant.available),variantId:String(variant.id),images:variant.images||[],variant}:null;};
window.liveShoppingRender=render;
window.liveShoppingPhoto=(item,context)=>photo(item,item.variant,context);
document.querySelector('#close-modal').onclick=()=>document.querySelector('dialog').close();
main.addEventListener('submit',event=>{if(event.target.id==='checkout-form'){event.preventDefault();modal('<h2>Checkout simulation</h2><p>No order, payment, reservation or personal information was submitted.</p>');}});
refresh();
