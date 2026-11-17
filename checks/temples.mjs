import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
import {templePlans,TempleState,insideFace} from '../preview/vto/temples.mjs';import {frameSpecs} from '../preview/vto/frames.mjs';
const polygon=[{x:-.9,y:-1},{x:.9,y:-1},{x:.9,y:1},{x:-.9,y:1}],base={points:polygon,targets:[{x:-1.16,y:-.09},{x:1.16,y:-.09}],turn:0,pitch:0};
for(const id of Object.keys(frameSpecs)){
 const plans=templePlans(base,id,frameSpecs[id]);assert.equal(plans.length,2,id+' frontal pair');
 for(const p of plans){const spec=frameSpecs[id],expected=p.side<0?-1:1;assert.equal(Math.sign(p.hinge.x),expected);assert.equal(insideFace(p.hinge,polygon),false);assert(p.length>0&&p.alpha>0);}
 for(const turn of [-.2,.2]){const plans=templePlans({...base,turn},id,frameSpecs[id]);assert.equal(plans.length,1);assert.equal(plans[0].side,turn<0?1:-1);}
 assert.equal(templePlans({...base,targets:[{x:0,y:0},{x:0,y:0}]},id,frameSpecs[id]).length,0);
 for(const vertical of [-.1,0,.1])for(const scale of [.85,1,1.15])for(const p of templePlans(base,id,frameSpecs[id],.5,{scale,vertical})){const w=scale/frameSpecs[id].eyeSeparation;assert.equal(p.hinge.x,p.side*({atlas:.469,noir:.470,muse:.470,forma:.469}[id])*w);assert(Number.isFinite(p.hinge.y));}
}
const state=new TempleState();assert.equal(state.data,null);state.reset();assert.equal(state.data,null);
// Baseline files are intentionally immutable for this targeted scope.
for(const file of ['preview/vto/frames.mjs','preview/vto/geometry.mjs','preview/vto/camera.mjs','preview/vto/tracker.mjs','preview/vto/vto.css','preview/configurator.js','preview/demo-engine.js','preview/staff.js',...['atlas','noir','muse','forma'].map(id=>'preview/vto/assets/'+id+'-front.webp')]){const old=cp.execFileSync('git',['show','f582ff2:'+file]);assert.deepEqual(fs.readFileSync(file),old,file+' preserved');}
const before=cp.execFileSync('git',['show','f582ff2:preview/vto/controller.mjs'],{encoding:'utf8'}),after=fs.readFileSync('preview/vto/controller.mjs','utf8');const ui=s=>s.slice(s.indexOf('this.host.innerHTML='),s.indexOf('  document.body.append(this.host)'));assert.equal(ui(after),ui(before),'VTO UI unchanged');
console.log('Temple hinge geometry, near/far visibility, safe hiding and immutable-front/UI scope checks passed.');
const landmarks=Array.from({length:478},()=>({x:.5,y:.5,z:0}));for(const [i,x,y,z]of [[162,.05,.45,0],[127,.04,.5,-.01],[389,.95,.45,0],[356,.96,.5,.01]])landmarks[i]={x,y,z};
const result={faceLandmarks:[landmarks],width:200,height:200},pose={x:100,y:100,distance:100,angle:0,yaw:.1,pitch:0,opacity:1};state.update(result,pose,pose,100,true);const initial=state.data.targets[0].x;landmarks[162].x+=.02;state.update(result,pose,pose,133,false);assert(state.data.targets[0].x>initial&&state.data.targets[0].x<initial+.032);state.update(result,pose,null,166);assert.equal(state.data,null);console.log('Separate arm smoothing and tracking-loss clearing passed.');
