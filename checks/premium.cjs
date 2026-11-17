const baseURL = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/';
// Review the photographic composition and keyboard/touch behavior in Chromium.
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const failures=[],details=[];
 const categories=[['All Eyewear','',''],['Sunglasses','sunglasses','Sunglasses'],['Optical Frames','optical','Optical Frames'],['Day-Night','day-night','Day-Night'],['Polarized','polarized','Polarized'],['Sale','sale','Sale']];
 for(const width of [360,390,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  page.on('pageerror',e=>failures.push(`${width}: ${e.message}`));
  await page.addInitScript(()=>{window.reviewCLS=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.reviewCLS+=e.value}).observe({type:'layout-shift',buffered:true});});
  await page.goto(baseURL+'#home');
  await page.locator('main img').evaluateAll(async imgs=>{for(const i of imgs){i.loading='eager';await i.decode();}});
  await page.waitForTimeout(250);
  const layout=await page.evaluate(()=>{
   const hero=document.querySelector('.campaign-hero'),img=hero.querySelector('img'),copy=hero.querySelector('.hero-copy');
   const r=hero.getBoundingClientRect(),c=copy.getBoundingClientRect();
   const scale=Math.max(r.width/1774,r.height/887);
   const pos=getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
   const ox=(r.width-1774*scale)*pos[0]/100,oy=(r.height-887*scale)*pos[1]/100;
   // Eyewear extents traced from the user-supplied 1774x887 campaign image.
   const glasses=[[470,188,800,315],[1180,218,1440,365]].map(([x1,y1,x2,y2])=>({left:ox+x1*scale,right:ox+x2*scale,top:oy+y1*scale,bottom:oy+y2*scale}));
   const visible=glasses.map(g=>g.left>=0&&g.right<=r.width&&g.top>=0&&g.bottom<=r.height);
   const covered=glasses.map(g=>visible[glasses.indexOf(g)]&&c.left-r.left<g.right&&c.right-r.left>g.left&&c.top-r.top<g.bottom&&c.bottom-r.top>g.top);
   return {heroHeight:r.height,copyTop:c.top-r.top,visibleGlasses:visible,copyCoversGlasses:covered,cls:window.reviewCLS,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if(layout.overflow)failures.push(`${width}: overflow`);
  if(width<=599?!layout.visibleGlasses[1]:layout.visibleGlasses.some(v=>!v))failures.push(`${width}: eyewear cropped`);
  if(layout.copyCoversGlasses.some(Boolean))failures.push(`${width}: copy overlaps eyewear`);
  if(layout.cls>.01)failures.push(`${width}: layout shift ${layout.cls}`);
  await page.locator('.hero-copy .button').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
  const focus=await page.locator('.hero-copy .button').evaluate(e=>({visible:e.matches(':focus-visible'),outline:parseFloat(getComputedStyle(e).outlineWidth),height:e.getBoundingClientRect().height}));
  if(!focus.visible||focus.outline<2||focus.height<44)failures.push(`${width}: hero keyboard/touch`);
  await page.locator('.hero-copy .button').blur();
  // Fresh screenshots contain the entire page; force images to paint first.
  await page.screenshot({path:`evidence/home-pills-${width}.png`,fullPage:true});
  const navigation=await page.locator('.category-pills').evaluate(e=>({
   images:e.querySelectorAll('img,i,svg').length,
   rows:new Set([...e.querySelectorAll('a')].map(a=>a.offsetTop)).size,
   active:[...e.querySelectorAll('[aria-current]')].map(a=>a.textContent.trim()),
   labels:[...e.querySelectorAll('a')].map(a=>a.textContent.trim()),
   clipping:[...e.querySelectorAll('a')].some(a=>a.scrollWidth>a.clientWidth)
  }));
  if(navigation.images||navigation.clipping)failures.push(`${width}: category imagery or clipping`);
  if(width>=1024&&navigation.rows!==1)failures.push(`${width}: desktop pills should share one row`);
  if(JSON.stringify(navigation.active)!==JSON.stringify(['All Eyewear']))failures.push(`${width}: homepage active state`);
  if(JSON.stringify(navigation.labels)!==JSON.stringify(categories.map(c=>c[0])))failures.push(`${width}: category order`);
  if(await page.locator('.category-disclosure').count())failures.push(`${width}: obsolete disclosure`);
  for(const [label,slug,category] of categories){
   await page.goto(baseURL+'#home');
   const tile=page.locator('.category-pills').getByRole('link',{name:label,exact:true});
   const h=await tile.evaluate(e=>e.getBoundingClientRect().height);if(h<44)failures.push(`${width}: ${label} touch target`);
   await tile.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
   if(!await tile.evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')&&parseFloat(getComputedStyle(e).outlineWidth)>=2))failures.push(`${width}: ${label} keyboard focus`);
   await page.keyboard.press('Enter');await page.waitForURL('**/#shop'+(slug?'/'+slug:''));
   if(await page.locator('#filter-category').inputValue()!==category)failures.push(`${width}: ${label} filter`);
   const active=await page.evaluate(()=>{const doc=new DOMParser().parseFromString(categoryPills(),'text/html');return [...doc.querySelectorAll('.is-active[aria-current]')].map(a=>a.textContent);});
   if(JSON.stringify(active)!==JSON.stringify([label]))failures.push(`${width}: ${label} route-derived active state`);
   if(label==='Sale'&&await page.locator('.product-card').count()!==0)failures.push(`${width}: Sale should be empty`);
  }
  await page.goto(baseURL+'#home');
  await page.fill('#search','Noir');await page.locator('#search-form button').click();
  await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===1);
  if(!(await page.locator('.product-card').textContent()).includes('Noir'))failures.push(`${width}: header search`);
  await page.fill('#search','');await page.goto(baseURL+'#product/atlas');await page.locator('.gallery-main img').evaluate(i=>i.decode());
  await page.waitForTimeout(150);await page.screenshot({path:`evidence/product-premium-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Frame + Prescription Lenses',exact:true}).click();
  if(await page.locator('.purchase').evaluate(e=>getComputedStyle(e).position)!=='static'&&width<600)failures.push(`${width}: purchase may obstruct form`);
  await page.selectOption('#lens-category','Custom');
  await page.locator('#consult').focus();await page.keyboard.press('Enter');
  if(!await page.locator('dialog').isVisible())failures.push(`${width}: keyboard consultation`);
  await page.keyboard.press('Escape');if(await page.locator('dialog').isVisible())failures.push(`${width}: dialog escape`);
  details.push({width,...layout,focus,navigation});await page.close();
 }
 fs.writeFileSync('evidence/premium-results.json',JSON.stringify({details,categoryRoutes:categories,failures},null,2)+'\n');
 console.log(JSON.stringify({details,failures},null,2));await browser.close();if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
