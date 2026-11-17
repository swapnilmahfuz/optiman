const baseURL = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/';
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const failures=[],checks=[];
 for(const width of [360,390,768,1024,1440]){
  const p=await browser.newPage({viewport:{width,height:1000}});p.on('pageerror',e=>failures.push(`${width}: ${e.message}`));
  async function checkLayout(name){
   await p.locator('main img').evaluateAll(async imgs=>{for(const i of imgs){i.loading='eager';await i.decode();}});await p.waitForTimeout(100);
   const bad=await p.evaluate(()=>({overlap:(()=>{const bar=document.querySelector('.product-config .purchase'),prices=document.querySelector('.price-breakdown');return !!(bar&&prices&&bar.getBoundingClientRect().top<prices.getBoundingClientRect().bottom);})(),overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...document.querySelectorAll('.product-config button,.product-config select,.shopping-page button,.shopping-page input,.shopping-page select')].filter(e=>e.getBoundingClientRect().width>0).some(e=>e.getBoundingClientRect().width>innerWidth||e.scrollWidth>e.clientWidth+2)}));
   if(bad.overflow||bad.clipped||bad.overlap)failures.push(`${width} ${name}: overflow, clipped control or overlapping purchase action`);
   await p.screenshot({path:`evidence/${name}-shopping-${width}.png`,fullPage:true});
  }
  await p.goto(baseURL+'#product/atlas');
  if(await p.getByRole('button',{name:'Frame Only',exact:true}).getAttribute('aria-pressed')!=='true')failures.push(`${width}: frame default`);
  if(await p.locator('#lens-category,#rx,input[type=file]').count())failures.push(`${width}: frame-only prescription step`);
  if(!(await p.locator('.price-breakdown').textContent()).includes('৳3,200'))failures.push(`${width}: frame price`);
  await checkLayout('product');
  await p.locator('#add-cart').click();
  if(!(await p.locator('#bag-feedback').textContent()).includes('Added')||!await p.locator('#view-bag').isVisible())failures.push(`${width}: bag feedback`);
  const mode=p.getByRole('button',{name:'With Power / Lens',exact:true});await mode.focus();await p.keyboard.press('Enter');
  for(const [category,lens,total] of [['Single vision','৳1,200','৳4,400'],['Blue-cut / anti-reflective','৳1,600','৳4,800'],['Photochromic','৳2,200','৳5,400']]){
   await p.selectOption('#lens-category',category);const text=await p.locator('.price-breakdown').textContent();if(!text.includes(lens)||!text.includes(total))failures.push(`${width}: ${category} calculation`);
  }
  await p.selectOption('#lens-category','Single vision');await checkLayout('product-lenses');
  await p.locator('#add-cart').click();
  await p.locator('[data-rx-type=progressive]').click();for(const side of ['right','left']){await p.fill(`#rx-${side}-sph`,'1');await p.fill(`#rx-${side}-add`,'1');}
  if(!await p.locator('#add-cart').isDisabled())failures.push(`${width}: consultation purchase`);
  if(!(await p.locator('.price-breakdown').textContent()).includes('Not quoted'))failures.push(`${width}: consultation fallback price`);
  const before=await p.evaluate(()=>cart.length);await p.locator('#add-cart').evaluate(e=>{e.disabled=false;e.click()});if(await p.evaluate(()=>cart.length)!==before)failures.push(`${width}: consultation command guard`);
  await p.locator('#consult').focus();await p.keyboard.press('Enter');if(!(await p.locator('dialog').textContent()).includes('not configured'))failures.push(`${width}: inquiry boundary`);await p.keyboard.press('Escape');
  await p.locator('[data-rx-type=zero]').click();if(await p.locator('[data-rx-lens="5"]').count())failures.push(`${width}: unavailable suggestion`);await p.evaluate(()=>{rxDraft.lensId=5;configuredAdd()});if(!await p.locator('#add-cart').isDisabled()||await p.evaluate(()=>cart.length)!==before)failures.push(`${width}: unavailable rule`);
  if(!(await p.locator('.price-breakdown').textContent()).includes('Not quoted'))failures.push(`${width}: unavailable fallback price`);
  await p.getByRole('button',{name:'Frame Only',exact:true}).click();if(await p.locator('#rx').count()||await p.locator('#add-cart').isDisabled())failures.push(`${width}: frame-only reset`);
  await p.goto(baseURL+'#cart');await checkLayout('cart');
  const plus=p.locator('[data-qty="0"][data-delta="1"]');await plus.focus();await p.keyboard.press('Enter');
  if(!await p.locator('[data-qty="0"][data-delta="1"]').evaluate(e=>e===document.activeElement))failures.push(`${width}: quantity focus`);
  if(!(await p.locator('.summary-line.total').textContent()).includes('৳10,800'))failures.push(`${width}: quantity total`);
  await p.locator('[data-qty="0"][data-delta="-1"]').click();if(!(await p.locator('.summary-line.total').textContent()).includes('৳7,600'))failures.push(`${width}: quantity reduction`);
  await p.goto(baseURL+'#checkout');await checkLayout('checkout');
  if(!(await p.locator('main').textContent()).includes('SIMULATED PAYMENT ONLY'))failures.push(`${width}: simulation label`);
  await p.locator('#checkout-form input:not([type=radio])').evaluateAll(inputs=>inputs.forEach((e,i)=>e.value=i===1?'example@example.test':'Example'));
  for(const state of ['pending','failed','conflict']){
   if(state!=='pending'){await p.goto(baseURL+'#product/atlas');await p.locator('#add-cart').click();await p.goto(baseURL+'#checkout');await p.locator('#checkout-form input:not([type=radio])').evaluateAll(inputs=>inputs.forEach((e,i)=>e.value=i===1?'example@example.test':'Example'));}
   if(state!=='pending')await p.locator('input[value=online]').check();await p.selectOption('#outcome',state);await p.locator('#checkout-form .button').click();await p.locator('dialog').waitFor();
   const text=await p.locator('dialog').textContent();if(!text.includes(state==='pending'?'Simulated order reserved':state==='failed'?'Simulated payment failure':'Simulated allocation exception'))failures.push(`${width}: ${state} simulation`);await p.keyboard.press('Escape');
  }
  await p.goto(baseURL+'#product/atlas');await p.locator('#add-cart').click();await p.locator('#add-cart').click();await p.goto(baseURL+'#cart');await p.locator('[data-remove="0"]').focus();await p.keyboard.press('Enter');if(await p.locator('.bag-item').count()!==1)failures.push(`${width}: removal`);await p.locator('[data-remove="0"]').click();if(!(await p.locator('main').textContent()).includes('Your demo bag is empty'))failures.push(`${width}: empty bag`);
  if(width<600){await p.getByRole('button',{name:'Open menu'}).click();await p.locator('nav').getByRole('link',{name:'Optical Frames',exact:true}).click();if(await p.locator('#filter-category').inputValue()!=='Optical Frames')failures.push(`${width}: mobile menu`);}
  checks.push({width,flows:['frame-only','three fixed prices','consultation command guard','unavailable blocking','frame-only reset','quantity and focus','removal/empty cart','three checkout simulations','frame-only excludes prescription inputs'],screens:['product','product-lenses','cart','checkout']});await p.close();
 }
 await browser.close();fs.writeFileSync('evidence/shopping-results.json',JSON.stringify({checks,failures},null,2)+'\n');console.log(JSON.stringify({checks,failures},null,2));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
