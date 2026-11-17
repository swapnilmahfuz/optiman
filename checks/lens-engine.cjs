const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('preview/demo-engine.js','utf8');
function boot(saved){const data=new Map(saved?[['optiman.operations.v1',JSON.stringify(saved)]]:[]);const c={console,Intl,Date,Event,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},module:{exports:{}}};c.globalThis=c;vm.createContext(c);vm.runInContext(source,c);return {D:c.OptimanDemo,data};}
(async()=>{
 const first=boot(),legacy=first.D.seed();delete legacy.lensCatalogRevision;legacy.rules.pop();legacy.rules.push({category:'Existing owner rule',option:'Keep ID 7',type:'UNAVAILABLE',types:['zero'],lensCost:null});legacy.settings.whatsappNumber='12025550123';
 const {D}=boot(legacy),owner={role:'Owner'};let n=0;const command=(type,data)=>D.command(type,data,owner,'lens-'+(++n));
 assert.equal(D.lensRules()[7].option,'Keep ID 7');assert.equal(D.lensRules()[8].types[0],'progressive');assert.equal(D.lensRules().length,9);assert.equal(D.lensRules().length,9);assert.equal(D.onlineAvailable('atlas'),10);assert.equal(JSON.stringify(D.snapshot(owner).balances),JSON.stringify(legacy.balances));
 for(const value of ['+12025550123','0123456789','123','1234567890123456','https://bad.test'])await assert.rejects(()=>command('settings',{whatsappNumber:value}));
 assert.equal(D.contact().whatsappNumber,'12025550123');await command('settings',{whatsappNumber:''});assert.equal(D.contact().whatsappNumber,'');
 await assert.rejects(()=>command('updateRule',{rule:8,type:'FIXED_PRICE',price:2400,prescriptionTypes:'progressive'}));assert.equal(D.lensRules()[8].type,'CONSULT_WHATSAPP');
 await command('updateRule',{rule:8,type:'FIXED_PRICE',price:2400,prescriptionTypes:'progressive',maxSph:3,maxCyl:2,maxAdd:2.5});
 const eye={sphSign:'+',sph:'1',cylSign:'-',cyl:'',axis:'',add:'1.5'},rx={type:'progressive',right:{...eye},left:{...eye}};
 assert.equal(D.lensDecision(D.lensRules()[8],rx),true);assert.equal(D.lensDecision(D.lensRules()[6],rx),false);assert.equal(D.lensDecision(D.lensRules()[0],rx),false);
 for(const add of ['',undefined,'NaN','3','-1'])assert.equal(D.lensDecision(D.lensRules()[8],{...rx,right:{...eye,add}}),false);
 assert.equal(D.lensDecision({type:'FIXED_PRICE',types:['progressive'],price:2400},rx),false);
 for(const id of [3,5])await assert.rejects(()=>command('sale',{location:'khulna',payment:'Cash',items:[{product:'atlas',qty:1,lensId:id,rx}]}));
 const sale=await command('sale',{location:'khulna',payment:'Cash',items:[{product:'atlas',qty:1,lensId:8,rx}]});assert.equal(sale.items[0].rxType,'progressive');assert.equal(sale.total,5600);assert.equal(D.lensRules().length,9);
 fs.writeFileSync('evidence/lens-engine-results.json',JSON.stringify({checks:['additive compatibility upgrade preserves IDs/stock/contact','validates WhatsApp configuration','explicit progressive bounds and price','distinct bifocal/progressive eligibility','ADD validation','hidden state purchase guards','progressive sale snapshot'],failures:[]},null,2)+'\n');console.log('Lens engine compatibility and guards passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
