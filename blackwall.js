import { BlackwallMotion } from './blackwall-motion.js?v=rogue-controls-33';
import { BlackwallEncounter, RepulsionTally } from './blackwall-encounter.js?v=rogue-controls-33';
import { vertex, fragment, contactDepth } from './blackwall-shaders.js?v=rogue-controls-33';
import { MoonboundEmbrace, moonImagePoint, moonCharacterAt } from './moonbound-interaction.js';
import { renderResolution } from './render-resolution.js';

export class Blackwall {
  constructor(canvas, { onWorldChange = () => {}, onSceneChange = () => {} } = {}) {
    this.canvas = canvas;
    this.onWorldChange = onWorldChange;
    this.onSceneChange = onSceneChange;
    this.elapsed = 0;
    this.roguesEnabled = true;
    this.phase = Math.random() * 200;
    const route = location.hash.slice(1) || document.body.dataset.route || 'about';
    this.pageSection = route.startsWith('papers') ? 'papers' : route.startsWith('blogs') ? 'blogs' : 'about';
    this.pageMoods = { about: [1,1,0], blogs: [.72,.76,.08], papers: [.64,.70,.18] };
    this.pageMood = [...this.pageMoods[this.pageSection]];
    this.pageFlow = this.phase; this.pageTurnAt = -100;
    this.motion = new BlackwallMotion();
    this.encounter = new BlackwallEncounter();
    this.tally = new RepulsionTally(); this.hitMaps = {};
    this.embrace = new MoonboundEmbrace();
    this.pointer = [.5,.5]; this.targetPointer = [.5,.5];
    this.pointerActive = 0; this.pointerEnergy = 0; this.pressing = false;
    this.impulses = []; this.last = 0; this.frame = 0; this.loadedCount = 0;
    this.world = 'blackwall';
    canvas.dataset.motion = 'running';
    this.paused = false;
    canvas.dataset.rogues = 'enabled';
    canvas.dataset.repulsions = '0';
    this.gl = canvas.getContext('webgl', { alpha:false, antialias:false, powerPreference:'low-power' });
    if (!this.gl) { this.fallback(); return; }
    const gl = this.gl;
    const viewportLimits = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const renderbufferLimit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    this.resolutionLimits = [Math.min(viewportLimits[0], renderbufferLimit), Math.min(viewportLimits[1], renderbufferLimit)];
    const compile = (kind,source) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    this.program = gl.createProgram();
    gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));
    gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
    gl.useProgram(this.program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program,'aPosition');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    this.uniforms = {};
    for (const key of [
      'uResolution','uPatternResolution','uPointer','uTime','uLoaded','uDepth','uReading',
      'uFace','uHandA','uHandB','uFacePose','uHandAPose','uHandBPose',
      'uRiftA','uRiftB','uRiftModes','uModels','uMoonMap','uModelIds','uArrival',
      'uPointerState','uImpulse0','uImpulse1','uImpulse2','uImpulse3','uBreach','uMoon',
      'uHandClaw','uHandReach','uCombo0','uCombo1','uCombo2','uCombo','uComboWeights','uComboRecoil','uComboArrival','uComboId','uMoonAspect',
      'uMoonAtlas','uMoonEmbrace',
      'uPageMood','uPageTurn','uPageFlow',
    ]) this.uniforms[key] = gl.getUniformLocation(this.program,key);
    this.loadTexture('./assets/membrane/blackwall-depth.png',0,'uDepth');
    this.loadTexture('./assets/membrane/blackwall-models.png',1,'uModels');
    this.loadTexture('./assets/moonbound-earth-scene.png',2,'uMoonMap');
    this.loadEmbraceTexture('./assets/moonbound-embrace.png');
    this.loadTexture('./assets/membrane/frontal-claw.png',3,'uHandClaw');
    this.loadTexture('./assets/membrane/frontal-reach.png',4,'uHandReach');
    this.loadTexture('./assets/membrane/combo-01.png',5,'uCombo0');
    this.loadTexture('./assets/membrane/combo-02.png',6,'uCombo1');
    this.loadTexture('./assets/membrane/combo-03.png',7,'uCombo2');

    this.resize = () => {
      this.resolution = renderResolution(innerWidth, innerHeight, devicePixelRatio, this.resolutionLimits);
      canvas.width = this.resolution.width; canvas.height = this.resolution.height;
      canvas.dataset.resolution = `${canvas.width}x${canvas.height}`;
      canvas.dataset.pixelRatio = this.resolution.scale.toFixed(2);
      gl.viewport(0,0,canvas.width,canvas.height); this.readingBounds(); this.draw();
    };
    window.addEventListener('resize',this.resize);
    window.addEventListener('pointermove',event => {
      const point = [event.clientX/innerWidth,1-event.clientY/innerHeight];
      const speed = Math.hypot(point[0]-this.targetPointer[0],point[1]-this.targetPointer[1]);
      this.pointerEnergy = Math.min(1,this.pointerEnergy+speed*12);
      this.targetPointer = point; this.pointerActive = 1;
      if (this.pressing && this.elapsed-(this.lastTrail||0)>.14) {
        this.pulse(point,.35); this.lastTrail = this.elapsed;
      }
    },{passive:true});
    document.documentElement.addEventListener('pointerleave',() => { this.pointerActive=0; this.pressing=false; });
    window.addEventListener('blur',() => { this.pressing=false; this.pointerActive=0; });
    const emptySpace = event => !event.target.closest?.('a,button,input,textarea,select,summary,.page,.reading-peek');
    document.addEventListener('pointerdown',event => {
      if (event.button>0 || event.target.closest?.('a,button,input,textarea,select,summary,[contenteditable]')) return;
      const point=[event.clientX/innerWidth,1-event.clientY/innerHeight];
      if (this.world==='moonbound' && this.moonCharacterAt(point)) {
        this.lastTouch=null;
        this.pressing=false;
        if (this.encounter.state==='moonbound' && this.moonAtlasReady) this.embrace.trigger(this.elapsed);
        return;
      }
      if (!emptySpace(event) || event.button>0) return;
      this.pressing=true; this.pointerActive=1;
      this.targetPointer=[event.clientX/innerWidth,1-event.clientY/innerHeight];
      this.pulse(this.targetPointer,1);
      this.pushAt(this.targetPointer);
      if(event.pointerType==='touch' && this.world==='moonbound') {
        if(this.lastTouch && this.elapsed-this.lastTouch.time<.4 && Math.hypot(this.targetPointer[0]-this.lastTouch.x,this.targetPointer[1]-this.lastTouch.y)<.08) this.returnToWall();
        this.lastTouch={time:this.elapsed,x:this.targetPointer[0],y:this.targetPointer[1]};
      }
    });
    window.addEventListener('pointerup',() => { this.pressing=false; });
    window.addEventListener('pointercancel',() => { this.pressing=false; });
    document.addEventListener('dblclick',event => {
      const point=[event.clientX/innerWidth,1-event.clientY/innerHeight];
      if (emptySpace(event) && this.world==='moonbound' && !this.moonCharacterAt(point)) { event.preventDefault(); this.returnToWall(); }
    });
    document.addEventListener('keydown',event => {
      if (event.target.closest?.('input,textarea,select,[contenteditable]')) return;
      if (event.shiftKey && event.code==='KeyB') { event.preventDefault(); this.trigger(); }
      if (event.code==='Escape') this.returnToWall();
    });
    document.addEventListener('visibilitychange',() => { this.last=0; this.frameSample=null; this.schedule(); });
    document.addEventListener('site:section-change', event => {
      const section=event.detail?.section;
      if(!this.pageMoods[section] || section===this.pageSection)return;
      this.pageSection=section;
      this.pageTurnAt=matchMedia('(prefers-reduced-motion: reduce)').matches?-100:this.elapsed;
      this.canvas.dataset.section=section;
    });
    window.addEventListener('scroll',() => this.readingBounds(),{passive:true});
    this.contentObserver = new MutationObserver(() => this.readingBounds());
    this.contentObserver.observe(document.querySelector('main'),{childList:true,subtree:true});
    this.contentResize = new ResizeObserver(() => this.readingBounds());
    this.contentResize.observe(document.querySelector('main'));
    canvas.addEventListener('webglcontextlost',event => {
      event.preventDefault(); this.contextLost=true;
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame=0; canvas.dataset.renderer='context-lost';
    });
    canvas.addEventListener('webglcontextrestored',() => this.fallback());
    canvas.dataset.renderer='webgl'; this.resize(); this.schedule();
  }

  loadTexture(path,unit,uniform) {
    const gl=this.gl,texture=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.uniform1i(this.uniforms[uniform],unit);
    const image=new Image();
    image.onload=() => {
      gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      if (uniform!=='uMoonMap') {
        const mask=document.createElement('canvas'); mask.width=image.width; mask.height=image.height;
        const context=mask.getContext('2d',{willReadFrequently:true}); context.drawImage(image,0,0);
        this.hitMaps[uniform]={data:context.getImageData(0,0,image.width,image.height).data,width:image.width,height:image.height};
      }
      if (uniform==='uMoonMap') {
        this.moonAspect=image.width/image.height;
        this.moonImage=image; this.moonTexture=texture;
        this.updateMoonAtlas();
      }
      this.loadedCount++;
      this.canvas.dataset.textures=String(this.loadedCount);
      this.loaded=this.loadedCount===8;
      this.draw();
    };
    image.onerror=() => { this.canvas.dataset.assetError=path; };
    image.src=new URL(path,import.meta.url).href;
  }

  loadEmbraceTexture(path) {
    const image=new Image();
    image.onload=()=>{ this.embraceImage=image; this.updateMoonAtlas(); };
    image.onerror=()=>{ this.canvas.dataset.embraceAssetError=path; };
    image.src=new URL(path,import.meta.url).href;
  }

  updateMoonAtlas() {
    if (!this.moonImage || !this.embraceImage || !this.moonTexture) return;
    const gl=this.gl;
    // Two poses share the existing sampler; the renderer still needs only eight texture units.
    const maxSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const scale=Math.min(1,maxSize/this.moonImage.width,maxSize/(this.moonImage.height*2));
    const width=Math.floor(this.moonImage.width*scale),height=Math.floor(this.moonImage.height*scale);
    const atlas=document.createElement('canvas'); atlas.width=width; atlas.height=height*2;
    const context=atlas.getContext('2d');
    context.drawImage(this.moonImage,0,0,width,height);
    context.drawImage(this.embraceImage,0,height,width,height);
    gl.activeTexture(gl.TEXTURE0+2); gl.bindTexture(gl.TEXTURE_2D,this.moonTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
    this.moonAtlasReady=true;
    this.canvas.dataset.embraceReady='true';
    this.draw();
  }

  moonCharacterAt(point) {
    const imagePoint=moonImagePoint(point,this.canvas.width/this.canvas.height,this.moonAspect||16/9,this.pointer,this.pointerActive);
    return moonCharacterAt(imagePoint,this.embrace.progress(this.elapsed));
  }

  pulse(position,strength) {
    this.impulses.unshift({position:[...position],start:this.elapsed,strength});
    this.impulses=this.impulses.slice(0,4);
  }
  trigger() {
    if (!this.roguesEnabled || !this.loaded || this.encounter.state!=='idle') return;
    if (this.encounter.trigger(this.elapsed)) {
      this.motion.clear(this.elapsed); this.motion.suspended=true;
    }
  }
  returnToWall() {
    if (this.encounter.returnToWall(this.elapsed)) {
      this.tally.reset(); this.canvas.dataset.repulsions='0';
    }
  }
  readingBounds() {
    const r=document.querySelector('main .page')?.getBoundingClientRect();
    this.reading=r?.width && r?.height?[r.left/innerWidth,1-r.bottom/innerHeight,r.right/innerWidth,1-r.top/innerHeight]:[0,0,0,0];
  }

  sampleSilhouette(model, isFace, q, arrival) {
    let source,extent,map;
    if(!isFace && (model===1 || model===3)) {
      source=[.5,.5]; extent=[1,1]; map=this.hitMaps[model===1?'uHandClaw':'uHandReach'];
    } else if(model<3.5) {
      source=[(model+.5)*.25,isFace?.75:.25]; extent=[.25,.5]; map=this.hitMaps.uModels;
    } else {
      source=isFace?[.62,.46]:model<4.5?[.21,.38]:[.865,.625];
      extent=isFace?[.30,.57]:model<4.5?[.38,.64]:[.27,.52]; map=this.hitMaps.uDepth;
    }
    if(!map) return false;
    const x=Math.max(0,Math.min(map.width-1,Math.floor((source[0]+q[0]*extent[0])*map.width)));
    const y=Math.max(0,Math.min(map.height-1,Math.floor((1-source[1]-q[1]*extent[1])*map.height)));
    return contactDepth(map.data[(y*map.width+x)*4]/255,arrival)>.03;
  }

  recordPush(id,point) {
    if(!id) return;
    this.pulse(point,1.35);
    const unlocked=this.tally.register(id);
    this.canvas.dataset.repulsions=String(this.tally.count);
    if(unlocked) {
      this.embrace.reset();
      this.departingForms=['face','handA','handB'].map(key=>({...this.currentEvents[key],field:[...this.currentEvents[key].field],pose:[...this.currentEvents[key].pose]}));
      this.encounter.unlock(this.elapsed);
    }
  }

  pushAt(point) {
    if (!this.roguesEnabled || !this.currentEvents || !['idle','breach'].includes(this.encounter.state)) return;
    const aspect=this.canvas.width/this.canvas.height;
    if(this.encounter.state==='breach') {
      const combo=this.encounterFrame.combo;
      const [x,y,h,strength]=combo.field;
      const q=[(point[0]-x)*aspect/h+.5,(point[1]-y)/h+.5];
      if(strength<.06 || q.some(value=>value<0||value>1))return;
      const part=q[0]<.33?1:q[0]>.67?2:0;
      const map=this.hitMaps[`uCombo${combo.id}`];
      if(!map || combo.weights[part]<.06)return;
      const px=Math.min(map.width-1,Math.floor(q[0]*map.width));
      const py=Math.min(map.height-1,Math.floor((1-q[1])*map.height));
      if(contactDepth(map.data[(py*map.width+px)*4]/255,combo.arrival[part])<=.03)return;
      this.recordPush(this.encounter.repel(part,this.elapsed),point);
      return;
    }
    const names=['face','handA','handB'];
    for(let index=0;index<names.length;index++) {
      const name=names[index],actor=this.currentEvents[name];
      if(actor.field[3]<.06) continue;
      const [x,y,h]=actor.field,[angle,mirror,width]=actor.pose;
      const dx=(point[0]-x)*aspect/h,dy=(point[1]-y)/h;
      const c=Math.cos(angle),s=Math.sin(angle);
      const q=[(c*dx+s*dy)*mirror/width,-s*dx+c*dy];
      if(Math.abs(q[0])>.46 || Math.abs(q[1])>.46 || !this.sampleSilhouette(actor.model,index===0,q,actor.arrival)) continue;
      this.recordPush(this.motion.repel(name,this.elapsed),point);
      return;
    }
  }

  updateWorld(scene) {
    if (scene.state !== this.sceneState) {
      this.sceneState = scene.state;
      this.onSceneChange(scene.state);
    }
    const world=scene.moon>.5?'moonbound':'blackwall';
    if(world!==this.world) { this.world=world; this.onWorldChange(world); }
    this.canvas.dataset.world=world;
    this.canvas.dataset.encounter=scene.state;
  }

  draw() {
    if (!this.gl || this.contextLost) return;
    const gl=this.gl,u=this.uniforms,aspect=this.canvas.width/this.canvas.height;
    // Rare automatic encounters wait for the open bio page, not an article.
    const about=!location.hash || location.hash==='#about';
    if (about && this.encounter.state==='idle' && this.elapsed>=this.encounter.next) this.trigger();
    const encounter=this.encounter.update(this.elapsed,aspect);
    if (!encounter.active && this.embrace.started!==null) this.embrace.reset();
    this.encounterFrame=encounter;
    if (this.motion.suspended && !encounter.active) this.motion.clear(this.elapsed);
    this.motion.suspended=encounter.active;
    const events=this.motion.update(this.elapsed,aspect);
    if (encounter.active) {
      // A complete generated composition owns the scene; never assemble unrelated limbs.
      for(const key of ['face','handA','handB'])events[key].field[3]=0;
      if(this.encounter.state==='crossing' && !this.encounter.wonFromBreach && this.departingForms) {
        const p=Math.max(0,Math.min(1,(this.elapsed-this.encounter.wonAt)/1.8));
        const recoil=p*p*(3-2*p);
        [events.face,events.handA,events.handB]=this.departingForms.map(form=>({...form,field:[...form.field.slice(0,3),form.field[3]*(1-recoil)],pose:[...form.pose.slice(0,3),recoil]}));
      }
    }
    this.currentEvents=events;
    this.updateWorld(encounter);
    gl.uniform2f(u.uResolution,this.canvas.width,this.canvas.height);
    gl.uniform2f(u.uPatternResolution,this.resolution.patternWidth,this.resolution.patternHeight);
    gl.uniform2f(u.uPointer,...this.pointer);
    gl.uniform2f(u.uPointerState,(this.pressing?1:.26)+this.pointerEnergy*.42,this.pointerActive);
    gl.uniform1f(u.uTime,this.elapsed+this.phase);
    gl.uniform3f(u.uPageMood,...this.pageMood);
    gl.uniform1f(u.uPageTurn,this.elapsed-this.pageTurnAt);
    gl.uniform1f(u.uPageFlow,this.pageFlow);
    gl.uniform1f(u.uLoaded,this.loaded?1:0);
    gl.uniform4f(u.uReading,...(this.reading||[0,0,0,0]));
    for (const [name,uniform] of [['face','Face'],['handA','HandA'],['handB','HandB']]) {
      gl.uniform4f(u[`u${uniform}`],...events[name].field);
      gl.uniform4f(u[`u${uniform}Pose`],...events[name].pose);
    }
    gl.uniform3f(u.uModelIds,events.face.model,events.handA.model,events.handB.model);
    gl.uniform3f(u.uArrival,events.face.arrival,events.handA.arrival,events.handB.arrival);
    gl.uniform4f(u.uRiftA,...events.riftA.field); gl.uniform4f(u.uRiftB,...events.riftB.field);
    gl.uniform2f(u.uRiftModes,events.riftA.mode,events.riftB.mode);
    for (let i=0;i<4;i++) {
      const pulse=this.impulses[i];
      gl.uniform4f(u[`uImpulse${i}`],...(pulse?[...pulse.position,this.elapsed-pulse.start,pulse.strength]:[0,0,100,0]));
    }
    gl.uniform4f(u.uCombo,...encounter.combo.field);
    gl.uniform3f(u.uComboWeights,...encounter.combo.weights);
    gl.uniform3f(u.uComboRecoil,...encounter.combo.recoil);
    gl.uniform3f(u.uComboArrival,...encounter.combo.arrival);
    gl.uniform1f(u.uComboId,encounter.combo.id);
    gl.uniform4f(u.uBreach,.5,.43,encounter.threat,encounter.retreat);
    gl.uniform1f(u.uMoonAspect,this.moonAspect||16/9);
    gl.uniform1f(u.uMoonAtlas,this.moonAtlasReady?1:0);
    gl.uniform1f(u.uMoonEmbrace,this.embrace.progress(this.elapsed));
    this.canvas.dataset.embrace=this.embrace.state(this.elapsed);
    this.canvas.dataset.combo=encounter.combo.active?String(encounter.combo.id):'none';
    gl.uniform1f(u.uMoon,encounter.moon);
    const faceState=events.face.field[3]>.02 || (encounter.combo.field[3]*encounter.combo.weights[0]>.02)?'visible':'absent';
    if (this.canvas.dataset.face!==faceState) this.canvas.dataset.face=faceState;
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  setRoguesEnabled(enabled) {
    this.roguesEnabled = Boolean(enabled);
    this.canvas.dataset.rogues = this.roguesEnabled ? 'enabled' : 'disabled';
    this.motion.setRoguesEnabled(this.roguesEnabled, this.elapsed);
    if (!this.roguesEnabled) this.encounter.dismiss(this.elapsed);
    else this.encounter.next = this.elapsed + 180 + Math.random() * 120;
  }
  setPaused(paused) {
    this.paused = Boolean(paused);
    this.canvas.dataset.motion = this.paused ? 'paused' : 'running';
    if (this.paused && this.frame) cancelAnimationFrame(this.frame);
    if (this.paused) this.frame = 0;
    this.last = 0; this.frameSample = null;
    if (!this.paused) this.schedule();
  }
  schedule() {
    if (!this.paused && !this.frame && !document.hidden && !this.contextLost) this.frame=requestAnimationFrame(now=>this.tick(now));
  }
  tick(now) {
    this.frame=0;
    if (this.paused || document.hidden || this.contextLost) { this.last=0; return; }
    if (now-this.last>=33) {
      const dt=this.last?Math.min((now-this.last)/1000,.25):0;
      this.elapsed+=dt; this.last=now;
      const mood=this.pageMoods[this.pageSection];
      this.pageMood=this.pageMood.map((value,i)=>value+(mood[i]-value)*Math.min(1,dt*3));
      this.pageFlow+=dt*this.pageMood[0];
      this.pointer=this.pointer.map((v,i)=>v+(this.targetPointer[i]-v)*.16);
      this.pointerEnergy*=.90;
      this.draw();
      // Local diagnostics only, sampled infrequently and never sent anywhere.
      if (!this.frameSample) this.frameSample={start:now,count:0};
      else this.frameSample.count++;
      const sampleDuration=now-this.frameSample.start;
      if (sampleDuration>=2000) {
        this.canvas.dataset.renderFps=(this.frameSample.count*1000/sampleDuration).toFixed(1);
        this.frameSample={start:now,count:0};
      }
    }
    this.schedule();
  }
  fallback() {
    this.canvas.dataset.renderer='static'; this.canvas.width=this.canvas.height=0;
  }
}
