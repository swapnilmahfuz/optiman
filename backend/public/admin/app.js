'use strict';
// Query routing works even if rewrite and PATH_INFO are unavailable.
const API = new URL('../index.php', location.href);
const $ = selector => document.querySelector(selector);
let csrf = '', user = null, categories = [], audiences = [], current = null, page = 1, pages = 1, locations = [], users = [], userPage = 1, userPages = 1;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(text, error = false) { const el = $('#notice'); el.textContent = text; el.className = error ? 'error' : ''; el.hidden = !text; if (text) el.scrollIntoView({block:'nearest'}); }
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.method && !['GET','HEAD'].includes(options.method)) headers.set('X-CSRF-Token', csrf);
  if (options.body && !(options.body instanceof FormData)) { headers.set('Content-Type','application/json'); options.body = JSON.stringify(options.body); }
  const [route, query = ''] = path.split('?'); const url = new URL(API); url.search = query; url.searchParams.set('path', '/api/v1/' + route);
  const response = await fetch(url, {...options, headers, credentials:'same-origin'});
  let result; try { result = await response.json(); } catch { throw new Error('The server returned an invalid response. Please try again.'); }
  if (!response.ok) throw new Error(result.error?.message || 'Request failed. Please try again.');
  return result.data;
}
function owner() { return user?.role === 'Owner' || user?.role === 'owner'; }
function showSignedIn() {
  $('#login-panel').hidden = !!user; $('#app').hidden = !user; $('#identity').hidden = !user;
  $('#user-name').textContent = user ? `${user.name} · ${user.role}` : '';
  $('#new-product').hidden = !owner(); $('#manager-note').hidden = owner(); $('#owner-tools').hidden = !owner(); $('#filters [name=status]').closest('label').hidden = !owner();
}
async function session() { const data = await request('session'); csrf = data.csrf || ''; user = data.user || null; showSignedIn(); if (user) await initialize(); }
async function initialize() {
  const [cats, auds] = await Promise.all([request(owner() ? 'admin/categories' : 'categories'), request(owner() ? 'admin/audiences' : 'audiences')]);
  categories = Array.isArray(cats) ? cats : (cats.categories || cats.items || []);
  audiences = Array.isArray(auds) ? auds : (auds.audiences || auds.items || []);
  renderOptions('category-options','category_ids',categories,[]); renderOptions('audience-options','audience_ids',audiences,[]); await list(); if (owner()) { locations = await request('admin/locations'); renderCategories(); await loadUsers(); }
}
function renderOptions(element, name, items, selected) {
  const selectedIds = selected.map(item => String(typeof item === 'object' ? item.id : item));
  $('#'+element).innerHTML = items.map(item => `<label><input type="checkbox" name="${name}" value="${esc(item.id)}" ${selectedIds.includes(String(item.id))?'checked':''}>${esc(item.name)}</label>`).join('') || '<span>No options configured.</span>';
}
async function list() {
  const params = new URLSearchParams({page: String(page), per_page:'20'}), values = new FormData($('#filters'));
  for (const [key,value] of values) if (value) params.set(key,value);
  const data = await request((owner() ? 'admin/products?' : 'products?') + params), items = data.items || [];
  pages = Math.max(1, Math.ceil(Number(data.total || 0) / Number(data.per_page || 20))); page = Number(data.page || page);
  $('#products').innerHTML = items.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.sku)}</td><td>৳${esc(p.price)}</td><td>${esc(p.status)}</td><td>${owner()?`<button type="button" class="quiet" data-edit="${esc(p.id)}">Edit</button>`:''}</td></tr>`).join('');
  $('#empty').hidden = items.length > 0; $('#page-info').textContent = `Page ${page} of ${pages}`; $('#prev').disabled = page<=1; $('#next').disabled = page>=pages;
}
function editForm(product) {
  current = product || null; const form = $('#product-form'); form.reset();
  $('#editor-title').textContent = current ? 'Edit product' : 'Add product';
  if (current) for (const field of ['sku','name','description','frame_style','material','color','price','status','tryon_asset']) form.elements[field].value = current[field] ?? '';
  renderOptions('category-options','category_ids',categories,current?.categories || []); renderOptions('audience-options','audience_ids',audiences,current?.audiences || []);
  $('#images-panel').hidden = !current; renderImages(); $('#editor').hidden = false; $('#editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function imageUrl(path) { if (!path) return ''; const url = new URL(path, new URL('../', location.href)); return url.origin === location.origin ? url.href : ''; }
function renderImages() {
  const images = current?.images || [];
  $('#images').innerHTML = images.map((image,i) => `<div class="image"><img src="${esc(imageUrl(image.urls?.thumb))}" alt="Product image ${i+1}"><strong>${Number(image.is_primary)?'Primary image':'Image '+(i+1)}</strong><button type="button" class="quiet" data-primary="${esc(image.id)}" ${Number(image.is_primary)?'disabled':''}>Set primary</button><button type="button" class="quiet" data-move="${esc(image.id)}" data-direction="-1" ${i===0?'disabled':''}>Move earlier</button><button type="button" class="quiet" data-move="${esc(image.id)}" data-direction="1" ${i===images.length-1?'disabled':''}>Move later</button><button type="button" class="quiet" data-delete="${esc(image.id)}">Delete</button></div>`).join('') || '<p>No images uploaded yet.</p>';
}
async function reloadProduct() { current = await request(`admin/products/${current.id}`); renderImages(); }
function bind(form, action) { form.addEventListener('submit', async event => { event.preventDefault(); message(''); const button=form.querySelector('button[type="submit"],button:not([type])'); if(button)button.disabled=true; try { await action(); } catch(error) { message(error.message,true); } finally { if(button)button.disabled=false; } }); }
bind($('#login-form'), async () => { const f = new FormData($('#login-form')); await request('login',{method:'POST',body:{email:f.get('email'),password:f.get('password')}}); $('#login-form').reset(); await session(); message('Signed in.'); });
$('#logout').addEventListener('click', async () => { try { await request('logout',{method:'POST',body:{}}); user=null; csrf=''; $('#editor').hidden=true; showSignedIn(); await session(); message('Signed out.'); } catch(error) { message(error.message,true); } });
bind($('#filters'), async () => { page=1; await list(); });
$('#prev').addEventListener('click',async()=>{if(page>1){page--;try{await list();}catch(e){message(e.message,true);}}});
$('#next').addEventListener('click',async()=>{if(page<pages){page++;try{await list();}catch(e){message(e.message,true);}}});
$('#new-product').addEventListener('click',()=>editForm(null)); $('#cancel').addEventListener('click',()=>{$('#editor').hidden=true; current=null;});
$('#products').addEventListener('click',async event=>{const button=event.target.closest('[data-edit]');if(!button)return;try{editForm(await request(`admin/products/${encodeURIComponent(button.dataset.edit)}`));}catch(error){message(error.message,true);}});
bind($('#product-form'),async()=>{const form=$('#product-form'), values=new FormData(form), body=Object.fromEntries(values); body.category_ids=values.getAll('category_ids').map(Number);body.audience_ids=values.getAll('audience_ids').map(Number);const saved=await request(current?`admin/products/${current.id}`:'admin/products',{method:current?'PUT':'POST',body});current=saved; await list(); editForm(current); message('Product saved.');});
bind($('#upload-form'),async()=>{const f=$('#upload-form'); const file=f.elements.image.files[0];if(file.size>1800000)throw new Error('Image must be 1.8 MB or smaller.');await request(`admin/products/${current.id}/images`,{method:'POST',body:new FormData(f)});f.reset();await reloadProduct();message('Image uploaded.');});
$('#images').addEventListener('click',async event=>{const b=event.target.closest('button');if(!b)return;try{if(b.dataset.primary)await request(`admin/products/${current.id}/images/${b.dataset.primary}/primary`,{method:'PUT',body:{}});if(b.dataset.delete){if(!confirm('Delete this image?'))return;await request(`admin/products/${current.id}/images/${b.dataset.delete}`,{method:'DELETE'});}if(b.dataset.move){const ids=current.images.map(i=>Number(i.id)),index=ids.indexOf(Number(b.dataset.move)),target=index+Number(b.dataset.direction);[ids[index],ids[target]]=[ids[target],ids[index]];await request(`admin/products/${current.id}/images/order`,{method:'PUT',body:{image_ids:ids}});}await reloadProduct();message('Image settings saved.');}catch(error){message(error.message,true);}});
function renderCategories() {
  $('#category-list').innerHTML = categories.map(c => `<p>${esc(c.name)} · ${Number(c.is_active) ? 'Active' : 'Inactive'} <button class="quiet" type="button" data-category="${esc(c.id)}">Edit</button></p>`).join('') || '<p>No categories yet.</p>';
  renderOptions('category-options','category_ids',categories,current?.categories || []);
}
$('#category-list').addEventListener('click',e=>{const b=e.target.closest('[data-category]'); if(!b)return; const category=categories.find(c=>String(c.id)===b.dataset.category), form=$('#category-form'); for(const k of ['id','name','slug','is_active'])form.elements[k].value=category[k]; form.elements.name.focus();});
$('#clear-category').addEventListener('click',()=>$('#category-form').reset());
bind($('#category-form'),async()=>{const form=$('#category-form'),data=new FormData(form),id=data.get('id'),body={name:data.get('name'),slug:data.get('slug'),is_active:data.get('is_active')==='1'};await request(id?`admin/categories/${id}`:'admin/categories',{method:id?'PUT':'POST',body});form.reset();categories=await request('admin/categories');renderCategories();message('Category saved.');});
async function loadUsers(){const data=await request(`admin/users?page=${userPage}&per_page=25`);users=data.items;userPage=Number(data.page);userPages=Math.max(1,Math.ceil(Number(data.total)/Number(data.limit||25)));$('#users').innerHTML=users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role==='owner'?'Owner':'Branch Manager'}</td><td>${Number(u.is_active)?'Active':'Inactive'}</td><td><button class="quiet" type="button" data-user="${esc(u.id)}">Edit</button></td></tr>`).join('');$('#users-page').textContent=`Page ${userPage} of ${userPages}`;$('#users-prev').disabled=userPage<=1;$('#users-next').disabled=userPage>=userPages;}
function userForm(existing){const form=$('#user-form');form.reset();form.elements.id.value=existing?.id||'';for(const key of ['name','email','role','branch_id','is_active'])if(existing)form.elements[key].value=existing[key]??'';form.elements.password.required=!existing;$('#password-help').textContent=existing?'leave blank to keep current password':'12–72 bytes';$('#user-title').textContent=existing?'Edit user':'Add user';const options=locations.filter(l=>l.type==='branch'&&Number(l.is_active)&&l.branch_id);form.elements.branch_id.innerHTML='<option value="">Choose branch</option>'+options.map(l=>`<option value="${esc(l.branch_id)}">${esc(l.name)}</option>`).join('');if(existing)form.elements.branch_id.value=existing.branch_id||'';toggleBranch();form.hidden=false;form.scrollIntoView({block:'nearest'});}
function toggleBranch(){const form=$('#user-form'),branch=form.elements.role.value==='branch_manager';$('#branch-label').hidden=!branch;form.elements.branch_id.required=branch;}
$('#user-form').elements.role.addEventListener('change',toggleBranch);$('#new-user').addEventListener('click',()=>userForm(null));$('#cancel-user').addEventListener('click',()=>{$('#user-form').reset();$('#user-form').hidden=true;});$('#users').addEventListener('click',e=>{const b=e.target.closest('[data-user]');if(b)userForm(users.find(u=>String(u.id)===b.dataset.user));});
for(const [selector,direction] of [['#users-prev',-1],['#users-next',1]])$(selector).addEventListener('click',async()=>{try{userPage+=direction;await loadUsers();}catch(e){message(e.message,true);}});
bind($('#user-form'),async()=>{const form=$('#user-form'),f=new FormData(form),id=f.get('id'),body={name:f.get('name'),email:f.get('email'),role:f.get('role'),branch_id:f.get('role')==='owner'?null:Number(f.get('branch_id')),is_active:f.get('is_active')==='1'};if(f.get('password'))body.password=f.get('password');await request(id?`admin/users/${id}`:'admin/users',{method:id?'PUT':'POST',body});form.reset();form.hidden=true;await loadUsers();message('User saved.');});
session().catch(error=>message(error.message,true));
