const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4190/';
const heading='Looking for a specific lens?';
const body='For your specific lens requirements, please contact us on WhatsApp. Our team will be happy to assist you.';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[],errors=[];
 for(const width of [360,390,768,1024,1440]){
  const p=await browser.newPage({viewport:{width,height:1000}});p.on('pageerror',e=>errors.push(`${width}: ${e.message}`));
  await p.goto(base+'#product/atlas');
  await p.evaluate(()=>OptimanDemo.command('reset',{}, {role:'Owner'},'correction-reset'));
  await p.reload();
  const original=await p.evaluate(()=>OptimanDemo.lensRules());
  assert.equal(original[5].type,'UNAVAILABLE');assert.equal(original[3].type,'CONSULT_WHATSAPP');assert.equal(original.at(-1).types.join(','),'progressive');assert.equal(original.at(-1).type,'CONSULT_WHATSAPP');
  await p.locator('[data-mode=lens]').click();
  assert.deepEqual(await p.locator('[data-rx-type] strong').allTextContents(),['Zero Power','Unifocal','Bifocal','Progressive']);
  assert.equal(await p.locator('[data-rx-next],[data-rx-back],.rx-steps').count(),0);
  assert.equal(await p.locator('.rx-lens-options button').count(),3);
  assert.equal(await p.locator('[data-rx-lens="3"],[data-rx-lens="4"],[data-rx-lens="5"]').count(),0);
  assert(!/UNAVAILABLE|FIXED_PRICE|CONSULT_WHATSAPP|synthetic pair rule|not eligible/i.test(await p.locator('#rx-live-lenses').textContent()));
  await p.locator('[data-rx-lens="0"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('[data-rx-lens="0"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#add-cart').isEnabled(),true);
  await p.locator('[data-rx-type=progressive]').click();
  assert.equal(await p.locator('#rx-right-sph,#rx-left-sph,#rx-right-cyl,#rx-left-axis,#rx-right-add,#rx-left-add,#rx-ipd').count(),7);assert.equal(await p.locator('#rx-shape').count(),0);
  assert.equal((await p.locator('.rx-guidance').textContent()).trim(),'Enter your prescription details to explore lens options.');assert.equal(await p.locator('#consult,.rx-lens-options button').count(),0);
  for(const side of ['right','left']){await p.fill(`#rx-${side}-sph`,'1');await p.fill(`#rx-${side}-add`,'1.5');}
  await p.selectOption('#rx-left-sph-sign','-');await p.fill('#rx-right-cyl','.5');await p.fill('#rx-right-axis','90');await p.fill('#rx-ipd','63.5');
  assert.equal(await p.locator('.rx-consultation h4').textContent(),heading);assert.equal(await p.locator('.rx-consultation > p').first().textContent(),body);assert.equal(await p.locator('#consult').textContent(),'Chat with Us on WhatsApp');assert.equal(await p.locator('#consult').getAttribute('href'),null);
  await p.locator('#consult').click();assert((await p.locator('dialog').textContent()).includes('not configured'));await p.keyboard.press('Escape');
  assert.equal(await p.locator('#add-cart').isDisabled(),true);
  // A configured business contact is used without transmitting sensitive detail. Reserved fictional test number only.
  await p.evaluate(async()=>{
   await OptimanDemo.command('settings',{whatsappNumber:'12025550123'},{role:'Owner'},'test-contact');rxRefresh();
  });
  const url=new URL(await p.locator('#consult').getAttribute('href'));
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/12025550123');assert(url.searchParams.get('text').includes('Atlas'));assert(url.searchParams.get('text').includes('Progressive'));assert(!/63\.5|1\.5|SPH|CYL|Axis|filename/i.test(url.searchParams.get('text')));
  await p.evaluate(()=>scrollTo(0,0));await p.locator('.gallery-main img').evaluate(i=>i.decode());await p.waitForTimeout(100);
  await p.screenshot({path:`evidence/lens-consultation-${width}.png`,fullPage:true});
  // Configure an explicit synthetic progressive rule using the same staff form the owner uses.
  await p.goto(base+'#staff/lenses');await p.locator('[data-lens-rule="7"]').click();
  await p.selectOption('[name=prescriptionTypes]','progressive');await p.selectOption('[name=type]','FIXED_PRICE');await p.fill('[name=price]','2400');await p.fill('[name=features]','No-line design · demonstration coating');await p.fill('[name=maxSph]','3');await p.fill('[name=maxCyl]','2');await p.fill('[name=maxAdd]','2.5');await p.locator('#lens-rule-form button').click();await p.locator('dialog').waitFor({state:'hidden'});
  await p.goto(base+'#product/atlas');await p.locator('[data-mode=lens]').click();await p.locator('[data-rx-type=progressive]').click();
  for(const side of ['right','left']){await p.fill(`#rx-${side}-sph`,'1');await p.fill(`#rx-${side}-add`,'1.5');}
  assert.deepEqual(await p.locator('[data-rx-lens]').evaluateAll(es=>es.map(e=>e.dataset.rxLens)),['7']);
  await p.locator('[data-rx-lens="7"]').click();assert((await p.locator('.price-breakdown').textContent()).includes('৳5,600'));
  await p.fill('#rx-right-add','3');assert.equal(await p.evaluate(()=>rxDraft.lensId),null);assert.equal(await p.locator('[data-rx-lens]').count(),0);assert.equal(await p.locator('.rx-consultation h4').textContent(),heading);
  await p.fill('#rx-right-add','1.5');await p.locator('[data-rx-lens="7"]').click();await p.fill('#rx-qty','2');assert((await p.locator('.price-breakdown').textContent()).includes('৳11,200'));
  await p.locator('#add-cart').click();await p.locator('[data-color="Sand"]').click();assert.equal(await p.locator('[data-rx-lens="7"]').getAttribute('aria-pressed'),'true');
  await p.evaluate(()=>scrollTo(0,0));await p.locator('.gallery-main img').evaluate(i=>i.decode());await p.waitForTimeout(100);
  await p.screenshot({path:`evidence/lens-progressive-${width}.png`,fullPage:true});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const targets=await p.locator('[data-rx-type],[data-rx-lens]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert(targets.every(h=>h>=44));
  await p.goto(base+'#cart');assert((await p.locator('.rx-cart-details').textContent()).includes('Progressive'));await p.locator('[data-rx-edit="0"]').click();assert.equal(await p.locator('[data-rx-type=progressive]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#rx-right-add').inputValue(),'1.5');
  await p.fill('#rx-right-add','2');await p.locator('#rx-cancel').click();assert.equal(await p.evaluate(()=>cart[0].rx.right.add),'1.5');
  await p.locator('[data-rx-edit="0"]').click();await p.fill('#rx-right-add','2');await p.locator('[data-rx-lens="7"]').click();await p.locator('#add-cart').click();await p.locator('[data-rx-edit="0"]').waitFor();assert.equal(await p.evaluate(()=>cart[0].rx.right.add),'2');assert.equal(await p.evaluate(()=>cart[0].lensPrice),2400);
  await p.goto(base+'#checkout');assert((await p.locator('.rx-checkout-selections').textContent()).includes('Progressive'));assert((await p.locator('.summary-line.total').textContent()).includes('৳11,200'));
  // Both UI command and operational checkout engine reject hidden rule IDs.
  const guard=await p.evaluate(async()=>{const actor={role:'Owner'},fail=[];for(const id of [3,5]){try{await OptimanDemo.command('sale',{location:'khulna',items:[{product:'atlas',qty:1,lensId:id,rx:{type:'zero'}}],payment:'Cash'},actor,'blocked-'+id);fail.push(id);}catch{}}return fail;});assert.deepEqual(guard,[]);
  await p.locator('#checkout-form input:not([type=radio])').evaluateAll(inputs=>inputs.forEach((e,i)=>e.value=i===1?'demo@example.test':'Fictional demo'));await p.locator('#checkout-form .button').click();await p.locator('dialog').waitFor();assert((await p.locator('dialog').textContent()).includes('Simulated order reserved'));
  assert.equal(await p.evaluate(()=>OptimanDemo.snapshot({role:'Owner'}).orders.at(-1).items[0].rxType),'progressive');
  const persisted=await p.evaluate(()=>localStorage.getItem(OptimanDemo.KEY));assert(!persisted.includes('sphSign'));assert(!persisted.includes('demo@example.test'));
  // Existing seeded statuses remain untouched; rule7 alone was explicitly configured.
  assert.equal(await p.evaluate(()=>OptimanDemo.lensRules()[5].type),'UNAVAILABLE');assert.equal(await p.evaluate(()=>OptimanDemo.lensRules()[3].type),'CONSULT_WHATSAPP');
  results.push({width,passed:['four immediate types','incomplete guidance','eligible-only cards','exact positive fallback','missing/configured WhatsApp','progressive matrix editing','live price and revalidation','variant revalidation','cart Save/Cancel','checkout and price snapshots','hidden-rule command guards','touch/overflow/privacy']});await p.close();
 }
 await browser.close();assert.deepEqual(errors,[]);fs.writeFileSync('evidence/lens-correction-results.json',JSON.stringify({results,errors},null,2)+'\n');console.log('Lens correction checks passed at five widths.');
})().catch(e=>{console.error(e);process.exitCode=1;});
