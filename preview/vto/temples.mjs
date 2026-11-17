// Rear 2D temple layer only. Front-frame transforms and tracker/calibration are untouched.
export const templeSpecs={
 atlas:{file:'atlas-temple.webp',crop:[61,277,2051,259],hingeY:.24,barRatio:.46,frontHinge:[.031,.30],thickness:.060},
 noir:{file:'noir-temple.webp',crop:[83,274,1998,286],hingeY:.24,barRatio:.48,frontHinge:[.030,.30],thickness:.061},
 muse:{file:'muse-temple.webp',crop:[62,297,2049,235],hingeY:.18,barRatio:.34,frontHinge:[.030,.32],thickness:.038},
 forma:{file:'forma-temple.webp',crop:[80,292,2023,249],hingeY:.17,barRatio:.36,frontHinge:[.031,.34],thickness:.042}
};
const oval=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export async function loadTemples(){return Object.fromEntries(await Promise.all(Object.entries(templeSpecs).map(async([id,spec])=>{const image=new Image();image.src=new URL('./assets/'+spec.file,import.meta.url).href;await image.decode();return[id,image];})));}
export class TempleState {
 constructor(){this.reset();}
 reset(){this.data=null;this.time=0;}
 update(result,raw,front,time,photo=false){
  const landmarks=result?.faceLandmarks?.[0];if(!front||!raw||!landmarks||landmarks.length<455){this.reset();return;}
  const cos=Math.cos(raw.angle),sin=Math.sin(raw.angle),w=result.width,h=result.height;
  const local=i=>{const p=landmarks[i],x=p.x*w-raw.x,y=p.y*h-raw.y;return{x:(x*cos+y*sin)/raw.distance,y:(-x*sin+y*cos)/raw.distance};};
  // The hinge rests in front of the outer temple. Protect the inner face/eyes/cheeks,
  // leaving only a narrow upper-temple band; the lower earpiece disappears behind it.
  const points=oval.map(local).map(p=>{if(p.y>-.5&&p.y<.16){const limit=.90+.25*Math.min(1,Math.abs((p.y+.15)/.31));return{x:Math.sign(p.x)*Math.min(Math.abs(p.x),limit),y:p.y};}return p;}),targets=[[162,127],[389,356]].map(([a,b])=>{const p=local(a),q=local(b);return{x:p.x*.8+q.x*.2,y:p.y*.8+q.y*.2};});
  const depth=landmarks[356].z-landmarks[127].z,m=result.facialTransformationMatrixes?.[0]?.data;
  const turn=Math.sign(Number.isFinite(depth)&&Math.abs(depth)>.00001?depth:m?.[8]||0)*raw.yaw;
  if(!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))||Math.abs(turn)>.42||raw.pitch>.32){this.reset();return;}
  const next={points,targets,turn,pitch:raw.pitch};
  if(!this.data||photo)this.data=next;else{const alpha=1-Math.exp(-clamp((time-this.time)/1000,.001,.2)/.065);for(const key of ['points','targets'])for(let i=0;i<next[key].length;i++)for(const axis of ['x','y'])this.data[key][i][axis]+=alpha*(next[key][i][axis]-this.data[key][i][axis]);this.data.turn+=alpha*(turn-this.data.turn);this.data.pitch=raw.pitch;}
  this.time=time;
 }
}
export function insideFace(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function edgeDistance(p,polygon){return Math.min(...polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}));}
export function templePlans(data,id,frontSpec,frontAspect=.5,fine={scale:1,vertical:0}){
 if(!data||!templeSpecs[id])return[];const spec=templeSpecs[id],scale=fine.scale??1,vertical=fine.vertical??0,width=scale/frontSpec.eyeSeparation,height=width*frontAspect;
 return data.targets.flatMap((target,i)=>{
  const side=i===0?-1:1,near=data.turn*side<0,turn=Math.abs(data.turn);
  if(turn>.12&&!near)return[];
  const hinge={x:(i===0?spec.frontHinge[0]-.5:.5-spec.frontHinge[0])*width,y:(spec.frontHinge[1]-frontSpec.anchorY)*height+vertical};
  const end={x:target.x+side*(.045+(near?turn*.30:0)),y:target.y+.015};
  const dx=end.x-hinge.x,dy=end.y-hinge.y,length=Math.hypot(dx,dy);
  // Projected ear direction must stay lateral and short. Never show floating fragments.
  if(dx*side<.015||length<.055||length>(turn<.07?.34:.52)||dy<-.16||dy>.40||Math.abs(Math.atan2(dy,Math.abs(dx)))>1.25||insideFace(hinge,data.points))return[];
  if([.125,.25,.5,.75,1].some(t=>insideFace({x:hinge.x+dx*t,y:hinge.y+dy*t},data.points)))return[];
  const alpha=clamp((near?.48+turn*1.4:.40-turn*2.8),0,.92)*clamp((.42-turn)/.1,0,1)*clamp(edgeDistance(hinge,data.points)/.025,0,1);
  if(alpha<=.03)return[];
  return[{side,hinge,end,length,angle:Math.atan2(dy,dx),alpha,thickness:spec.thickness*scale}];
 });
}
export function drawTemples(ctx,images,state,pose,frontSpec,frontImage,id,fine={scale:1,vertical:0}){
 const image=images?.[id],data=state?.data;if(!image||!data||!pose||pose.opacity<=0)return;
 const spec=templeSpecs[id],plans=templePlans(data,id,frontSpec,frontImage.naturalHeight/frontImage.naturalWidth,fine);if(!plans.length)return;
 const cos=Math.cos(pose.angle),sin=Math.sin(pose.angle),world=p=>({x:pose.x+pose.distance*(p.x*cos-p.y*sin),y:pose.y+pose.distance*(p.x*sin+p.y*cos)});
 ctx.save();const mask=new Path2D();mask.rect(0,0,ctx.canvas.width,ctx.canvas.height);data.points.forEach((p,i)=>{const q=world(p);i?mask.lineTo(q.x,q.y):mask.moveTo(q.x,q.y);});mask.closePath();ctx.clip(mask,'evenodd');
 for(const plan of plans){const hinge=world(plan.hinge),end=world(plan.end),length=Math.hypot(end.x-hinge.x,end.y-hinge.y),height=plan.thickness*pose.distance/spec.barRatio,overlap=Math.min(2,pose.distance*.015);
  ctx.save();ctx.globalAlpha=pose.opacity*plan.alpha;ctx.translate(hinge.x,hinge.y);ctx.rotate(Math.atan2(end.y-hinge.y,end.x-hinge.x));
  // Mirroring the image vertically on the left keeps both earpiece curves downward.
  if(plan.side<0)ctx.scale(1,-1);
  ctx.drawImage(image,...spec.crop,-overlap,-spec.hingeY*height,length+overlap,height);ctx.restore();
 }
 ctx.restore();
}
