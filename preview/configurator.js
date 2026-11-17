'use strict';
// Synthetic demonstration only. No storage, file reads, uploads or external calls.
const rxTypes = {zero:'Zero Power',unifocal:'Unifocal / Distance Power',bifocal:'Bifocal / Near Power'};
const emptyEye = () => ({sphSign:'+',sph:'',cylSign:'-',cyl:'',axis:'',add:''});
const freshRx = () => ({type:'zero',shape:'',right:emptyEye(),left:emptyEye(),ipd:'',fileName:'',step:1,lensId:null,qty:1});
let rxDraft=freshRx(), rxEditing=null, rxPendingEdit=null, rxErrors=[];
const cloneRx = value => JSON.parse(JSON.stringify(value));
function enterProductRoute(){
  rxErrors=[];rxEditing=null;rxDraft=freshRx();
  if(rxPendingEdit!==null){
    const line=cart[rxPendingEdit];
    if(line&&current().id===line.id){rxEditing=rxPendingEdit;rxDraft=line.rx?cloneRx(line.rx):freshRx();rxDraft.qty=line.qty;rxDraft.step=line.rx?3:1;lens=!!line.rx;color=line.color;}
    rxPendingEdit=null;
  }
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
    if(rxDraft.type==='unifocal'){
      if(!['+','-'].includes(eye.cylSign))errors.push(`${label}: choose a valid CYL sign.`);
      if(cyl!==null&&(!quarter(cyl)||cyl<0||cyl>6))errors.push(`${label}: CYL must be 0–6 in 0.25 steps (demo range).`);
      if(eye.axis!==''){
        const axis=Number(eye.axis);
        if(!Number.isInteger(axis)||axis<0||axis>180)errors.push(`${label}: Axis must be an integer from 0 to 180.`);
        if(cyl===null||cyl===0)errors.push(`${label}: Axis requires a nonzero CYL magnitude.`);
      }
    }else if(add===null||!quarter(add)||add<=0||add>4)errors.push(`${label}: ADD must be positive, +0.25 to +4 in 0.25 steps (demo range).`);
  }
  if(rxDraft.ipd!==''){
    const ipd=Number(rxDraft.ipd);
    if(!Number.isFinite(ipd)||ipd<40||ipd>80||Math.abs(ipd*2-Math.round(ipd*2))>0.000001)errors.push('Optional IPD must be 40–80 mm in 0.5 steps (synthetic demo range).');
  }
  return errors;
}
function rxOptions(){
  return rules.map((r,id)=>({...r,id,features:id===0?'Clear / anti-reflective demo pair':id===1?'Blue-cut coating demo pair':id===2?'Light-adaptive demo pair':'Staff consultation or explicit availability rule'})).concat({id:6,category:'Bifocal demo',option:'Moon standard pair',type:'FIXED_PRICE',price:1800,features:'Synthetic bifocal pair · Moon Shape example'});
}
function rxEligibility(option){
  if(option.type==='UNAVAILABLE')return {type:'UNAVAILABLE',reason:'This explicit demo combination is unavailable.'};
  if(rxValidation().length)return {type:'UNAVAILABLE',reason:'Complete valid demo details first.'};
  if(option.id===3&&rxDraft.type==='zero')return {type:'UNAVAILABLE',reason:'Powered fitting consultation is not a zero-power option.'};
  if(option.type==='CONSULT_WHATSAPP')return {type:option.type,reason:'Contact our WhatsApp for details. No automatic quotation.'};
  if(rxUploadOnly())return {type:'UNAVAILABLE',reason:'A filename cannot establish powers. Choose consultation.'};
  if(option.id===6){
    if(rxDraft.type!=='bifocal'||rxDraft.shape!=='Moon Shape')return {type:'UNAVAILABLE',reason:'Demo fixed pair requires Bifocal + Moon Shape.'};
    if(['right','left'].some(s=>Number(rxDraft[s].sph)>3||Number(rxDraft[s].add)>2.5))return {type:'UNAVAILABLE',reason:'Outside this synthetic pair rule (SPH ≤3; ADD ≤2.5).'};
  }else{
    if(rxDraft.type==='bifocal')return {type:'UNAVAILABLE',reason:'This fixed example is for Zero Power or Unifocal only.'};
    const maxSph=option.id===2?2:4,maxCyl=option.id===2?1:2;
    if(rxDraft.type!=='zero'&&['right','left'].some(s=>Number(rxDraft[s].sph)>maxSph||Number(rxDraft[s].cyl)>maxCyl))return {type:'UNAVAILABLE',reason:`Outside this synthetic pair rule (SPH ≤${maxSph}; CYL ≤${maxCyl}).`};
  }
  return {type:'FIXED_PRICE',reason:'Eligible under synthetic demo rules only; staff verification required.'};
}
function selectedRxOption(){
  const option=rxOptions().find(o=>o.id===rxDraft.lensId);
  return option?{...option,...rxEligibility(option)}:null;
}
function rxCanAdd(){return Number.isInteger(rxDraft.qty)&&rxDraft.qty>=1&&rxDraft.qty<=99&&(!lens||(rxDraft.step===3&&!rxValidation().length&&selectedRxOption()?.type==='FIXED_PRICE'));}
function rxErrorHTML(){return `<div id="rx-errors" role="alert" tabindex="-1" ${rxErrors.length?'':'hidden'}>${rxErrors.length?'<b>Check the demo details</b><ul>'+rxErrors.map(e=>`<li>${esc(e)}</li>`).join('')+'</ul>':''}</div>`;}
function rxField(side,key,label,{sign=false,max=12,step='.25',optional=false}={}){
  const eye=rxDraft[side],id=`rx-${side}-${key}`;
  return `<label for="${id}">${label}${optional?' · optional':''}<span class="power-input">${sign?`<select id="${id}-sign" data-rx-field="${side}.${key}Sign" aria-label="${side} ${label} sign"><option value="+" ${eye[key+'Sign']==='+'?'selected':''}>+</option><option value="-" ${eye[key+'Sign']==='-'?'selected':''}>−</option></select>`:key==='add'?'<span class="positive-sign" aria-hidden="true">+</span>':''}<input id="${id}" aria-label="${side} ${label} magnitude" data-rx-field="${side}.${key}" type="number" min="${key==='add'?'.25':'0'}" max="${max}" step="${step}" inputmode="decimal" autocomplete="off" value="${esc(eye[key])}" placeholder="${optional?'Optional':'Demo value'}"></span></label>`;
}
function rxTypeStep(){return `<h3 tabindex="-1">Choose a prescription type</h3><p class="muted">Synthetic demonstration only. Do not enter your own prescription.</p><div class="rx-type-choices">${Object.entries(rxTypes).map(([id,label])=>`<button type="button" data-rx-type="${id}" aria-pressed="${rxDraft.type===id}"><strong>${label}</strong><small>${id==='zero'?'No power entry':id==='unifocal'?'Separate SPH / CYL / Axis':'Shape, SPH and positive ADD'}</small></button>`).join('')}</div><button class="button" type="button" data-rx-next>Continue ${rxDraft.type==='zero'?'to lenses':'to demo details'}</button>`;}
function rxFileStep(){return `<div class="rx-file"><b>Demo prescription photo · optional</b><p>Use a synthetic JPG, PNG or WebP, up to 5 MiB. Only its filename is shown. File content is never read, stored or uploaded.</p><label class="file-select">${rxDraft.fileName?'Replace demo photo':'Choose demo photo'}<input id="rx-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose or replace synthetic prescription photo"></label><p id="rx-filename">${rxDraft.fileName?esc(rxDraft.fileName):'No file selected'}</p>${rxDraft.fileName?'<button class="quiet" type="button" id="rx-remove-file">Remove demo photo</button>':''}</div>`;}
function rxDetailStep(){return `<h3 tabindex="-1">Enter synthetic demo details</h3><p class="muted">Demo bounds, not medical guidance: SPH magnitude 0–12, CYL 0–6, powers in 0.25 steps; ADD +0.25–+4.00. Blanks are permitted for CYL, Axis and IPD. Both SPH values ${rxDraft.type==='bifocal'?'and both ADD values ':''}are required unless all powers are blank with a demo photo selected.</p>${rxDraft.type==='bifocal'?`<label>Lens shape<select id="rx-shape"><option value="">Choose shape</option>${['Moon Shape','Flat Top'].map(v=>`<option ${rxDraft.shape===v?'selected':''}>${v}</option>`).join('')}</select></label>`:''}<div class="rx-eyes">${['right','left'].map(side=>`<fieldset><legend>${side==='right'?'RIGHT EYE / OD':'LEFT EYE / OS'}</legend>${rxField(side,'sph','SPH',{sign:true})}${rxDraft.type==='unifocal'?rxField(side,'cyl','CYL',{sign:true,max:6,optional:true})+rxField(side,'axis','Axis (degrees)',{max:180,step:'1',optional:true}):rxField(side,'add','ADD',{max:4})}</fieldset>`).join('')}</div><label>IPD · optional, millimeters<input id="rx-ipd" data-rx-field="ipd" type="number" inputmode="decimal" min="40" max="80" step=".5" value="${esc(rxDraft.ipd)}" placeholder="Demo range 40–80 mm" autocomplete="off"></label>${rxFileStep()}<p class="rx-review-note">Authorized staff must verify prescriptions before production. Any revised lens price requires customer approval.</p><div class="rx-actions"><button class="quiet" type="button" data-rx-back>Back</button><button class="button" type="button" data-rx-next>Validate & choose lenses</button></div>`;}
function rxLensStep(){
  const options=rxOptions(),selected=selectedRxOption();
  const category=selected?.category||'';
  return `<h3 tabindex="-1">Choose an explicit lens pair</h3><p class="muted">${esc(rxTypes[rxDraft.type])}${rxDraft.type==='bifocal'?' · '+esc(rxDraft.shape):''}. Prices and eligibility below are synthetic examples, not Optiman policy.</p><div class="rx-actions"><button class="quiet" data-rx-back type="button">${rxDraft.type==='zero'?'Change prescription type':'Edit power details'}</button></div><label>Lens category<select id="lens-category"><option value="">Choose a category</option>${[...new Set(options.map(o=>o.category))].map(c=>`<option ${category===c?'selected':''}>${c}</option>`).join('')}</select></label>${category?`<label>Lens option<select id="lens-option">${options.filter(o=>o.category===category).map(o=>`<option value="${o.id}" ${o.id===rxDraft.lensId?'selected':''}>${o.option}</option>`).join('')}</select></label>`:''}<div class="rx-lens-options">${options.map(o=>{const status=rxEligibility(o);return `<button type="button" data-rx-lens="${o.id}" aria-pressed="${o.id===rxDraft.lensId}" ${status.type==='UNAVAILABLE'?'aria-disabled="true"':''}><strong>${o.category} · ${o.option}</strong><span>${o.features}</span><span class="rx-lens-price">${status.type==='FIXED_PRICE'?money(o.price)+' / pair · demo':status.type.replaceAll('_',' ')}</span><small>${status.reason}</small></button>`;}).join('')}</div>${selected?`<div class="rule-note"><span class="badge">${selected.type.replaceAll('_',' ')}</span><p>${selected.reason}</p>${selected.type==='CONSULT_WHATSAPP'?'<button class="quiet" id="consult" type="button">Contact our WhatsApp for details</button>':''}</div>`:'<p class="muted">Choose an eligible pair to see a total. No automatic price fallback.</p>'}<p class="rx-review-note">Staff verification is required before production. This configurator cannot verify a prescription.</p>`;
}
function lensPanel(){return `<section class="lens-panel rx-configurator" aria-label="Synthetic prescription configurator"><div class="lens-heading"><span class="step-number">03</span><div><h2>Prescription & lenses</h2><p>Synthetic demo only · nothing is submitted</p></div></div><ol class="rx-steps">${['Type','Details','Lenses'].map((label,i)=>`<li ${rxDraft.step===i+1?'aria-current="step"':''}>${i+1} / ${label}</li>`).join('')}</ol>${rxErrorHTML()}${rxDraft.step===1?rxTypeStep():rxDraft.step===2?rxDetailStep():rxLensStep()}</section>`;}
function productPrice(p){
  const selected=selectedRxOption(),valid=rxCanAdd(),pair=lens?selected?.price:0,qty=rxDraft.qty;
  return `<div class="price-breakdown" aria-live="polite"><p class="eyebrow">Your synthetic demo selection</p><dl><div><dt>Frame price</dt><dd>${money(p.price)}</dd></div><div><dt>Lens price per pair</dt><dd>${!lens?'Not selected':valid?money(pair):selected?.type==='CONSULT_WHATSAPP'?'Consultation required':selected?.type==='UNAVAILABLE'?'Unavailable':'Choose eligible lenses'}</dd></div><div><dt>Quantity</dt><dd>${Number.isInteger(qty)&&qty>=1&&qty<=99?qty:'—'}</dd></div><div class="selection-total"><dt>Illustrative total</dt><dd>${valid?money((p.price+pair)*qty):'Not quoted'}</dd></div></dl><small>Demo prices only. Delivery, tax and discounts are not configured. No payment split is assumed.</small></div>`;
}
function rxQuantity(){return `<label class="rx-quantity">Quantity · demo pairs<input id="rx-qty" type="number" min="1" max="99" step="1" value="${rxDraft.qty}" inputmode="numeric"></label>`;}
function updateRxPrice(){
  const price=document.querySelector('.price-breakdown');if(price)price.outerHTML=productPrice(current());
  const button=document.querySelector('#add-cart');if(button){button.disabled=!rxCanAdd();button.innerHTML=rxEditing!==null?'Save configuration':rxCanAdd()?'Add to demo bag':'Complete an eligible selection';}
}
function rxRender(focus){render();if(focus)document.querySelector(focus)?.focus();}
function rxPowerText(eye,key){return eye[key]===''?'not supplied':(key==='add'?'+':eye[key+'Sign'])+Number(eye[key]).toFixed(2);}
function rxSummary(config){
  if(!config)return 'Frame Only';
  let text=rxTypes[config.type]||'Unknown demo type';
  if(config.type==='bifocal')text+=' · '+config.shape;
  if(config.type!=='zero'){
    for(const [side,label] of [['right','OD'],['left','OS']]){const e=config[side];text+=` · ${label} SPH ${rxPowerText(e,'sph')}`;text+=config.type==='bifocal'?` ADD ${rxPowerText(e,'add')}`:` CYL ${rxPowerText(e,'cyl')} Axis ${e.axis===''?'not supplied':e.axis+'°'}`;}
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
  if(rxEditing!==null){cart[rxEditing]=line;location.hash='cart';return;}
  cart.push(line);document.querySelector('#bag-count').textContent=cart.reduce((n,l)=>n+l.qty,0);document.querySelector('#bag-feedback').textContent='Added this synthetic configuration. No stock reserved.';document.querySelector('#view-bag').hidden=false;
}
// Event interception is limited to the new configurator and configured-cart commands.
const rxMain=document.querySelector('main');
rxMain.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const d=button.dataset;
  if(d.mode){event.stopImmediatePropagation();lens=d.mode==='lens';rxErrors=[];rxRender(`[data-mode="${d.mode}"]`);return;}
  if(button.id==='add-cart'){event.stopImmediatePropagation();configuredAdd();return;}
  if(button.id==='consult'&&lens){event.stopImmediatePropagation();const o=selectedRxOption();if(o?.type!=='CONSULT_WHATSAPP')return;modal(`<p class="eyebrow">WHATSAPP MESSAGE PREVIEW</p><h2>Contact our WhatsApp for details</h2><p>Hello, I would like details for OPT-${esc(current().id.toUpperCase())}, color ${esc(color)}, ${esc(rxTypes[rxDraft.type])}, ${esc(o.category)} / ${esc(o.option)}.</p><p>No prescription measurements or filename included. No WhatsApp number is configured. No message is sent and no automatic quotation is made.</p>`);return;}
  if(d.rxEdit!==undefined){event.stopImmediatePropagation();rxPendingEdit=+d.rxEdit;location.hash='product/'+cart[rxPendingEdit].id;return;}
  if(button.id==='rx-cancel'){event.stopImmediatePropagation();rxEditing=null;location.hash='cart';return;}
  if(!button.closest('.rx-configurator'))return;
  event.stopImmediatePropagation();
  if(d.rxType){rxDraft={...freshRx(),type:d.rxType,qty:rxDraft.qty};rxErrors=[];rxRender(`[data-rx-type="${d.rxType}"]`);}
  if(d.rxNext!==undefined){rxErrors=rxDraft.step===2?rxValidation():[];if(rxErrors.length){rxRender('#rx-errors');return;}rxDraft.step=rxDraft.type==='zero'?3:Math.min(3,rxDraft.step+1);rxRender('.rx-configurator h3');}
  if(d.rxBack!==undefined){rxDraft.step=rxDraft.type==='zero'?1:Math.max(1,rxDraft.step-1);rxDraft.lensId=null;rxErrors=[];rxRender('.rx-configurator h3');}
  if(d.rxLens!==undefined){if(button.getAttribute('aria-disabled')==='true')return;rxDraft.lensId=+d.rxLens;rxErrors=[];rxRender(`[data-rx-lens="${d.rxLens}"]`);}
  if(button.id==='rx-remove-file'){rxErrors=[];rxDraft.fileName='';rxDraft.lensId=null;rxRender('#rx-file');}
});
rxMain.addEventListener('input',event=>{
  if(event.target.id==='rx-qty'){rxDraft.qty=Number(event.target.value);updateRxPrice();return;}
  const field=event.target.dataset.rxField;if(!field)return;
  const parts=field.split('.');if(parts.length===2)rxDraft[parts[0]][parts[1]]=event.target.value;else rxDraft[field]=event.target.value;
  rxDraft.lensId=null;updateRxPrice();
});
rxMain.addEventListener('change',event=>{
  const target=event.target,id=target.id;
  if(id==='rx-qty'){
    event.stopImmediatePropagation();const qty=Number(target.value);if(!Number.isInteger(qty)||qty<1||qty>99){target.setCustomValidity('Use 1–99 whole demo pairs.');target.reportValidity();document.querySelector('#add-cart').disabled=true;return;}target.setCustomValidity('');rxDraft.qty=qty;updateRxPrice();return;
  }
  if(!target.closest('.rx-configurator'))return;
  event.stopImmediatePropagation();
  if(target.dataset.rxField){const parts=target.dataset.rxField.split('.');if(parts.length===2)rxDraft[parts[0]][parts[1]]=target.value;else rxDraft[parts[0]]=target.value;rxDraft.lensId=null;updateRxPrice();}
  if(id==='rx-shape'){rxDraft.shape=target.value;rxDraft.lensId=null;updateRxPrice();}
  if(id==='rx-file'){
    const file=target.files?.[0];if(!file)return;
    const valid=['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=5*1024*1024;
    if(valid)rxDraft.fileName=file.name.slice(0,200);
    target.value='';rxDraft.lensId=null;rxErrors=valid?[]:['Use a synthetic JPG, PNG or WebP up to 5 MiB. No file was read.'];rxRender(valid?'#rx-file':'#rx-errors');
  }
  if(id==='lens-category'){rxErrors=[];const option=rxOptions().find(o=>o.category===target.value);rxDraft.lensId=option?.id??null;rxRender('#lens-category');}
  if(id==='lens-option'){rxErrors=[];rxDraft.lensId=Number(target.value);rxRender('#lens-option');}
});
