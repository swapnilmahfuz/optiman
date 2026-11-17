'use strict';
// Synthetic demonstration only. No storage, file reads, uploads or external calls.
const rxTypes = {zero:'Zero Power',unifocal:'Unifocal',bifocal:'Bifocal',progressive:'Progressive'};
const rxTypeHelp={zero:'no correction (পাওয়ার ছাড়া)',unifocal:'distance power (দূরের পাওয়ার)',bifocal:'near power (কাছের পাওয়ার)',progressive:'multifocal power (দূর ও কাছের পাওয়ার)'};
const emptyEye = () => ({sphSign:'+',sph:'',cylSign:'-',cyl:'',axis:'',add:''});
const freshRx = () => ({type:'zero',shape:'',right:emptyEye(),left:emptyEye(),ipd:'',fileName:'',step:1,category:'',lensId:null,qty:1});
let rxDraft=freshRx(), rxEditing=null, rxPendingEdit=null, rxErrors=[];
const cloneRx = value => JSON.parse(JSON.stringify(value));
function enterProductRoute(){
  rxErrors=[];rxEditing=null;rxDraft=freshRx();
  if(rxPendingEdit!==null){
    const line=cart[rxPendingEdit];
    if(line&&current().id===line.id){rxEditing=rxPendingEdit;rxDraft=line.rx?cloneRx(line.rx):freshRx();rxDraft.qty=line.qty;rxDraft.step=line.rx?3:1;lens=!!line.rx;color=line.color;}
    rxPendingEdit=null;
  }
  if(typeof preparePOSRx==='function')preparePOSRx();
}
function rxMagnitude(v){return v===''?null:Number(v);}
function rxManualBlank(){return ['right','left'].every(side=>['sph','cyl','axis','add'].every(k=>rxDraft[side][k]===''));}
function rxUploadOnly(){return rxDraft.type!=='zero'&&rxManualBlank()&&!!rxDraft.fileName;}
function rxValidation(){
  const errors=[];
  if(!Object.hasOwn(rxTypes,rxDraft.type))return ['Choose a prescription type.'];
  if(rxDraft.type==='zero')return errors;
  if(rxDraft.type==='bifocal'&&!['Moon Shape','Flat Top'].includes(rxDraft.shape))errors.push('Choose a bifocal lens shape.');
  const quarter=v=>Number.isFinite(v)&&Math.abs(v*4-Math.round(v*4))<0.000001;
  if(!rxUploadOnly())for(const side of ['right','left']){
    const eye=rxDraft[side],label=side==='right'?'Right eye':'Left eye';
    const sph=rxMagnitude(eye.sph),cyl=rxMagnitude(eye.cyl),add=rxMagnitude(eye.add);
    if(!['+','-'].includes(eye.sphSign))errors.push(`${label}: choose a valid SPH sign.`);
    if(sph===null||!quarter(sph)||sph<0||sph>12)errors.push(`${label}: SPH needs a magnitude 0–12 in 0.25 steps (demo range).`);
    if(['unifocal','bifocal','progressive'].includes(rxDraft.type)){
      if(!['+','-'].includes(eye.cylSign))errors.push(`${label}: choose a valid CYL sign.`);
      if(cyl!==null&&(!quarter(cyl)||cyl<0||cyl>6))errors.push(`${label}: CYL must be 0–6 in 0.25 steps (demo range).`);
      if(eye.axis!==''){
        const axis=Number(eye.axis);
        if(!Number.isInteger(axis)||axis<0||axis>180)errors.push(`${label}: Axis must be an integer from 0 to 180.`);
        if(cyl===null||cyl===0)errors.push(`${label}: Axis requires a nonzero CYL magnitude.`);
      }
    }
    if(['bifocal','progressive'].includes(rxDraft.type)&&(add===null||!quarter(add)||add<=0||add>4))errors.push(`${label}: ADD must be positive, +0.25 to +4 in 0.25 steps (demo range).`);
  }
  if(rxDraft.ipd!==''){
    const ipd=Number(rxDraft.ipd);
    if(!Number.isFinite(ipd)||ipd<40||ipd>80||Math.abs(ipd*2-Math.round(ipd*2))>0.000001)errors.push('Optional IPD must be 40–80 mm in 0.5 steps (synthetic demo range).');
  }
  return errors;
}
function rxOptions(){return OptimanDemo.lensRules().map((r,id)=>({...r,id,ruleCategory:r.category,category:r.lensType||({0:'Anti-Reflective Lens',1:'Blue Cut Lens',2:'Photochromic Lens',6:'White Lens'}[id]||'White Lens'),features:r.features||({0:'Clear vision · anti-reflective finish',1:'Blue-cut · anti-reflective finish',2:'Light-adaptive lenses',6:'Moon shape · lined near and distance'}[id]||'Configured lens finish')}));}
function rxEligibility(option){
  if(option.type==='UNAVAILABLE')return {type:'UNAVAILABLE',reason:'This explicit demo combination is unavailable.'};
  if(rxValidation().length)return {type:'UNAVAILABLE',reason:'Complete valid demo details first.'};
  if(option.types&&!option.types.includes(rxDraft.type))return {type:'UNAVAILABLE',reason:'This rule is not configured for the selected prescription type.'};
  if(option.type==='CONSULT_WHATSAPP')return {type:option.type,reason:'Contact our WhatsApp for details. No automatic quotation.'};
  return OptimanDemo.lensDecision(option,rxDraft)?{type:'FIXED_PRICE',reason:'Eligible under configured synthetic demo rules only; staff verification required.'}:{type:'UNAVAILABLE',reason:'Outside the configured synthetic power/type/shape rules. No price substitution.'};
}
function selectedRxOption(){
  const option=rxOptions().find(o=>o.id===rxDraft.lensId);
  return option?{...option,...rxEligibility(option)}:null;
}
function rxSelectionValid(){return Number.isInteger(rxDraft.qty)&&rxDraft.qty>=1&&rxDraft.qty<=99&&(!lens||(!rxValidation().length&&selectedRxOption()?.type==='FIXED_PRICE'));}
function rxCanAdd(){const quantity=typeof rxPOSContext!=='undefined'&&rxPOSContext?stockAt(current().id,rxPOSContext.location):OptimanDemo.onlineAvailable(current().id);return rxSelectionValid()&&quantity>=rxDraft.qty;}
function rxErrorHTML(){return `<div id="rx-errors" role="alert" tabindex="-1" ${rxErrors.length?'':'hidden'}>${rxErrors.length?'<b>Check the demo details</b><ul>'+rxErrors.map(e=>`<li>${esc(e)}</li>`).join('')+'</ul>':''}</div>`;}
function rxField(side,key,label,{sign=false,max=12,step='.25',optional=false}={}){
  const eye=rxDraft[side],id=`rx-${side}-${key}`;
  return `<label for="${id}">${label}${optional?' · optional':''}<span class="power-input">${sign?`<select id="${id}-sign" data-rx-field="${side}.${key}Sign" aria-label="${side} ${label} sign"><option value="+" ${eye[key+'Sign']==='+'?'selected':''}>+</option><option value="-" ${eye[key+'Sign']==='-'?'selected':''}>−</option></select>`:key==='add'?'<span class="positive-sign" aria-hidden="true">+</span>':''}<input id="${id}" aria-label="${side} ${label} magnitude" data-rx-field="${side}.${key}" type="number" min="${key==='add'?'.25':'0'}" max="${max}" step="${step}" inputmode="decimal" autocomplete="off" value="${esc(eye[key])}" placeholder="${optional?'Optional':'Demo value'}"></span></label>`;
}
function rxTypeStep(){return `<h3 tabindex="-1">Choose a prescription type</h3><div class="rx-type-choices">${Object.entries(rxTypes).map(([id,label])=>`<button type="button" data-rx-type="${id}" aria-pressed="${rxDraft.type===id}"><strong>${label}</strong><small>${rxTypeHelp[id]}</small></button>`).join('')}</div>`;}
function rxFileStep(){return `<div class="rx-file"><b>Demo prescription photo · optional</b><p>Use a synthetic JPG, PNG or WebP, up to 5 MiB. Only its filename is shown. File content is never read, stored or uploaded.</p><label class="file-select">${rxDraft.fileName?'Replace demo photo':'Choose demo photo'}<input id="rx-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose or replace synthetic prescription photo"></label><p id="rx-filename">${rxDraft.fileName?esc(rxDraft.fileName):'No file selected'}</p>${rxDraft.fileName?'<button class="quiet" type="button" id="rx-remove-file">Remove demo photo</button>':''}</div>`;}
function rxDetailStep(){return `<h3 tabindex="-1">Your prescription details</h3>${rxDraft.type==='bifocal'?`<label>Lens shape<select id="rx-shape"><option value="">Choose shape</option>${['Moon Shape','Flat Top'].map(v=>`<option ${rxDraft.shape===v?'selected':''}>${v}</option>`).join('')}</select></label>`:''}<div class="rx-eyes">${['right','left'].map(side=>`<fieldset><legend>${side==='right'?'RIGHT EYE / OD':'LEFT EYE / OS'}</legend>${rxField(side,'sph','SPH',{sign:true})}${rxField(side,'cyl','CYL',{sign:true,max:6,optional:true})}${rxField(side,'axis','Axis (degrees)',{max:180,step:'1',optional:true})}${['bifocal','progressive'].includes(rxDraft.type)?rxField(side,'add','ADD',{max:4}):''}</fieldset>`).join('')}</div><label>IPD · optional, millimeters<input id="rx-ipd" data-rx-field="ipd" type="number" inputmode="decimal" min="40" max="80" step=".5" value="${esc(rxDraft.ipd)}" placeholder="Optional" autocomplete="off"></label>${rxFileStep()}<p class="rx-review-note">Authorized staff must verify prescriptions before production. Any revised lens price requires customer approval.</p>`;}
function rxContactURL(){
  const number=OptimanDemo.contact().whatsappNumber;
  if(!/^[1-9]\d{6,14}$/.test(number||''))return null;
  const category=rxDraft.category||rxTypes[rxDraft.type];
  return 'https://wa.me/'+number+'?text='+encodeURIComponent(`Hello, I would like help with ${current().name} (${current().sku}), ${category} lenses.`);
}
function rxFallback(){const url=rxContactURL();return `<div class="rx-consultation"><h4>Looking for a specific lens?</h4><p>For your specific lens requirements, please contact us on WhatsApp. Our team will be happy to assist you.</p>${url?`<a class="button" id="consult" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Chat with Us on WhatsApp</a>`:'<button class="button" id="consult" type="button">Chat with Us on WhatsApp</button><p class="muted">WhatsApp contact details will be available here once configured.</p>'}</div>`;}
function rxVisibleOptions(){return rxOptions().filter(o=>rxEligibility(o).type==='FIXED_PRICE');}
function rxRevalidate(){const selected=selectedRxOption();if(selected?.type!=='FIXED_PRICE'||(rxDraft.category&&selected.category!==rxDraft.category))rxDraft.lensId=null;}
function rxLensStep(){
  rxRevalidate();
  if(rxValidation().length)return '<h3>Explore lenses</h3><p class="rx-guidance">Enter your prescription details to explore lens options.</p>';
  const options=rxVisibleOptions();
  const categories=['White Lens','Anti-Reflective Lens','Blue Cut Lens','Photochromic Lens','Photochromic + Blue Cut Lens'];
  if(rxDraft.category&&!categories.includes(rxDraft.category))rxDraft.category='';
  const visible=options.filter(o=>!rxDraft.category||o.category===rxDraft.category);
  return `<h3 tabindex="-1">Choose your lenses</h3><label>Lens category<select id="lens-category"><option value="">All lens options</option>${categories.map(c=>`<option ${rxDraft.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label>${visible.length?`<div class="rx-lens-options">${visible.map(o=>`<button type="button" data-rx-lens="${o.id}" aria-pressed="${o.id===rxDraft.lensId}"><strong>${esc(o.option)}</strong><span>${esc(o.features)}</span><span class="rx-lens-price">${money(o.price)} / pair</span>${o.id===rxDraft.lensId?'<small>Selected</small>':''}</button>`).join('')}</div>`:rxFallback()}`;

}
function lensPanel(){return `<section class="lens-panel rx-configurator" aria-label="Synthetic prescription configurator"><div class="lens-heading"><div><h2>Prescription & lenses</h2><p>Synthetic demonstration · use invented details only; nothing is submitted</p></div></div>${rxTypeStep()}${rxDraft.type==='zero'?'':rxDetailStep()}${rxErrorHTML()}<div id="rx-live-lenses">${rxLensStep()}</div></section>`;}
function rxRefresh(){
  const region=document.querySelector('#rx-live-lenses');if(region)region.innerHTML=rxLensStep();
  const errors=document.querySelector('#rx-errors');rxErrors=rxValidation();if(errors)errors.outerHTML=rxErrorHTML();
  updateRxPrice();
}
function productPrice(p){
  const selected=selectedRxOption(),valid=rxSelectionValid(),pair=lens?selected?.price:0,qty=rxDraft.qty;
  return `<div class="price-breakdown" aria-live="polite"><p class="eyebrow">Your synthetic demo selection</p><dl><div><dt>Frame price</dt><dd>${money(p.price)}</dd></div><div><dt>Lens price per pair</dt><dd>${!lens?'Not selected':valid?money(pair):selected?.type==='CONSULT_WHATSAPP'?'Consultation required':'Choose your lenses'}</dd></div><div><dt>Quantity</dt><dd>${Number.isInteger(qty)&&qty>=1&&qty<=99?qty:'—'}</dd></div><div class="selection-total"><dt>Illustrative total</dt><dd>${valid?money((p.price+pair)*qty):'Not quoted'}</dd></div></dl>${valid&&!(typeof rxPOSContext!=='undefined'&&rxPOSContext)?paymentLines(cartPaymentPlan([{price:p.price,lensPrice:pair,qty}])):''}<small>Demo item prices. Order delivery and required advance are shown at checkout; tax and discounts are not configured.</small></div>`;
}
function rxQuantity(){return `<label class="rx-quantity">Quantity · demo pairs<input id="rx-qty" type="number" min="1" max="99" step="1" value="${rxDraft.qty}" inputmode="numeric"></label>`;}
function rxCompactSummary(){const selected=selectedRxOption();return `<span>Synthetic demo selection · ${rxDraft.qty} pair(s)</span><b>${rxSelectionValid()?money((current().price+(lens?selected.price:0))*rxDraft.qty):'Choose an eligible lens pair'}</b><small>No payment or stock reservation until simulated checkout.</small>`;}
function updateRxPrice(){
  const price=document.querySelector('.price-breakdown');if(price)price.outerHTML=productPrice(current());
  const compact=document.querySelector('#gallery-summary');if(compact)compact.innerHTML=rxCompactSummary();
  const button=document.querySelector('#add-cart');if(button){button.disabled=!rxCanAdd();button.innerHTML=rxEditing!==null?'Save configuration':rxCanAdd()?'Add to Cart':'Complete an eligible selection';}
}
function rxRender(focus){render();if(focus)document.querySelector(focus)?.focus();}
function rxPowerText(eye,key){return eye[key]===''?'not supplied':(key==='add'?'+':eye[key+'Sign'])+Number(eye[key]).toFixed(2);}
function rxSummary(config){
  if(!config)return 'Frame Only';
  let text=rxTypes[config.type]||'Unknown demo type';
  if(config.type==='bifocal')text+=' · '+config.shape;
  if(config.type!=='zero'){
    for(const [side,label] of [['right','OD'],['left','OS']]){const e=config[side];text+=` · ${label} SPH ${rxPowerText(e,'sph')}`;text+=` CYL ${rxPowerText(e,'cyl')} Axis ${e.axis===''?'not supplied':e.axis+'°'}`;if(['bifocal','progressive'].includes(config.type))text+=` ADD ${rxPowerText(e,'add')}`;}
    if(config.ipd!=='')text+=` · IPD ${config.ipd} mm`;
    if(config.fileName)text+=' · Demo photo filename selected (no file retained)';
  }
  return text;
}
function rxCartDetails(line,index){return `<div class="rx-cart-details"><p>${esc(rxSummary(line.rx))}</p><button class="text-button" data-rx-edit="${index}" type="button">Edit Prescription & Lenses</button></div>`;}
function rxCheckoutDetails(items){return `<section class="rx-checkout-selections"><h3 tabindex="-1">Configured demo selections</h3>${items.map(l=>`<article><b>${esc(l.name)} × ${l.qty}</b><p>${esc(l.option)}</p><p>${esc(rxSummary(l.rx))}</p><p>Frame ${money(l.price)} + lenses ${money(l.lensPrice)} per pair · ${money((l.price+l.lensPrice)*l.qty)}</p></article>`).join('')}</section>`;}
function configuredAdd(){
  const errors=lens?rxValidation():[];
  if(!Number.isInteger(rxDraft.qty)||rxDraft.qty<1||rxDraft.qty>99)errors.push('Quantity must be 1–99 whole demo pairs.');
  if(!rxCanAdd())errors.push('Select a valid FIXED_PRICE lens pair before adding or saving.');
  if(errors.length){rxErrors=errors;rxRender('#rx-errors');return;}
  const option=selectedRxOption();
  const line={...current(),color,option:lens?option.category+' / '+option.option:'Frame only',lensPrice:lens?option.price:0,qty:rxDraft.qty,rx:lens?cloneRx({...rxDraft,selectedRule:{id:option.id,category:option.category,option:option.option,type:option.type,price:option.price}}):null};
  if(typeof rxPOSContext!=='undefined'&&rxPOSContext){savePOSRx(line);return;}
  checkoutCommand=null;
  if(rxEditing!==null){cart[rxEditing]=line;location.hash='cart';return;}
  cart.push(line);document.querySelector('#bag-count').textContent=cart.reduce((n,l)=>n+l.qty,0);document.querySelector('#bag-feedback').textContent='Added to Cart. Synthetic configuration; no stock reserved.';document.querySelector('#view-bag').hidden=false;
}
// Event interception is limited to the new configurator and configured-cart commands.
const rxMain=document.querySelector('main');
rxMain.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const d=button.dataset;
  if(d.color&&lens){rxRevalidate();}
  if(d.mode){event.stopImmediatePropagation();lens=d.mode==='lens';rxErrors=[];rxRender(`[data-mode="${d.mode}"]`);return;}
  if(button.id==='add-cart'){event.stopImmediatePropagation();configuredAdd();return;}
  if(button.id==='consult'&&lens){event.stopImmediatePropagation();modal('<h2>WhatsApp contact</h2><p>Our WhatsApp contact is not configured in this demo yet. Please ask the store team for contact details.</p><p>No message or prescription information has been sent.</p>');return;}
  if(d.rxEdit!==undefined){event.stopImmediatePropagation();rxPendingEdit=+d.rxEdit;location.hash='product/'+cart[rxPendingEdit].id;return;}
  if(button.id==='rx-cancel'){event.stopImmediatePropagation();rxEditing=null;if(rxPOSContext){rxPOSContext=null;location.hash='staff/pos';}else location.hash='cart';return;}
  if(!button.closest('.rx-configurator'))return;
  event.stopImmediatePropagation();
  if(d.rxType){rxDraft={...freshRx(),type:d.rxType,qty:rxDraft.qty};rxErrors=[];rxRender(`[data-rx-type="${d.rxType}"]`);}
  if(d.rxLens!==undefined){if(!rxVisibleOptions().some(o=>o.id===+d.rxLens))return;rxDraft.lensId=+d.rxLens;rxErrors=[];rxRender(`[data-rx-lens="${d.rxLens}"]`);}
  if(button.id==='rx-remove-file'){rxErrors=[];rxDraft.fileName='';rxDraft.lensId=null;rxRender('#rx-file');}
});
rxMain.addEventListener('input',event=>{
  if(event.target.id==='rx-qty'){rxDraft.qty=Number(event.target.value);updateRxPrice();return;}
  const field=event.target.dataset.rxField;if(!field)return;
  const parts=field.split('.');if(parts.length===2)rxDraft[parts[0]][parts[1]]=event.target.value;else rxDraft[field]=event.target.value;
  rxDraft.lensId=null;rxRefresh();
});
rxMain.addEventListener('change',event=>{
  const target=event.target,id=target.id;
  if(id==='rx-qty'){
    event.stopImmediatePropagation();const qty=Number(target.value);if(!Number.isInteger(qty)||qty<1||qty>99){target.setCustomValidity('Use 1–99 whole demo pairs.');target.reportValidity();document.querySelector('#add-cart').disabled=true;return;}target.setCustomValidity('');rxDraft.qty=qty;updateRxPrice();return;
  }
  if(!target.closest('.rx-configurator'))return;
  event.stopImmediatePropagation();
  if(target.dataset.rxField){const parts=target.dataset.rxField.split('.');const previous=parts.length===2?rxDraft[parts[0]][parts[1]]:rxDraft[parts[0]];if(previous===target.value)return;if(parts.length===2)rxDraft[parts[0]][parts[1]]=target.value;else rxDraft[parts[0]]=target.value;rxDraft.lensId=null;rxRefresh();}
  if(id==='rx-shape'){rxDraft.shape=target.value;rxDraft.lensId=null;rxRefresh();}
  if(id==='rx-file'){
    const file=target.files?.[0];if(!file)return;
    const valid=['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=5*1024*1024;
    if(valid)rxDraft.fileName=file.name.slice(0,200);
    target.value='';rxDraft.lensId=null;rxErrors=valid?[]:['Use a synthetic JPG, PNG or WebP up to 5 MiB. No file was read.'];rxRender(valid?'#rx-file':'#rx-errors');
  }
  if(id==='lens-category'){rxErrors=[];rxDraft.category=target.value;const option=rxVisibleOptions().find(o=>o.category===target.value);rxDraft.lensId=option?.id??null;rxRender('#lens-category');}

});
