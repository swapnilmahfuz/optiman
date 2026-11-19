'use strict';

const variantFields = `<div class="grid">
  <label>Variant SKU<input name="variant_sku" maxlength="80" required></label>
  <label>Color name<input name="color_name" maxlength="100" required></label>
  <label>Price per frame (BDT)<input name="price" type="number" min="0" step="0.01" required></label>
  <label>HEX color (optional)<input name="color_hex" maxlength="7" placeholder="#684530" pattern="#[a-fA-F0-9]{6}"></label>
  <label>Try-On asset reference (optional)<input name="tryon_asset" maxlength="255" placeholder="frames/amber.webp"></label>
  <label>Color status<select name="variant_status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>`;
document.querySelectorAll('.variant-fields').forEach(el => { el.innerHTML = variantFields; });
let chosenId = null, beforeMovement = null, stockAttempt = null, stockView = 0;

function activeVariant() {
  return current?.variants.find(v => Number(v.id) === chosenId);
}
function renderCategorySelect(selected) {
  const assigned = new Set(selected.map(c => Number(c.id)));
  const choices = categories.filter(c => Number(c.is_active) || assigned.has(Number(c.id)));
  const options = choices.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${Number(c.is_active) ? '' : ' (inactive)'}</option>`);
  $('#category-options').innerHTML = '<label>Category<select name="category_ids"><option value="">Choose a category</option>'+options.join('')+'</select></label>';
  const select = $('#category-options select');
  select.value = selected[0]?.id || '';
  // Older products may already belong to several categories. Let the Owner retain them.
  selected.slice(1).forEach(c => {
    $('#category-options').insertAdjacentHTML('beforeend',`<label class="inline-check"><input type="checkbox" name="category_ids" value="${esc(c.id)}" checked>${esc(c.name)}</label>`);
  });
}
function readVariant(form) {
  const f = form.elements;
  return {sku:f.variant_sku.value,color_name:f.color_name.value,price:f.price.value,color_hex:f.color_hex.value,
    tryon_asset:f.tryon_asset.value,status:f.variant_status.value,is_default:f.is_default?.checked ?? true};
}
function editForm(product) {
  current = product;
  chosenId = product ? Number(product.default_variant_id) : null;
  const form = $('#product-form');
  form.reset();
  $('#editor-title').textContent = product ? 'Edit product' : 'Add product';
  if (product) for (const key of ['sku','name','description','frame_style','material','status']) form.elements[key].value=product[key] ?? '';
  $('#first-variant').hidden = !!product;
  $('#first-variant').querySelectorAll('input,select').forEach(el => { el.disabled = !!product; });
  renderCategorySelect(product?.categories || []);
  renderOptions('audience-options','audience_ids',audiences,product?.audiences || []);
  $('#variant-tools').hidden = !product;
  if (product) showVariant();
  $('#editor').hidden = false;
  $('#editor').scrollIntoView({block:'start'});
}
function showVariant() {
  const v = activeVariant();
  const select = $('#variant-choice');
  select.innerHTML = current.variants.map(item => `<option value="${esc(item.id)}">${esc(item.color_name)} · ${esc(item.sku)}${Number(item.is_default) ? ' (default)' : ''}</option>`).join('');
  if (!v) select.add(new Option('New color variant',''));
  select.value = chosenId ?? '';
  const form = $('#variant-form');
  form.reset();
  const f = form.elements;
  if (v) {
    f.variant_sku.value=v.sku;
    for (const key of ['color_name','color_hex','price','tryon_asset']) f[key].value=v[key] ?? '';
    f.variant_status.value=v.status;
    f.is_default.checked=!!Number(v.is_default);
  }
  f.is_default.disabled = !!Number(v?.is_default);
  $('#cancel-variant').hidden=!!v;
  $('#saved-tools').hidden=!v;
  $('#upload-form').reset();
  $('#stock-form').reset();
  stockAttempt=null;
  renderLocations();
  renderImages();
  if (v) refreshStock().catch(e=>message(e.message,true));
}
async function refreshGallery(productId, variantId) {
  const product=await request(`admin/products/${productId}`);
  if (Number(current?.id)!==Number(productId) || chosenId!==variantId) return;
  current=product;
  renderImages();
}
bind($('#product-form'),async()=>{
  const form=$('#product-form'), f=new FormData(form);
  const body={};
  for (const key of ['sku','name','description','frame_style','material','status']) body[key]=f.get(key);
  body.category_ids=f.getAll('category_ids').filter(Boolean).map(Number);
  body.audience_ids=f.getAll('audience_ids').map(Number);
  if (!current) body.default_variant=readVariant(form);
  const saved=await request(current?`admin/products/${current.id}`:'admin/products',{method:current?'PUT':'POST',body});
  editForm(saved);
  await list();
  message(saved.status==='active'?'Product published.':'Product saved.');
});
$('#add-variant').onclick=()=>{chosenId=null;showVariant();$('#variant-form').elements.variant_sku.focus();};
$('#cancel-variant').onclick=()=>{chosenId=Number(current.default_variant_id);showVariant();};
$('#variant-choice').onchange=e=>{chosenId=Number(e.target.value)||null;showVariant();};
bind($('#variant-form'),async()=>{
  const productId=current.id;
  const base=`admin/products/${productId}/variants`;
  const saved=await request(chosenId?`${base}/${chosenId}`:base,{method:chosenId?'PUT':'POST',body:readVariant($('#variant-form'))});
  const product=await request(`admin/products/${productId}`);
  if (current?.id!==productId) return;
  current=product;chosenId=Number(saved.id);showVariant();
  await list();message('Color variant saved.');
});
function galleryPath(product,variant) { return `admin/products/${product}/variants/${variant}/images`; }
bind($('#upload-form'),async()=>{
  const form=$('#upload-form'), files=Array.from(form.elements.image.files), product=current.id, variant=chosenId;
  if (files.some(f=>f.size>1800000)) throw new Error('Choose files of 1.8 MB or smaller.');
  let saved=0;
  try {
    for (const file of files) {
      const body=new FormData();body.append('image',file);
      await request(galleryPath(product,variant),{method:'POST',body});saved++;
    }
  } catch (e) { throw new Error(`${saved} of ${files.length} uploaded. ${e.message}`); }
  finally { form.reset();await refreshGallery(product,variant); }
  message(`${saved} image(s) uploaded.`);
});
$('#images').onchange=async event=>{
  const input=event.target, file=input.files?.[0];
  if (!input.dataset.replace || !file) return;
  const product=current.id,variant=chosenId;
  input.disabled=true;
  try {
    const body=new FormData();body.append('image',file);
    await request(galleryPath(product,variant)+'/'+input.dataset.replace+'/replace',{method:'POST',body});
    await refreshGallery(product,variant);message('Image replaced.');
  } catch(e){message(e.message,true);} finally {input.value='';input.disabled=false;}
};
$('#images').onclick=async event=>{
  const b=event.target.closest('button');if(!b)return;
  const product=current.id,variant=chosenId,path=galleryPath(product,variant);
  b.disabled=true;
  try {
    if(b.dataset.primary)await request(`${path}/${b.dataset.primary}/primary`,{method:'PUT',body:{}});
    if(b.dataset.delete) {
      if(!confirm('Delete this variant image?'))return;
      await request(`${path}/${b.dataset.delete}`,{method:'DELETE'});
    }
    if(b.dataset.move) {
      const ids=activeVariant().images.map(i=>Number(i.id)),i=ids.indexOf(Number(b.dataset.move)),j=i+Number(b.dataset.direction);
      [ids[i],ids[j]]=[ids[j],ids[i]];
      await request(path+'/order',{method:'PUT',body:{image_ids:ids}});
    }
    await refreshGallery(product,variant);message('Image settings saved.');
  } catch(e){message(e.message,true);} finally { b.disabled=false; }
};
function renderLocations() {
  $('#location-list').innerHTML=locations.map(l=>`<li>${esc(l.name)} · ${esc(l.code)} · ${esc(l.type)}</li>`).join('')||'<li>No locations yet.</li>';
  const active=locations.filter(l=>Number(l.is_active));
  $('#stock-form select').innerHTML=active.map(l=>`<option value="${esc(l.id)}">${esc(l.name)} · ${esc(l.code)}</option>`).join('');
  $('#stock-form button').disabled=!active.length;
}
bind($('#location-form'),async()=>{
  await request('admin/locations',{method:'POST',body:Object.fromEntries(new FormData($('#location-form')))});
  $('#location-form').reset();locations=await request('admin/locations');renderLocations();message('Location added.');
});
function movementList(rows,append=false) {
  if (!append) $('#movements').replaceChildren();
  for (const m of rows.items) {
    const li=document.createElement('li');
    li.textContent=`${m.created_at} · ${m.location} · ${m.quantity>0?'+':''}${m.quantity} · ${m.adjustment_reason||m.movement_type}${m.actor?' · '+m.actor:''}`;
    $('#movements').append(li);
  }
  if (!$('#movements').children.length) $('#movements').textContent='No movements recorded.';
  beforeMovement=rows.next_before;$('#older-movements').hidden=!beforeMovement;
}
async function refreshStock() {
  const generation=++stockView,variant=chosenId;
  $('#balances').textContent='Loading stock…';
  $('#movements').textContent='';
  $('#older-movements').hidden=true;
  const [first,history]=await Promise.all([request(`admin/inventory?variant_id=${variant}&per_page=100`),request(`admin/variants/${variant}/movements`)]);
  const rows=first.items;
  for(let page=2;rows.length<first.total;page++){
    const next=await request(`admin/inventory?variant_id=${variant}&per_page=100&page=${page}`);
    if(!next.items.length)break; rows.push(...next.items);
  }
  if(variant!==chosenId || generation!==stockView)return;
  $('#balances').innerHTML=rows.length?'<ul>'+rows.map(b=>{
    const location=locations.find(l=>Number(l.id)===Number(b.location_id));
    return `<li>${esc(location?.name||b.location_id)} · ${esc(b.on_hand)} on hand · ${esc(b.reserved)} reserved</li>`;
  }).join('')+'</ul>':(locations.length?'No stock recorded for this color.':'Add an inventory location below to record stock.');
  movementList(history);
}
$('#older-movements').onclick=async e=>{
  const button=e.currentTarget,variant=chosenId;button.disabled=true;
  try{const history=await request(`admin/variants/${variant}/movements?before=${beforeMovement}`);if(variant===chosenId)movementList(history,true);}
  catch(error){message(error.message,true);}finally{button.disabled=false;}
};
bind($('#stock-form'),async()=>{
  const form=$('#stock-form'),data=Object.fromEntries(new FormData(form)),variant=chosenId;
  const signature=JSON.stringify([variant,data]);
  if(stockAttempt?.signature!==signature)stockAttempt={signature,id:crypto.randomUUID()};
  await request(`admin/variants/${variant}/adjustments`,{method:'POST',body:{...data,request_id:stockAttempt.id}});
  if(variant===chosenId){form.reset();stockAttempt=null;await refreshStock();}
  message('Stock adjustment recorded.');
});
$('#migrate').onclick=async e=>{
  const button=e.currentTarget;button.disabled=true;
  try{await request('admin/catalog-update',{method:'POST',body:{}});await initialize();message('Product Management V2 is ready.');}
  catch(error){message(error.message,true);}finally{button.disabled=false;}
};
bind($('#reset-form'),async()=>{
  const form=$('#reset-form');
  if(form.elements.confirmation.value!=='RESET DEMO CATALOG')throw new Error('Type RESET DEMO CATALOG exactly.');
  if(!confirm('Permanently remove all catalog products, images and stock history?'))return;
  const result=await request('admin/demo-reset',{method:'POST',body:{confirmation:form.elements.confirmation.value}});
  form.reset();current=null;chosenId=null;$('#editor').hidden=true;page=1;await list();
  message(result.files_requiring_cleanup?'Catalog reset. Some image files require manual cleanup.':'Demo catalog reset.');
});
session().catch(error=>message(error.message,true));
