// Camera ownership is isolated from shopping and tracking state.
export class CameraSession {
 constructor(video){this.video=video;this.stream=null;this.generation=0;}
 async start(){
  this.stop();const generation=this.generation;
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Camera needs HTTPS or localhost and a supported browser. Try Photo Preview instead.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}});
  if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return false;}
  this.stream=stream;this.video.srcObject=stream;
  try{await this.video.play();}catch(e){this.stop();throw e;}
  return generation===this.generation;
 }
 stop(){this.generation++;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;}
}
export function cameraError(error){return ({NotAllowedError:'Camera permission was not granted. You can still use Photo Preview.',NotFoundError:'No camera was found. Choose Photo Preview instead.',NotReadableError:'Your camera is busy. Close other camera apps or use Photo Preview.',OverconstrainedError:'This camera could not start with these settings. Try Photo Preview.'})[error.name]||error.message||'Camera could not start. Try Photo Preview.';}
