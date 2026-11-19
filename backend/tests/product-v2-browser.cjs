'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.OPTIMAN_TEST_PUBLIC_BASE;
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const sku='BROWSER-'+Date.now();
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/admin/');
    await page.getByLabel('Email',{exact:true}).first().fill(process.env.OPTIMAN_TEST_EMAIL);
    await page.getByLabel('Password',{exact:true}).first().fill(process.env.OPTIMAN_TEST_PASSWORD);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    if(process.env.OPTIMAN_TEST_APPLY_UPDATE==='1'){
      await page.getByRole('button',{name:'Apply Product Management V2'}).click();
      await page.waitForFunction(()=>document.querySelector('#update-panel').hidden);
    }
    await page.getByRole('button',{name:'Add product',exact:true}).click();
    const product=page.locator('#product-form'), variant=page.locator('#variant-form');
    await product.getByLabel('Model code / parent SKU').fill(sku);
    await product.getByLabel('Product name').fill('Browser QA frame');
    await product.getByRole('combobox',{name:'Category',exact:true}).selectOption({label:'Eyeglasses'});
    await product.getByLabel('Men',{exact:true}).check();
    await product.getByLabel('Variant SKU').fill(sku+'-RED');
    await product.getByLabel('Color name').fill('Red');
    await product.getByLabel('Price per frame (BDT)').fill('1400');
    await product.getByRole('button',{name:'Save product'}).click();
    await page.getByRole('button',{name:'Add color variant'}).click();
    await variant.getByLabel('Variant SKU').fill(sku+'-BLUE');
    await variant.getByLabel('Color name').fill('Blue');
    await variant.getByLabel('Price per frame (BDT)').fill('1500.50');
    await variant.getByLabel('Default variant').check();
    await variant.getByRole('button',{name:'Save color variant'}).click();
    await page.waitForFunction(()=>document.querySelector('#variant-choice').selectedOptions[0]?.textContent.includes('Blue') && document.querySelector('#variant-choice').selectedOptions[0]?.textContent.includes('(default)'));
    await product.getByLabel('Product status').selectOption('active');
    await product.getByRole('button',{name:'Save product'}).click();
    await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Product published.');
    const file=path.join(__dirname,'../../preview/assets/muse-amber-optical-320.webp');
    await page.locator('#upload-form input').setInputFiles(file);
    await page.getByRole('button',{name:'Upload images',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#images img')?.naturalWidth===320);
    const jpeg=await page.evaluate(()=>document.createElement('canvas').toDataURL('image/jpeg').split(',')[1]);
    const previous=await page.locator('#images img').getAttribute('src');
    await page.locator('#images [data-replace]').setInputFiles({name:'test.jpg',mimeType:'image/jpeg',buffer:Buffer.from(jpeg,'base64')});
    await page.waitForFunction(old=>{const image=document.querySelector('#images img');return image.src!==old && image.naturalWidth===320;},previous);
    const stock=page.locator('#stock-form');
    await stock.getByLabel('Quantity change (+ or −)').fill('4');
    await stock.getByLabel('Reason').fill('Browser QA count');
    await stock.getByRole('button').click();
    await page.waitForFunction(()=>document.querySelector('#balances').textContent.includes('4 on hand'));
    await page.getByText('Stock movement history',{exact:true}).click();
    assert((await page.locator('#movements').textContent()).includes('Browser QA count'));
    for (const width of [360,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow at '+width);
      for(const selector of ['#product-form','#variant-form','#upload-form','#stock-form']) {
        assert(await page.locator(selector).isVisible());
        assert(await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth));
      }
    }
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.locator('tr').filter({hasText:sku}).getByRole('button',{name:'Edit'}).click();
    assert.equal(await variant.getByLabel('Price per frame (BDT)').inputValue(),'1500.50');
    const selection=page.locator('#variant-choice');
    await selection.selectOption({label:'Red · '+sku+'-RED'});
    await page.getByText('No images uploaded yet.').waitFor();
    if(process.env.OPTIMAN_V2_DISPOSABLE==='RESET TEST DATABASE'){
      await page.getByText('Reset demo catalog',{exact:true}).first().click();
      const reset=page.locator('#reset-form');
      await reset.getByLabel('Type RESET DEMO CATALOG to confirm').fill('RESET DEMO CATALOG');
      page.once('dialog',d=>d.dismiss());
      await reset.getByRole('button').click();
      assert(await page.locator('#editor').isVisible());
      page.once('dialog',d=>d.accept());
      await reset.getByRole('button').click();
      await page.getByText('No products found.',{exact:true}).waitFor();
    }
    await page.getByRole('button',{name:'Sign out'}).click();
    await page.locator('#login-panel').waitFor();
    assert.deepEqual(errors,[]);
    console.log('Browser passed: create, categorize, publish, edit two colors, default, images, adjustment, history and logout; 360/390/768/1024/1440px.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
