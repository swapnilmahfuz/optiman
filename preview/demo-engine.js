/* Persistent synthetic operations only. Never pass Rx values, filenames or customer data here. */
(function(root){
 'use strict';
 const KEY='optiman.operations.v1',VERSION=1;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const fingerprint=x=>{let h=2166136261;for(const c of JSON.stringify(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
 const day=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
 const ago=n=>new Date(Date.now()-n*86400000).toISOString();
 const initialRules=[
  {category:'Single vision',option:'Clear / anti-reflective',type:'FIXED_PRICE',price:1200,maxSph:4,maxCyl:2,lensCost:null},
  {category:'Blue-cut / anti-reflective',option:'Blue-cut coating',type:'FIXED_PRICE',price:1600,maxSph:4,maxCyl:2,lensCost:null},
  {category:'Photochromic',option:'Light-adaptive',type:'FIXED_PRICE',price:2200,maxSph:2,maxCyl:1,lensCost:null},
  {category:'Progressive / bifocal',option:'Individual fitting',type:'CONSULT_WHATSAPP',lensCost:null},
  {category:'Custom',option:'Owner consultation',type:'CONSULT_WHATSAPP',lensCost:null},
  {category:'Single vision',option:'Ultra-thin example',type:'UNAVAILABLE',lensCost:null},
  {category:'Bifocal demo',option:'Moon standard pair',type:'FIXED_PRICE',price:1800,maxSph:3,maxAdd:2.5,lensCost:null}
 ];
 function seed(){
  const s={version:VERSION,revision:0,next:1000,locations:[{id:'khulna',name:'Khulna Branch',online:true,type:'branch'},{id:'chattogram',name:'Chattogram Branch',online:true,type:'branch'},{id:'warehouse',name:'Central Warehouse',online:true,type:'warehouse'}],users:[{role:'Owner',name:'Demo Owner'},{role:'Branch Manager',name:'Demo Branch Manager',assigned:'khulna'}],suppliers:[{id:'supplier-a',name:'Demo Frame Supply'},{id:'supplier-b',name:'Synthetic Optical Supply'}],products:[],balances:[],movements:[],receipts:[],transfers:[],sales:[],returns:[],orders:[],rules:clone(initialRules),commands:{},holds:[],settings:{priceBands:[0,2500,3500,5000],lowStock:3}};
  const rows=[['atlas','Atlas','Sunglasses',3200,'Espresso','52 · 20 · 145','Acetate',1200,'OPT-FR-001-BRN-52','atlas'],['muse','Muse','Optical Frames',2800,'Honey','49 · 21 · 140','Acetate',1000,'OPT-FR-002-HNY-49','muse'],['noir','Noir','Polarized',3600,'Onyx','54 · 19 · 145','Acetate',1500,'OPT-FR-003-BLK-54','noir'],['forma','Forma','Day-Night',3000,'Champagne','50 · 20 · 142','Metal',1100,'OPT-FR-004-CHM-50','forma'],['echo','Echo','Optical Frames',1800,'Demo Brown','50 · 18 · 140','Demo acetate',700,'OPT-FR-005-BRN-50','muse'],['vista','Vista','Sunglasses',6500,'Demo Black','53 · 20 · 145','Demo acetate',2600,'OPT-FR-006-BLK-53','noir'],['arc','Arc','Day-Night',4200,'Demo Amber','51 · 20 · 140','Demo material',null,'OPT-FR-007-AMB-51','forma'],['new-edit','New Edit','Optical Frames',2400,'Demo Amber','50 · 20 · 140','Demo material',900,'OPT-FR-008-AMB-50','muse']];
  s.products=rows.map((r,i)=>({id:r[0],name:r[1],category:r[2],price:r[3],color:r[4],size:r[5],material:r[6],cost:r[7],sku:r[8],barcode:r[8],photo:r[9],featured:i<4,brand:'Optiman demo',frameType:'Demo frame',status:'active',created:ago(i===7?3:120),tag:['THE EVERYDAY ICON','LIGHT BY DESIGN','A BOLDER PERSPECTIVE','QUIETLY DISTINCTIVE'][i]||'SYNTHETIC CATALOG'}));
  // Historical sale snapshots first; opening stock is derived backwards to reconcile exactly.
  for(let d=89;d>=1;d--){if(d%3===0||d<14){const p=s.products[1+d%5],location=d%2?'khulna':'chattogram',qty=d%4===0?2:1;
    s.sales.push({id:'SEED-S'+d,location,at:ago(d),channel:'POS',payment:'Cash',status:'completed',items:[{product:p.id,sku:p.sku,name:p.name,category:p.category,qty,framePrice:p.price,lensPrice:0,frameCost:p.cost,lensCost:0,lensCategory:'Frame Only',rxType:null}],total:p.price*qty,synthetic:true});}}
  for(const loc of s.locations)for(const [i,p] of s.products.entries()){
   const target=i===0?({khulna:3,chattogram:2,warehouse:5}[loc.id]):i===6?0:i===5?1:i===7?2:12+i;
   const sold=s.sales.filter(x=>x.location===loc.id).flatMap(x=>x.items).filter(x=>x.product===p.id).reduce((n,x)=>n+x.qty,0);
   const opening=target+sold-(p.id==='muse'&&loc.id==='warehouse'?4:0);
   s.balances.push({location:loc.id,product:p.id,onHand:target,reserved:0,quarantine:0});
   s.movements.push({id:'OPEN-'+loc.id+'-'+p.id,at:ago(120),location:loc.id,product:p.id,delta:opening,reservedDelta:0,reason:'Synthetic opening stock',reference:'OPENING'});
  }
  s.receipts.push({id:'SEED-R1',supplier:'supplier-a',invoice:'DEMO-OPEN-001',location:'warehouse',date:day(ago(95)),at:ago(95),items:[{product:'muse',qty:4,cost:1000,price:2800}]});
  s.movements.push({id:'SEED-MR1',at:ago(95),location:'warehouse',product:'muse',delta:4,reservedDelta:0,reason:'Supplier receipt',reference:'SEED-R1'});
  for(const sale of s.sales)for(const item of sale.items)s.movements.push({id:'M-'+sale.id,at:sale.at,location:sale.location,product:item.product,delta:-item.qty,reservedDelta:0,reason:'POS sale',reference:sale.id});
  s.transfers.push({id:'SEED-T1',source:'warehouse',destination:'khulna',product:'muse',qty:2,received:0,status:'planned',at:ago(1)});
  return s;
 }
 let memory;try{memory=JSON.parse(root.localStorage?.getItem(KEY)||'null');}catch{}
 if(!memory||memory.version!==VERSION)memory=seed();
 const storage=()=>{try{const x=JSON.parse(root.localStorage?.getItem(KEY)||'null');if(x&&x.version===VERSION)return x;}catch{}return memory;};
 function staff(actor){if(!actor||!['Owner','Branch Manager'].includes(actor.role))throw Error('Select an Owner or Branch Manager demo mode.');}
 function permitted(actor,location){staff(actor);if(actor.role==='Branch Manager'&&location!=='khulna')throw Error('Branch Manager scope is Khulna only.');}
 function exists(s,location){if(!s.locations.some(l=>l.id===location))throw Error('Choose a valid location.');}
 function whole(n){n=Number(n);if(!Number.isInteger(n)||n<1||n>10000)throw Error('Quantity must be a positive whole number, up to 10,000.');return n;}
 function amount(n,nullable=false){if(nullable&&(n==null||n===''))return null;n=Number(n);if(!Number.isFinite(n)||n<0||Math.abs(Math.round(n*100)-n*100)>0.000001)throw Error('Use a nonnegative amount with at most two decimal places.');return n;}
 function product(s,id){const p=s.products.find(p=>p.id===id||p.sku===id||p.barcode===id);if(!p)throw Error('SKU not found.');return p;}
 function bal(s,loc,id){exists(s,loc);product(s,id);let b=s.balances.find(b=>b.location===loc&&b.product===id);if(!b){b={location:loc,product:id,onHand:0,reserved:0,quarantine:0};s.balances.push(b);}return b;}
 const available=b=>b.onHand-b.reserved;
 function id(s,prefix){return prefix+'-'+(++s.next);}
 function move(s,loc,p,delta,reservedDelta,reason,reference){const b=bal(s,loc,p);if(b.onHand+delta<0||b.reserved+reservedDelta<0||b.onHand+delta<b.reserved+reservedDelta)throw Error('Insufficient available stock; reserved units cannot be sold.');b.onHand+=delta;b.reserved+=reservedDelta;s.movements.push({id:id(s,'MOV'),at:new Date().toISOString(),location:loc,product:p,delta,reservedDelta,reason,reference});}
 function allAvailability(s,p){return s.locations.filter(l=>l.online).reduce((n,l)=>n+available(bal(s,l.id,p)),0);}
 function catalogItem(s,data){
  const sku=String(data.sku||'').trim().toUpperCase();if(!/^[A-Z0-9-]{4,48}$/.test(sku))throw Error('SKU must be 4–48 uppercase letters, digits or hyphens.');
  if(s.products.some(p=>p.sku===sku||p.barcode===sku))throw Error('Duplicate master SKU. Reuse the existing variant.');
  for(const key of ['name','category','color','size'])if(!String(data[key]||'').trim())throw Error('Model, category, color and size are required.');
  const p={id:id(s,'variant'),sku,barcode:sku,name:String(data.name).slice(0,80),category:String(data.category).slice(0,50),color:String(data.color).slice(0,40),size:String(data.size).slice(0,40),brand:String(data.brand||'Demo').slice(0,50),frameType:String(data.frameType||'Demo frame').slice(0,50),material:'Synthetic metadata',price:amount(data.price),cost:amount(data.cost,true),photo:'muse',status:'active',created:new Date().toISOString(),tag:'SYNTHETIC CATALOG',featured:false};s.products.push(p);return p;
 }
 function saleLines(s,lines){if(!Array.isArray(lines)||!lines.length)throw Error('Add at least one item.');return lines.map(l=>{const p=product(s,l.product||l.id);if(p.status!=='active')throw Error('Product is not active.');const qty=whole(l.qty),lensId=l.lensId??l.rx?.lensId;let lensPrice=0,lensCost=0,lensCategory='Frame Only';if(lensId!==null&&lensId!==undefined){const r=s.rules[Number(lensId)];if(!r||r.type!=='FIXED_PRICE')throw Error('Consultation or unavailable lenses cannot enter a sale.');lensPrice=amount(r.price);lensCost=r.lensCost===null?null:amount(r.lensCost);lensCategory=r.category;}
   return {product:p.id,sku:p.sku,name:p.name,category:p.category,qty,framePrice:p.price,lensPrice,frameCost:p.cost,lensCost,lensCategory,rxType:l.rxType||l.rx?.type||null};});}
 function grouped(items){const q={};for(const l of items)q[l.product]=(q[l.product]||0)+l.qty;return q;}
 function transferScope(a,t){staff(a);if(a.role==='Branch Manager'&&t.source!=='khulna'&&t.destination!=='khulna')throw Error('Transfer is outside assigned branch scope.');}
 function execute(s,type,data,a){
  if(type==='reset'){staff(a);return {reset:true};}
  if(type==='createProduct'){staff(a);return catalogItem(s,data);}
  if(type==='updateProduct'){staff(a);const p=product(s,data.product);if(data.price!==undefined)p.price=amount(data.price);if(data.cost!==undefined)p.cost=amount(data.cost,true);if(data.status!==undefined){if(!['active','inactive'].includes(data.status))throw Error('Invalid product status.');p.status=data.status;}return p;}
  if(type==='updateRule'){staff(a);const r=s.rules[Number(data.rule)];if(!r)throw Error('Rule not found.');if(!['FIXED_PRICE','CONSULT_WHATSAPP','UNAVAILABLE'].includes(data.type))throw Error('Invalid explicit rule.');r.type=data.type;r.price=data.type==='FIXED_PRICE'?amount(data.price):null;r.lensCost=amount(data.lensCost,true);for(const k of ['maxSph','maxCyl','maxAdd'])if(data[k]!==undefined&&data[k]!=='')r[k]=amount(data[k]);return r;}
  if(type==='receive'){
   permitted(a,data.location);exists(s,data.location);if(!s.suppliers.some(v=>v.id===data.supplier))throw Error('Choose a supplier.');const invoice=String(data.invoice||'').trim();if(!invoice)throw Error('Supplier invoice/reference is required.');if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date))throw Error('Receiving date required.');
   if(s.receipts.some(r=>r.supplier===data.supplier&&r.invoice===invoice))throw Error('This supplier invoice was already received.');if(!data.items?.length)throw Error('Add receiving lines.');
   const receipt={id:id(s,'REC'),supplier:data.supplier,invoice:invoice.slice(0,80),location:data.location,date:data.date,at:new Date().toISOString(),items:[]};
   for(const l of data.items){const p=l.newProduct?catalogItem(s,l.newProduct):product(s,l.product);const qty=whole(l.qty),cost=amount(l.cost);if(l.price!==undefined&&l.price!=='')p.price=amount(l.price);p.cost=cost;receipt.items.push({product:p.id,qty,cost,price:p.price});move(s,data.location,p.id,qty,0,'Supplier receipt',receipt.id);}s.receipts.push(receipt);return receipt;
  }
  if(type==='adjust'){permitted(a,data.location);if(!String(data.reason||'').trim())throw Error('Adjustment reason required.');const q=Number(data.delta);if(!Number.isInteger(q)||q===0)throw Error('Use a nonzero whole adjustment.');const ref=id(s,'ADJ');move(s,data.location,data.product,q,0,String(data.reason).slice(0,120),ref);return {id:ref};}
  if(type==='sale'){
   permitted(a,data.location);if(!['Cash','Card','Mobile financial service'].includes(data.payment))throw Error('Select a configured simulated tender.');
   const items=saleLines(s,data.items),sale={id:id(s,'SALE'),location:data.location,at:new Date().toISOString(),channel:'POS',payment:data.payment,status:'completed',items,total:items.reduce((n,l)=>n+(l.framePrice+l.lensPrice)*l.qty,0),synthetic:true};
   for(const [p,q]of Object.entries(grouped(items)))move(s,data.location,p,-q,0,'POS sale',sale.id);s.sales.push(sale);return sale;
  }
  if(type==='hold'){permitted(a,data.location);const h={id:id(s,'HOLD'),location:data.location,items:saleLines(s,data.items).map(l=>({product:l.product,qty:l.qty,lensId:data.items.find(x=>(x.product||x.id)===l.product)?.lensId??null})),at:new Date().toISOString()};s.holds.push(h);return h;}
  if(type==='resume'){const h=s.holds.find(h=>h.id===data.id);if(!h)throw Error('Held sale not found.');permitted(a,h.location);s.holds=s.holds.filter(x=>x.id!==h.id);return h;}
  if(type==='transferCreate'){
   exists(s,data.source);exists(s,data.destination);const t={id:id(s,'TRF'),source:data.source,destination:data.destination,product:product(s,data.product).id,qty:whole(data.qty),received:0,status:'planned',at:new Date().toISOString()};transferScope(a,t);if(t.source===t.destination)throw Error('Choose different locations.');if(a.role==='Owner'||t.source==='khulna'){if(available(bal(s,t.source,t.product))<t.qty)throw Error('Insufficient source availability.');}s.transfers.push(t);return t;
  }
  if(type.startsWith('transfer')){
   const t=s.transfers.find(t=>t.id===data.id);if(!t)throw Error('Transfer not found.');transferScope(a,t);
   if(type==='transferDispatch'){permitted(a,t.source);if(t.status!=='planned')throw Error('Transfer already dispatched or closed.');move(s,t.source,t.product,-t.qty,0,'Transfer dispatch',t.id);t.status='in_transit';}
   else if(type==='transferReceive'){permitted(a,t.destination);if(t.status!=='in_transit')throw Error('Transfer is not in transit.');const q=whole(data.qty);if(q>t.qty-t.received)throw Error('Cannot receive more than remaining transit quantity.');move(s,t.destination,t.product,q,0,'Transfer receipt',t.id);t.received+=q;if(t.received===t.qty)t.status='received';}
   else if(type==='transferCancel'){if(t.status==='planned')t.status='cancelled';else if(t.status==='in_transit'){permitted(a,t.source);move(s,t.source,t.product,t.qty-t.received,0,'Cancelled transit returned to origin',t.id);t.status='cancelled';}else throw Error('Transfer is closed.');}
   return t;
  }
  if(type==='online'){
   const items=saleLines(s,data.items),q=grouped(items),eligible=s.locations.filter(l=>l.online&&Object.entries(q).every(([p,n])=>available(bal(s,l.id,p))>=n));
   const location=eligible.find(l=>l.id===data.location)||eligible[0];
   const order={id:id(s,'WEB'),at:new Date().toISOString(),items,location:location?.id||null,status:location?'reserved':'allocation_exception',payment:data.payment==='online'?'simulated_paid':'simulated_cod',review:items.some(l=>l.rxType&&l.rxType!=='zero')?'Pending':'Not required',customerApproved:false,total:items.reduce((n,l)=>n+(l.framePrice+l.lensPrice)*l.qty,0),synthetic:true};
   if(location)for(const [p,n]of Object.entries(q))move(s,location.id,p,0,n,'Online reservation',order.id);s.orders.push(order);return order;
  }
  if(['orderCancel','orderDispatch','review','acceptQuote','orderAllocate'].includes(type)){
   const o=s.orders.find(o=>o.id===data.id);if(!o)throw Error('Order not found.');
   if(type==='acceptQuote'){if(o.review!=='Revised quote awaiting customer acceptance')throw Error('No revised quote pending.');o.customerApproved=true;o.review='Approved';if(o.proposedTotal!==undefined)o.acceptedTotal=o.proposedTotal;return o;}
   if(type==='orderAllocate'){permitted(a,data.location);if(o.status!=='allocation_exception')throw Error('Order is already allocated.');if(!s.locations.some(l=>l.id===data.location&&l.online))throw Error('Location is not eligible for online fulfillment.');for(const [p,n]of Object.entries(grouped(o.items)))move(s,data.location,p,0,n,'Resolved online reservation',o.id);o.location=data.location;o.status='reserved';return o;}
   permitted(a,o.location);
   if(type==='review'){if(!['Pending','Needs clarification','Approved','Rejected','Revised quote awaiting customer acceptance'].includes(data.review))throw Error('Invalid review state.');if(!['reserved','allocation_exception'].includes(o.status))throw Error('Order is closed.');o.review=data.review;o.customerApproved=false;if(data.review==='Revised quote awaiting customer acceptance'){const item=o.items[Number(data.item??0)];if(!item||!item.rxType)throw Error('Select a lens item.');const lens=amount(data.lensPrice);o.proposed={index:Number(data.item??0),lensPrice:lens};o.proposedTotal=o.total+(lens-item.lensPrice)*item.qty;}return o;}
   if(type==='orderCancel'){if(o.status!=='reserved')throw Error('Only reserved orders can be cancelled.');for(const [p,n]of Object.entries(grouped(o.items)))move(s,o.location,p,0,-n,'Online cancellation release',o.id);o.status='cancelled';o.refundState=o.payment==='simulated_paid'?'Simulated refund pending':'No payment taken';return o;}
   if(o.status!=='reserved'||!['Approved','Not required'].includes(o.review))throw Error('Required prescription verification/customer acceptance is incomplete.');if(o.proposed&&!o.customerApproved)throw Error('Customer has not accepted revised quotation.');
   if(o.proposed){o.items[o.proposed.index].lensPrice=o.proposed.lensPrice;o.total=o.acceptedTotal;}
   for(const [p,n]of Object.entries(grouped(o.items)))move(s,o.location,p,-n,-n,'Online dispatch',o.id);o.status='dispatched';const sale={id:id(s,'SALE'),order:o.id,location:o.location,at:new Date().toISOString(),channel:'Online',payment:o.payment,items:clone(o.items),total:o.total,status:'completed',synthetic:true};s.sales.push(sale);o.sale=sale.id;return o;
  }
  if(type==='return'){
   const sale=s.sales.find(v=>v.id===data.sale);if(!sale)throw Error('Original transaction not found.');permitted(a,sale.location);const i=Number(data.item),item=sale.items[i];if(!item)throw Error('Choose a sale item.');const q=whole(data.qty),returned=s.returns.filter(r=>r.sale===sale.id&&r.item===i).reduce((n,r)=>n+r.qty,0);if(q>item.qty-returned)throw Error('Return exceeds remaining sold quantity.');if(!String(data.reason||'').trim())throw Error('Return reason required.');if(!['sellable','quarantine'].includes(data.disposition))throw Error('Inspect and select a return disposition.');
   const ret={id:id(s,'RET'),sale:sale.id,item:i,product:item.product,location:sale.location,at:new Date().toISOString(),qty:q,reason:String(data.reason).slice(0,120),disposition:data.disposition,refund:(item.framePrice+item.lensPrice)*q,frameRefund:item.framePrice*q,lensRefund:item.lensPrice*q,frameCost:item.frameCost,lensCost:item.lensCost,category:item.category,lensCategory:item.lensCategory};
   if(data.disposition==='sellable')move(s,sale.location,item.product,q,0,'Inspected sellable return',ret.id);else{bal(s,sale.location,item.product).quarantine+=q;move(s,sale.location,item.product,0,0,'Quarantined return (not sellable)',ret.id);}s.returns.push(ret);return ret;
  }
  if(type==='settings'){staff(a);if(data.bands){const bands=String(data.bands).split(',').map(Number);if(bands.length<2||bands.some((n,i)=>!Number.isFinite(n)||n<0||(i&&n<=bands[i-1])))throw Error('Use increasing nonnegative comma-separated price bounds.');s.settings.priceBands=bands;}return s.settings;}
  throw Error('Unknown demo command.');
 }
 async function command(type,data={},actor={role:'Public'},key){
  const run=()=>{const s=clone(storage());if(key&&s.commands[key]){const old=s.commands[key];if(old.type!==type||old.fingerprint!==fingerprint(data))throw Error('Idempotency key reused with a different request.');return clone(old.result);}
   const result=execute(s,type,data,actor);if(type==='reset'){memory=seed();}else{if(key)s.commands[key]={type,fingerprint:fingerprint(data),result:clone(result)};s.revision++;memory=s;}
   try{root.localStorage?.setItem(KEY,JSON.stringify(memory));}catch{throw Error('Demo persistence unavailable. Enable browser storage or reset this demo.');}
   if(typeof root.dispatchEvent==='function')root.dispatchEvent(new Event('optiman-demo-change'));return clone(result);
  };return root.navigator?.locks?.request?root.navigator.locks.request('optiman-operations',run):run();
 }
 function snapshot(actor={role:'Owner'},location='all'){
  staff(actor);const s=clone(storage()),allowed=actor.role==='Owner'?(location==='all'?s.locations.map(l=>l.id):[location]):['khulna'];
  s.locations=s.locations.filter(l=>allowed.includes(l.id));s.balances=s.balances.filter(b=>allowed.includes(b.location));for(const key of ['movements','receipts','sales','returns','orders','holds'])s[key]=s[key].filter(r=>allowed.includes(r.location));s.transfers=s.transfers.filter(t=>allowed.includes(t.source)||allowed.includes(t.destination));s.commands={};return s;
 }
 function analytics(actor,filters={}){
  const s=snapshot(actor,filters.location||'all');let from=filters.from||day(ago(29)),to=filters.to||day();
  const match=(l,date)=>day(date)>=from&&day(date)<=to&&(!filters.category||l.category===filters.category)&&(!filters.product||l.product===filters.product)&&(!filters.min||l.framePrice>=Number(filters.min))&&(!filters.max||l.framePrice<=Number(filters.max));
  const rows=[];for(const sale of s.sales)for(const l of sale.items)if(match(l,sale.at))rows.push({...l,at:sale.at,location:sale.location,sale:sale.id,qty:l.qty,revenue:(l.framePrice+l.lensPrice)*l.qty,profit:l.frameCost===null||l.lensCost===null?null:(l.framePrice+l.lensPrice-l.frameCost-l.lensCost)*l.qty,refund:0});
  for(const ret of s.returns){const sale=s.sales.find(v=>v.id===ret.sale);const l=sale?.items[ret.item];if(l&&match(l,ret.at))rows.push({...l,at:ret.at,location:ret.location,sale:ret.sale,qty:-ret.qty,revenue:-ret.refund,profit:ret.frameCost===null||ret.lensCost===null?null:-(ret.refund-(ret.frameCost+ret.lensCost)*ret.qty),refund:ret.refund});}
  const group=key=>{const map={};for(const r of rows){const k=key(r);const g=map[k]||(map[k]={label:k,units:0,revenue:0,refunds:0,profit:0,missingCost:false});g.units+=r.qty;g.revenue+=r.revenue;g.refunds+=r.refund;if(r.profit===null)g.missingCost=true;else g.profit+=r.profit;}return Object.values(map);};
  const bands=s.settings.priceBands;const band=p=>{let i=bands.findLastIndex(v=>p>=v);i=Math.max(i,0);return bands[i]+'–'+(bands[i+1]===undefined?'above':bands[i+1]-0.01);};
  const total=rows.reduce((n,r)=>n+r.revenue,0),units=rows.reduce((n,r)=>n+r.qty,0),knownProfit=rows.filter(r=>r.profit!==null).reduce((n,r)=>n+r.profit,0),missing=rows.some(r=>r.profit===null);
  const ranking=s.products.filter(p=>(!filters.category||p.category===filters.category)&&(!filters.product||p.id===filters.product)&&(!filters.min||p.price>=Number(filters.min))&&(!filters.max||p.price<=Number(filters.max))).map(p=>{const pr=rows.filter(r=>r.product===p.id);const qty=pr.reduce((n,r)=>n+r.qty,0),availableQty=s.balances.filter(b=>b.product===p.id).reduce((n,b)=>n+available(b),0),age=Math.floor((Date.now()-Date.parse(p.created))/86400000),days=Math.max(1,(Date.parse(to)-Date.parse(from))/86400000+1);return {label:p.name,sku:p.sku,product:p.id,units:qty,revenue:pr.reduce((n,r)=>n+r.revenue,0),available:availableQty,age,velocity:qty/days,status:age<30?'Insufficient history':qty===0?'Zero sales':qty/days<.1?'Slow-moving':'Active',turnover:availableQty+qty>0?qty/Math.max(1,(availableQty+availableQty+qty)/2):null};});
  return {from,to,total,units,transactions:new Set(rows.filter(r=>r.refund===0).map(r=>r.sale)).size,average:total/Math.max(1,new Set(rows.filter(r=>r.refund===0).map(r=>r.sale)).size),profit:missing?null:knownProfit,knownProfit,missingCost:missing,refunds:rows.reduce((n,r)=>n+r.refund,0),daily:group(r=>day(r.at)).sort((a,b)=>a.label.localeCompare(b.label)),weekly:group(r=>{const d=new Date(r.at);d.setUTCDate(d.getUTCDate()-d.getUTCDay());return day(d);}),monthly:group(r=>day(r.at).slice(0,7)),category:group(r=>r.category),bands:group(r=>band(r.framePrice)),branch:group(r=>s.locations.find(l=>l.id===r.location)?.name||r.location),lenses:group(r=>r.lensCategory),ranking:ranking.sort((a,b)=>b.units-a.units),rows};
 }
 const api={command,snapshot,analytics,seed,day,KEY,catalog:()=>clone(storage().products),lensRules:()=>clone(storage().rules),locations:()=>clone(storage().locations),onlineAvailable:p=>{const s=clone(storage());return product(s,p).status==='active'?allAvailability(s,p):0;},lookup:code=>{const s=storage();return clone(s.products.find(p=>p.sku.toLowerCase()===String(code).toLowerCase()||p.barcode.toLowerCase()===String(code).toLowerCase()||('opt-'+p.id)===String(code).toLowerCase()||p.name.toLowerCase()===String(code).toLowerCase())||null);}};
 root.OptimanDemo=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
