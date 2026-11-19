export const frameSpecs={
 atlas:{name:'Atlas',file:'atlas-front.webp',eyeSeparation:.46,anchorY:.53},
 noir:{name:'Noir',file:'noir-front.webp',eyeSeparation:.45,anchorY:.52},
 muse:{name:'Muse',file:'muse-front.webp',eyeSeparation:.46,anchorY:.53},
 forma:{name:'Forma',file:'forma-front.webp',eyeSeparation:.46,anchorY:.53}
};
export async function loadFrames(specs=frameSpecs){return Object.fromEntries(await Promise.all(Object.entries(specs).map(async([id,spec])=>{const image=new Image();image.src=spec.url || new URL('./assets/'+spec.file,import.meta.url).href;await image.decode();return [id,image];})));}
export function drawFrame(ctx,image,pose,spec,{scale=1,vertical=0}={}){
 if(!pose||!image||pose.opacity<=0)return;
 const width=pose.distance/spec.eyeSeparation*scale,height=width*image.naturalHeight/image.naturalWidth,offset=vertical*pose.distance;
 ctx.save();ctx.globalAlpha=pose.opacity;ctx.translate(pose.x-Math.sin(pose.angle)*offset,pose.y+Math.cos(pose.angle)*offset);ctx.rotate(pose.angle);ctx.drawImage(image,-width/2,-height*spec.anchorY,width,height);ctx.restore();
}
