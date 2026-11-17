// Temple-only geometry. The approved front renderer, tracking and calibration are unchanged.
export const templeSpecs={
 atlas:{file:'atlas-temple.webp',crop:[61,277,1500,132],hingeY:62/132,frontHinge:[.031,.30],length:.78,thickness:.018},
 noir:{file:'noir-temple.webp',crop:[83,274,1450,145],hingeY:69/145,frontHinge:[.030,.30],length:.80,thickness:.017},
 muse:{file:'muse-temple.webp',crop:[62,297,1490,85],hingeY:43/85,frontHinge:[.030,.32],length:.76,thickness:.011},
 forma:{file:'forma-temple.webp',crop:[80,292,1460,90],hingeY:42/90,frontHinge:[.031,.34],length:.77,thickness:.012}
};
const oval=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export async function loadTemples(){return Object.fromEntries(await Promise.all(Object.entries(templeSpecs).map(async([id,spec])=>{const image=new Image();image.src=new URL('./assets/'+spec.file,import.meta.url).href;await image.decode();return[id,image];})));}
// Reconstruct the EXACT final front affine mapping, including manual fit and roll.
// All arm dimensions below are fractions of this rendered width, never screen pixels.
export function frontGeometry(pose,spec,aspect,fine={}){
 const scale=fine.scale??1,vertical=fine.vertical??0,width=pose.distance/spec.eyeSeparation*scale,height=width*aspect,cos=Math.cos(pose.angle),sin=Math.sin(pose.angle);
 const origin={x:pose.x-sin*vertical*pose.distance,y:pose.y+cos*vertical*pose.distance};
 return {width,height,point:p=>({x:origin.x+width*(p.x*cos-p.y*sin),y:origin.y+width*(p.x*sin+p.y*cos)}),hinge:uv=>({x:origin.x+(uv[0]-.5)*width*cos-(uv[1]-spec.anchorY)*height*sin,y:origin.y+(uv[0]-.5)*width*sin+(uv[1]-spec.anchorY)*height*cos})};
}
export class TempleState {
 constructor(){this.reset();}
 reset(){this.data=null;this.time=0;this.fits=new Map();this.photo=false;}
 update(result,raw,front,time,photo=false){
  const landmarks=result?.faceLandmarks?.[0];if(!front||!raw||!landmarks||landmarks.length<455){this.reset();return;}
  const cos=Math.cos(raw.angle),sin=Math.sin(raw.angle),w=result.width,h=result.height;
  const local=i=>{const p=landmarks[i],x=p.x*w-raw.x,y=p.y*h-raw.y;return{x:(x*cos+y*sin)/raw.distance,y:(-x*sin+y*cos)/raw.distance};};
  // Protect inner face/eyes/cheeks, retaining a narrow outer-temple hinge corridor.
  const points=oval.map(local).map(p=>{if(p.y>-.5&&p.y<.16){const limit=.90+.25*Math.min(1,Math.abs((p.y+.15)/.31));return{x:Math.sign(p.x)*Math.min(Math.abs(p.x),limit),y:p.y};}return p;});
  // These are side-face bounds, NOT measured ears or exact 3D endpoints.
  const targets=[[162,127],[389,356]].map(([a,b])=>{const p=local(a),q=local(b);return{x:p.x*.8+q.x*.2,y:p.y*.8+q.y*.2};});
  const depth=landmarks[356].z-landmarks[127].z,m=result.facialTransformationMatrixes?.[0]?.data;
  const turn=Math.sign(Number.isFinite(depth)&&Math.abs(depth)>.00001?depth:m?.[8]||0)*raw.yaw;
  if(!points.concat(targets).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))||!Number.isFinite(turn)){this.reset();return;}
  const next={points,targets,turn,pitch:raw.pitch};
  if(!this.data||photo)this.data=next;else{const alpha=1-Math.exp(-clamp((time-this.time)/1000,.001,.2)/.065);for(const key of ['points','targets'])for(let i=0;i<next[key].length;i++)for(const axis of ['x','y'])this.data[key][i][axis]+=alpha*(next[key][i][axis]-this.data[key][i][axis]);this.data.turn+=alpha*(turn-this.data.turn);this.data.pitch+=alpha*(raw.pitch-this.data.pitch);}
  this.time=time;this.photo=photo;
 }
 fittedPlans(id,frontSpec,aspect,fine){
  const desired=desiredPlans(this.data,id,frontSpec,aspect,fine),out=[];
  for(const plan of desired){const key=id+':'+plan.side;let old=this.fits.get(key);
   if(!old||this.photo)old={length:plan.length,drop:plan.drop,alpha:this.photo?plan.alpha:0,time:this.time};
   const dt=clamp((this.time-old.time)/1000,0,.15),alpha=1-Math.exp(-dt/.075);
   for(const field of ['length','drop','alpha'])old[field]+=alpha*(plan[field]-old[field]);old.time=this.time;
   // Never allow interpolation to exceed the current safe reach after calibration.
   old.length=Math.min(old.length,plan.maxLength);old.drop=clamp(old.drop,-old.length*Math.tan(.16),old.length*Math.tan(.20));
   if(!plan.safe)old.alpha=0;
   this.fits.set(key,old);const fitted={...plan,length:old.length,drop:old.drop,alpha:old.alpha};
   fitted.end={x:plan.hinge.x+plan.side*fitted.length,y:plan.hinge.y+fitted.drop};
   if(fitted.alpha>.005&&fitted.length>.001&&pathClear(fitted,this.data.points,plan.widthInD,plan.vertical))out.push(fitted);
  }
  return out;
 }
}
export function insideFace(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function edgeDistance(p,polygon){return Math.min(...polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}));}
const toFace=(p,widthInD,vertical)=>({x:p.x*widthInD,y:p.y*widthInD+vertical});
function pathClear(plan,points,widthInD,vertical){return [0,.2,.4,.6,.8,1].every(t=>!insideFace(toFace({x:plan.hinge.x+plan.side*plan.length*t,y:plan.hinge.y+plan.drop*t},widthInD,vertical),points));}
function desiredPlans(data,id,frontSpec,aspect=.5,fine={}){
 if(!data||!templeSpecs[id])return[];const spec=templeSpecs[id],scale=fine.scale??1,vertical=fine.vertical??0,widthInD=scale/frontSpec.eyeSeparation,yaw=Math.abs(data.turn);
 const reliability=(1-smooth(.30,.42,yaw))*(1-smooth(.20,.32,data.pitch));
 return data.targets.map((target,i)=>{
  const side=i===0?-1:1,hinge={x:side*(.5-spec.frontHinge[0]),y:(spec.frontHinge[1]-frontSpec.anchorY)*aspect};
  // Convert actual face-side bounds into the calibrated front's coordinate system.
  const bound={x:target.x/widthInD,y:(target.y-vertical)/widthInD};
  const reach=side*(bound.x-hinge.x),maxLength=clamp(reach+.012,0,.18);
  // Foreshortened proximal arm: mostly concealed frontally; never stretch to an ear guess.
  const length=Math.min(maxLength,spec.length*Math.sin(Math.min(yaw,.42)));
  const drop=clamp(bound.y-hinge.y,-length*Math.tan(.16),Math.min(length*Math.tan(.20),.025));
  const near=clamp(.5-side*data.turn/.12,0,1),reveal=smooth(.025,.14,yaw),far=1-smooth(.055,.14,yaw);
  const hingeFace=toFace(hinge,widthInD,vertical),clearance=clamp(edgeDistance(hingeFace,data.points)/.025,0,1);
  let alpha=(.08+.82*reveal*near)*(far+(1-far)*near)*reliability*clearance*smooth(.003,.022,length);
  const plan={side,hinge,end:{x:hinge.x+side*length,y:hinge.y+drop},length,drop,maxLength,alpha,thickness:spec.thickness,widthInD,vertical};
  plan.safe=reach>-.012&&length>0&&!insideFace(hingeFace,data.points)&&pathClear(plan,data.points,widthInD,vertical);
  if(!plan.safe)plan.alpha=0;return plan;
 });
}
export function templePlans(data,id,frontSpec,aspect=.5,fine={}){return desiredPlans(data,id,frontSpec,aspect,fine).filter(p=>p.safe&&p.alpha>.005);}
const textures=new WeakMap();
function proximalTexture(image,spec){let texture=textures.get(image);if(texture)return texture;
 texture=document.createElement('canvas');texture.width=spec.crop[2];texture.height=spec.crop[3];const c=texture.getContext('2d');c.drawImage(image,...spec.crop,0,0,texture.width,texture.height);
 // The unknown distal ear hook is concealed rather than squashed into a visible kink.
 c.globalCompositeOperation='destination-in';const fade=c.createLinearGradient(0,0,texture.width,0);fade.addColorStop(0,'#000');fade.addColorStop(.65,'#000');fade.addColorStop(1,'transparent');c.fillStyle=fade;c.fillRect(0,0,texture.width,texture.height);textures.set(image,texture);return texture;
}
export function drawTemples(ctx,images,state,pose,frontSpec,frontImage,id,fine={}){
 const image=images?.[id],data=state?.data;if(!image||!data||!pose||pose.opacity<=0||!frontImage)return;
 const spec=templeSpecs[id],aspect=frontImage.naturalHeight/frontImage.naturalWidth,geometry=frontGeometry(pose,frontSpec,aspect,fine),plans=state.fittedPlans(id,frontSpec,aspect,fine);if(!plans.length)return;
 const cos=Math.cos(pose.angle),sin=Math.sin(pose.angle),facePoint=p=>({x:pose.x+pose.distance*(p.x*cos-p.y*sin),y:pose.y+pose.distance*(p.x*sin+p.y*cos)});
 ctx.save();const mask=new Path2D();mask.rect(0,0,ctx.canvas.width,ctx.canvas.height);data.points.forEach((p,i)=>{const q=facePoint(p);i?mask.lineTo(q.x,q.y):mask.moveTo(q.x,q.y);});mask.closePath();ctx.clip(mask,'evenodd');
 const texture=proximalTexture(image,spec);
 for(const plan of plans){const hinge=geometry.point(plan.hinge),end=geometry.point(plan.end),length=Math.hypot(end.x-hinge.x,end.y-hinge.y),height=geometry.width*plan.thickness,overlap=geometry.width*.0035;
  ctx.save();ctx.globalAlpha=pose.opacity*plan.alpha;ctx.translate(hinge.x,hinge.y);ctx.rotate(Math.atan2(end.y-hinge.y,end.x-hinge.x));if(plan.side<0)ctx.scale(1,-1);
  ctx.drawImage(texture,-overlap,-spec.hingeY*height,length+overlap,height);ctx.restore();
 }
 ctx.restore();
}
