export class FaceTracker {
 constructor(){this.task=null;this.pending=null;this.closed=false;this.mode=null;this.delegate=null;}
 async load(){
  if(this.closed)throw Error('Try-on closed.');if(this.task)return this.task;
  if(!this.pending)this.pending=(async()=>{
   const {FilesetResolver,FaceLandmarker}=await import('./vendor/vision_bundle.mjs');
   const files=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm/',import.meta.url).href);
   const options={baseOptions:{modelAssetPath:new URL('./vendor/face_landmarker.task',import.meta.url).href,delegate:'GPU'},runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.65,minTrackingConfidence:.6,outputFacialTransformationMatrixes:true};
   let task;try{task=await FaceLandmarker.createFromOptions(files,options);this.delegate='GPU';}catch{options.baseOptions.delegate='CPU';task=await FaceLandmarker.createFromOptions(files,options);this.delegate='CPU';}
   if(this.closed){task.close();throw Error('Try-on closed.');}this.task=task;this.mode='VIDEO';return task;
  })();
  try{return await this.pending;}catch(e){this.pending=null;throw e;}
 }
 async setMode(mode){const task=await this.load();if(this.mode!==mode){await task.setOptions({runningMode:mode});this.mode=mode;}return task;}
 detectVideo(video,time){return this.task.detectForVideo(video,time);}
 async detectPhoto(image){const task=await this.setMode('IMAGE');return task.detect(image);}
 close(){this.closed=true;this.task?.close();this.task=null;}
}
