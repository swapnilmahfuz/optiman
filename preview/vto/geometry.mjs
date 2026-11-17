const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function facePose(result,width,height){
 const l=result?.faceLandmarks?.[0];if(!l||l.length<264)return null;
 const point=i=>({x:l[i].x*width,y:l[i].y*height});
 const avg=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 let left=l[468]?point(468):avg(point(33),point(133)),right=l[473]?point(473):avg(point(362),point(263));
 if(left.x>right.x)[left,right]=[right,left];
 const dx=right.x-left.x,dy=right.y-left.y,distance=Math.hypot(dx,dy);
 if(!Number.isFinite(distance)||distance<12||distance>width*.65)return null;
 const mid=avg(left,right),bridge=point(168),angle=Math.atan2(dy,dx),tip=point(1);
 const m=result.facialTransformationMatrixes?.[0]?.data;
 let yaw=m?Math.abs(Math.atan2(m[8],m[10])):Math.abs(((tip.x-mid.x)*Math.cos(angle)+(tip.y-mid.y)*Math.sin(angle))/distance)*1.6;
 let pitch=m?Math.abs(Math.atan2(-m[9],Math.hypot(m[8],m[10]))):0;
 const opacity=Math.min(clamp((.49-yaw)/.16,0,1),clamp((.49-pitch)/.17,0,1));
 if(mid.x<0||mid.x>width||mid.y<0||mid.y>height||Math.abs(angle)>.65)return null;
 return {x:mid.x*.85+bridge.x*.15,y:mid.y*.85+bridge.y*.15,distance,angle,opacity,yaw,pitch};
}
export class Calibration {
 constructor(){this.reset();}
 reset(){this.pose=null;this.time=0;this.stable=0;this.ready=false;}
 update(raw,time,photo=false){
  if(!raw||raw.opacity<=0){this.reset();return null;}
  const old=this.pose;
  if(old&&(Math.hypot(raw.x-old.x,raw.y-old.y)>raw.distance*.9||Math.abs(Math.log(raw.distance/old.distance))>.45)){this.reset();}
  const dt=this.time?clamp((time-this.time)/1000,.001,.2):.1,alpha=1-Math.exp(-dt/.065);
  if(!this.pose||photo)this.pose={...raw};else{for(const key of ['x','y','distance','angle'])this.pose[key]+=alpha*(raw[key]-this.pose[key]);this.pose.opacity=raw.opacity;}
  this.time=time;this.stable=photo?5:this.stable+1;this.ready=this.stable>=5;
  return this.ready?{...this.pose}:null;
 }
}
