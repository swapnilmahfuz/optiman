import {CameraSession,cameraError} from './camera.mjs';
import {FaceTracker} from './tracker.mjs';
import {facePose,Calibration} from './geometry.mjs';
import {frameSpecs,loadFrames,drawFrame} from './frames.mjs';
let active=null;
export function openTryOn(options){active?.close();active=new TryOn(options);return active;}
class TryOn {
 constructor(options){
  this.options=options;this.selected=frameSpecs[options.product]?options.product:'atlas';this.calibration=new Calibration();this.tracker=new FaceTracker();this.mode='off';this.closed=false;this.token=0;this.fine={scale:1,vertical:0};this.metrics={frames:0,inferenceMs:0,maxInferenceMs:0,started:0,tracking:false};this.opener=document.activeElement;
  if(!document.querySelector('link[data-vto-style]')){const link=document.createElement('link');link.rel='stylesheet';link.dataset.vtoStyle='';link.href=new URL('./vto.css',import.meta.url).href;document.head.append(link);}
  this.host=document.createElement('dialog');this.host.className='vto-dialog';this.host.setAttribute('aria-label','Virtual Try-On');
  this.host.innerHTML=`<div class="vto-shell"><header class="vto-header"><div><p class="eyebrow">OPTIMAN / VIRTUAL TRY-ON</p><h2>A new perspective on you.</h2></div><button class="quiet" data-vto-close aria-label="Close Camera">Close Camera ×</button></header><p class="vto-privacy">Your camera stays on your device. No video is uploaded.</p><div class="vto-workspace"><section><div class="vto-viewport"><canvas aria-label="Virtual Try-On preview"></canvas><video playsinline muted hidden></video><div class="vto-guide" hidden aria-hidden="true"></div><div class="vto-intro"><p>Find your frame, face to face.</p><small>Start your camera or choose a local photo.</small></div><span class="vto-mode">Camera off</span></div><p class="vto-status" role="status" aria-live="polite">Ready when you are.</p><div class="vto-source-controls"><button class="button" data-vto-start>Start Camera</button><button class="quiet" data-vto-photo>Photo Preview</button></div></section><section class="vto-choices"><h3>Four perspectives. Yours to choose.</h3><div class="vto-switcher">${Object.entries(frameSpecs).map(([id,spec])=>{const product=options.products.find(p=>p.id===id);return `<button data-vto-frame="${id}" aria-pressed="${id===this.selected}"><img src="${new URL('./assets/'+spec.file,import.meta.url)}" alt="${spec.name} approximate frontal frame"><strong>${spec.name}</strong><small>${options.money(product.price)} · demo</small></button>`;}).join('')}</div><details class="vto-tuning"><summary>Fine adjustments</summary><label>Frame scale<input data-vto-scale type="range" min=".85" max="1.15" step=".01" value="1"></label><label>Move up / down<input data-vto-vertical type="range" min="-.2" max=".2" step=".01" value="0"></label></details><button class="quiet" data-vto-reset>Recalibrate / Reset fit</button><p class="vto-limit">Approximate front-view preview, not a fitting measurement. Face the camera; the frame fades during larger head turns.</p><div class="vto-shopping"><button class="button" data-vto-cart>Add to Cart</button><button class="quiet" data-vto-configure>Configure lenses</button></div><small class="vto-shopping-note">Uses your current configuration for this model. A newly chosen model starts Frame Only; you can configure lenses on its product page.</small></section></div></div>`;
  document.body.append(this.host);this.canvas=this.host.querySelector('canvas');this.video=this.host.querySelector('video');this.camera=new CameraSession(this.video);this.ctx=this.canvas.getContext('2d');this.assetsPromise=loadFrames().then(images=>this.images=images).catch(()=>{this.status('Frame images could not load. Close and try again.');return null;});
  this.host.addEventListener('click',e=>this.click(e));this.host.addEventListener('input',()=>{this.fine.scale=Number(this.host.querySelector('[data-vto-scale]').value);this.fine.vertical=Number(this.host.querySelector('[data-vto-vertical]').value);this.paint();});
  this.host.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.host.addEventListener('close',()=>this.close());
  this.onNavigate=()=>this.close();this.onHide=()=>{if(document.hidden&&this.mode==='live'){this.stopMedia();this.status('Camera paused. Start Camera when you return.');}};window.addEventListener('hashchange',this.onNavigate);window.addEventListener('pagehide',this.onNavigate);document.addEventListener('visibilitychange',this.onHide);
  this.host.showModal();
 }
 status(text){if(!this.closed)this.host.querySelector('.vto-status').textContent=text;}
 busy(value){this.host.querySelectorAll('[data-vto-start],[data-vto-photo]').forEach(b=>b.disabled=value);}
 setMode(mode,label){this.mode=mode;this.host.querySelector('.vto-mode').textContent=label;this.host.querySelector('.vto-intro').hidden=mode!=='off';}
 async start(){
  this.stopMedia();const token=this.token;this.busy(true);this.setMode('loading','Camera setup');this.status('Preparing your preview…');
  try{await Promise.all([this.tracker.setMode('VIDEO'),this.assetsPromise]);if(this.closed||token!==this.token)return;if(!this.images)throw Error('Frame images could not load.');this.status('Allow camera access to begin.');if(!await this.camera.start()||this.closed||token!==this.token)return;
   this.source=this.video;this.size(this.video.videoWidth,this.video.videoHeight);this.setMode('live','Live Camera · mirrored');this.lastVideo=-1;this.lastInference=0;this.metrics={frames:0,inferenceMs:0,maxInferenceMs:0,started:performance.now(),tracking:false};this.status('Look towards the camera and hold still briefly.');this.host.querySelector('.vto-guide').hidden=false;this.loop();
  }catch(error){if(!this.closed){this.stopMedia();this.status(cameraError(error));}}finally{if(!this.closed)this.busy(false);}
 }
 size(width,height){const scale=Math.min(1,960/width);this.canvas.width=Math.round(width*scale);this.canvas.height=Math.round(height*scale);}
 loop(){if(this.closed||this.mode!=='live')return;this.raf=requestAnimationFrame(()=>this.loop());const now=performance.now();if(this.video.readyState<2||this.video.currentTime===this.lastVideo||now-this.lastInference<33)return;
  this.lastVideo=this.video.currentTime;this.lastInference=now;
  try{const start=performance.now(),result=this.tracker.detectVideo(this.video,now);const elapsed=performance.now()-start;this.metrics.frames++;this.metrics.inferenceMs+=elapsed;this.metrics.maxInferenceMs=Math.max(this.metrics.maxInferenceMs,elapsed);this.apply(result,now);this.paint();}catch{this.stopMedia();this.status('Camera tracking paused. Try Photo Preview or restart the camera.');}
 }
 apply(result,time,photo=false){const raw=facePose(result,this.canvas.width,this.canvas.height);this.pose=this.calibration.update(raw,time,photo);this.metrics.tracking=!!this.pose;this.host.querySelector('.vto-guide').hidden=!!this.pose||photo;
  this.status(this.pose?(photo?'Photo Preview · face detected.':'Tracking your look.'):(raw&&raw.opacity<=0?'Look towards the camera for a natural preview.':photo?'No clear frontal face found. Choose a well-lit front-facing portrait.':'Center your face and look towards the camera.'));
 }
 paint(){if(!this.source||this.closed)return;const {width:w,height:h}=this.canvas;this.ctx.clearRect(0,0,w,h);this.ctx.save();if(this.mode==='live'){this.ctx.translate(w,0);this.ctx.scale(-1,1);}this.ctx.drawImage(this.source,0,0,w,h);drawFrame(this.ctx,this.images?.[this.selected],this.pose,frameSpecs[this.selected],this.fine);this.ctx.restore();}
 stopMedia(){this.token++;cancelAnimationFrame(this.raf);this.camera.stop();this.photoImage?.removeAttribute('src');this.photoImage=null;this.source=null;this.pose=null;this.calibration.reset();this.metrics.tracking=false;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.host.querySelector('.vto-guide').hidden=true;if(!this.closed)this.setMode('off','Camera off');}
 async click(event){const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-vto-close')){this.close();return;}
  if(b.dataset.vtoFrame){this.selected=b.dataset.vtoFrame;this.host.querySelectorAll('[data-vto-frame]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.vtoFrame===this.selected)));this.paint();}
  if(b.hasAttribute('data-vto-start'))this.start();
  if(b.hasAttribute('data-vto-photo'))this.photoPicker?.();
  if(b.hasAttribute('data-vto-reset')){this.fine={scale:1,vertical:0};this.host.querySelector('[data-vto-scale]').value=1;this.host.querySelector('[data-vto-vertical]').value=0;this.calibration.reset();this.pose=null;if(this.mode==='photo')this.analyzePhoto?.();else{this.paint();this.status('Look towards the camera to recalibrate.');}}
  if(b.hasAttribute('data-vto-cart')||b.hasAttribute('data-vto-configure')){const id=this.selected,add=b.hasAttribute('data-vto-cart');this.close();this.options.onChoose(id,add);}
 }
 diagnostics(){return {...this.metrics,mode:this.mode,delegate:this.tracker.delegate,averageInferenceMs:this.metrics.frames?this.metrics.inferenceMs/this.metrics.frames:null,processedFPS:this.metrics.frames&&this.metrics.started?this.metrics.frames/((performance.now()-this.metrics.started)/1000):null,cameraActive:!!this.camera.stream};}
 close(){if(this.closed)return;this.stopMedia();this.closed=true;this.tracker.close();this.host.close();this.host.remove();window.removeEventListener('hashchange',this.onNavigate);window.removeEventListener('pagehide',this.onNavigate);document.removeEventListener('visibilitychange',this.onHide);this.opener?.isConnected&&this.opener.focus();if(active===this)active=null;}
}
