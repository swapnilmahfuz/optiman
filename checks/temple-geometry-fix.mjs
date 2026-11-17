import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
import {frontGeometry,templePlans,templeSpecs,TempleState} from '../preview/vto/temples.mjs';import {frameSpecs,drawFrame} from '../preview/vto/frames.mjs';
// A minimal affine canvas records the approved front's ACTUAL draw rectangle/transform.
class CanvasProbe {
 constructor(mirror=false){this.m=mirror?[-1,0,0,1,800,0]:[1,0,0,1,0,0];this.stack=[];}
 save(){this.stack.push([...this.m]);}restore(){this.m=this.stack.pop();}
 translate(x,y){const[a,b,c,d,e,f]=this.m;this.m=[a,b,c,d,e+a*x+c*y,f+b*x+d*y];}
 rotate(t){const[a,b,c,d,e,f]=this.m,s=Math.sin(t),co=Math.cos(t);this.m=[a*co+c*s,b*co+d*s,-a*s+c*co,-b*s+d*co,e,f];}
 drawImage(image,x,y,w,h){this.draw={m:[...this.m],x,y,w,h};}
}
let cases=0;
for(const id of Object.keys(frameSpecs))for(const distance of [45,90,180])for(const angle of [-.3,0,.3])for(const scale of [.85,1,1.15])for(const vertical of [-.2,0,.2])for(const mirror of [false,true]){
 const pose={x:310,y:240,distance,angle,opacity:1},fine={scale,vertical},spec=frameSpecs[id],aspect=.5,ctx=new CanvasProbe(mirror);drawFrame(ctx,{naturalWidth:1774,naturalHeight:887},pose,spec,fine);const g=frontGeometry(pose,spec,aspect,fine);
 for(const side of [-1,1]){const u=side<0?templeSpecs[id].frontHinge[0]:1-templeSpecs[id].frontHinge[0],v=templeSpecs[id].frontHinge[1],d=ctx.draw,[a,b,c,e,tx,ty]=d.m,x=d.x+u*d.w,y=d.y+v*d.h,expected={x:a*x+c*y+tx,y:b*x+e*y+ty},actual=g.hinge([u,v]);const drawn=g.point({x:u-.5,y:(v-spec.anchorY)*aspect});assert(Math.hypot(drawn.x-actual.x,drawn.y-actual.y)<1e-9,id+' rendered normalized hinge');if(mirror)actual.x=800-actual.x;assert(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-9,id+' final front hinge');}
 assert.equal(g.width,distance/spec.eyeSeparation*scale);cases++;
}
const points=[{x:-.9,y:-1},{x:.9,y:-1},{x:.9,y:1},{x:-.9,y:1}],base={points,targets:[{x:-1.16,y:-.09},{x:1.16,y:-.09}],turn:0,pitch:0};
for(const id of Object.keys(frameSpecs)){
 assert.equal(templePlans(base,id,frameSpecs[id]).length,0,'straight-facing arms concealed');
 for(const turn of [-.15,.15,-.30,.30]){const plans=templePlans({...base,turn},id,frameSpecs[id]);assert.equal(plans.length,1);const plan=plans[0];assert.equal(plan.side,turn<0?1:-1);assert(plan.length<=.18);assert(Math.abs(plan.drop/plan.length)<=Math.tan(.20)+1e-9);assert.equal(plan.thickness,templeSpecs[id].thickness);}
 assert.equal(templePlans({...base,turn:.5},id,frameSpecs[id]).length,0);assert.equal(templePlans({...base,turn:.2,pitch:.4},id,frameSpecs[id]).length,0);
 const state=new TempleState();state.data={...base,turn:.2};state.time=10;const first=state.fittedPlans(id,frameSpecs[id],.5,{});assert.equal(first.length,0);state.time=43;const next=state.fittedPlans(id,frameSpecs[id],.5,{});assert(next[0].alpha>0&&next[0].alpha<.9);const length=next[0].length;state.data={...base,turn:.1};state.time=76;const after=state.fittedPlans(id,frameSpecs[id],.5,{});assert(after[0].length>0&&Math.abs(after[0].length-length)<.1);state.reset();assert.equal(state.data,null);assert.equal(state.fits.size,0);
}
for(const file of ['preview/vto/frames.mjs','preview/vto/geometry.mjs','preview/vto/camera.mjs','preview/vto/tracker.mjs','preview/vto/vto.css','preview/configurator.js','preview/demo-engine.js','preview/staff.js',...['atlas','noir','muse','forma'].map(id=>'preview/vto/assets/'+id+'-front.webp')])assert.deepEqual(fs.readFileSync(file),cp.execFileSync('git',['show','017cc52:'+file]),file+' unchanged');
const current=fs.readFileSync('preview/vto/controller.mjs','utf8'),prior=cp.execFileSync('git',['show','017cc52:preview/vto/controller.mjs'],{encoding:'utf8'});assert.equal(current.replace('./temples.mjs?v=2','./temples.mjs'),prior,'controller unchanged except renderer cache URL');
fs.writeFileSync('evidence/temple-geometry-fix-results.json',JSON.stringify({frontTransformCases:cases,checks:['exact front-draw hinge coordinates','scale/distance/roll/calibration','single camera mirror','frontal concealment','near/far yaw perspective','bounded length and angle','frame-relative thickness','temporal fit/visibility smoothing','conservative hide/reset','immutable front/tracker/camera/UI/business scope'],failures:[]},null,2)+'\n');console.log(cases+' exact-front affine cases and temple geometry/scope checks passed.');
