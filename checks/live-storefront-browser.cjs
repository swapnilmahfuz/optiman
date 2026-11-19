const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.OPTIMAN_TEST_BASE;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {for (const width of [360,390,768,1024,1440]) {
 const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.getByRole('link',{name:'Live Test'}).first().waitFor();
 assert(await p.locator('main').innerText().then(t=>t.includes('See Better.')));
 await p.getByRole('link',{name:'Live Test'}).first().click();
 await p.getByRole('heading',{name:'Live Test'}).waitFor();
 assert((await p.locator('.gallery-main img').getAttribute('src')).includes('222222'));
 assert((await p.locator('.price-row').innerText()).includes('1,200'));
 await p.getByRole('button',{name:'Image 1'}).click();assert((await p.locator('.gallery-main img').getAttribute('src')).includes('111111'));
 await p.getByRole('button',{name:'Virtual Try-On'}).click();await p.locator('.vto-dialog').waitFor();await p.getByRole('button',{name:'Close Camera'}).click();
 await p.getByRole('button',{name:'Brown'}).click();assert((await p.locator('.gallery-main img').getAttribute('src')).includes('333333'));assert((await p.locator('.price-row').innerText()).includes('1,900'));assert(await p.locator('#add-cart').isDisabled());assert.equal(await p.getByRole('button',{name:'Virtual Try-On'}).count(),0);
 await p.getByRole('button',{name:'Black'}).click();await p.getByRole('button',{name:'With Power / Lens'}).click();assert(await p.getByText('Progressive',{exact:false}).count());await p.getByRole('button',{name:'Frame Only'}).click();await p.locator('#add-cart').click();await p.locator('#view-bag').click();await p.getByRole('button',{name:'Edit Prescription & Lenses'}).waitFor();await p.getByRole('link',{name:'Preview checkout'}).click();await p.locator('#checkout-form').waitFor();
 await p.goto(base+'#shop/eyeglasses');await p.getByRole('link',{name:'Live Test'}).first().waitFor();await p.getByRole('link',{name:'Live Test'}).first().click();await p.reload();await p.getByRole('heading',{name:'Live Test'}).waitFor();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);assert.deepEqual(errors,[]);await p.close();}
 const imagePage=await browser.newPage();
 await imagePage.route('**/uploads/products/*',route=>route.abort());
 await imagePage.goto(base+'#product/3');await imagePage.getByText('Image coming soon',{exact:true}).first().waitFor();await imagePage.close();
 const empty=await browser.newPage();await empty.route('**/index.php?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:new URL(route.request().url()).searchParams.get('path').endsWith('categories')?[]:{items:[],total:0}})}));await empty.goto(base);await empty.getByText('No frames found.').waitFor();await empty.close();
 const p=await browser.newPage();await p.route('**/index.php?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await p.goto(base);await p.getByRole('alert').waitFor();await p.close();
 console.log('Built storefront and local V2 backend passed five-width catalog, image, variant, stock, VTO UI, shopping, category, routing and error tests.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
