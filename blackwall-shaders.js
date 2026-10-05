// Shared contact curve for rendered depth and click/touch hit testing.
const contactStandOff=1.035,contactFeather=.14,contactFinish=.90;
const smoothContact=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function contactDepth(depth,arrival) {
  const penetration=Math.max(0,depth-contactStandOff*(1-arrival));
  const contact=penetration*penetration/(penetration+contactFeather);
  const settled=smoothContact(contactFinish,1,arrival);
  return contact*(1-settled)+depth*settled;
}

export const vertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}
`;

export const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uPatternResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uLoaded;
uniform sampler2D uDepth;
uniform vec4 uReading;
uniform vec4 uFace;
uniform vec4 uHandA;
uniform vec4 uHandB;
uniform vec4 uFacePose;
uniform vec4 uHandAPose;
uniform vec4 uHandBPose;
uniform vec4 uRiftA;
uniform vec4 uRiftB;
uniform vec2 uRiftModes;
uniform sampler2D uModels;
uniform sampler2D uMoonMap;
uniform vec3 uModelIds;
uniform vec3 uArrival;
uniform vec2 uPointerState;
uniform vec4 uImpulse0;
uniform vec4 uImpulse1;
uniform vec4 uImpulse2;
uniform vec4 uImpulse3;
uniform vec4 uBreach;
uniform float uMoon;
uniform float uMoonAspect;
uniform float uMoonAtlas;
uniform float uMoonEmbrace;
uniform sampler2D uHandClaw;
uniform sampler2D uHandReach;
uniform sampler2D uCombo0;
uniform sampler2D uCombo1;
uniform sampler2D uCombo2;
uniform vec4 uCombo;
uniform vec3 uComboWeights;
uniform vec3 uComboRecoil;
uniform vec3 uComboArrival;
uniform float uComboId;
uniform vec3 uPageMood;
uniform float uPageTurn;
uniform float uPageFlow;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float contactDepth(float depth,float arrival){
  // Translate the relief toward a membrane plane: peaks contact first.
  // A rounded contact shoulder prevents a sharp contour at the emerging edge.
  float penetration=max(0.,depth-${contactStandOff}*(1.-arrival));
  float contact=penetration*penetration/(penetration+${contactFeather});
  return mix(contact,depth,smoothstep(${contactFinish},1.,arrival));
}
float supportedSheet(vec3 reliefData,float arrival,float contact){
  // Blender-baked pinned-sheet support, introduced only after actual contact.
  float support=mix(reliefData.g,reliefData.b,smoothstep(.98,1.,arrival))*smoothstep(.55,.78,arrival);
  return contact+max(0.,support-contact)*.88;
}
vec2 relief(vec2 p,vec4 form,vec4 pose,float model,float isFace,float arrival){
  if(form.w<.002)return vec2(0.);
  float aspect=uResolution.x/uResolution.y;
  vec2 localPointer=(p-uPointer)*vec2(aspect,1.);
  float repel=exp(-dot(localPointer,localPointer)*65.)*uPointerState.x*uPointerState.y;
  vec2 q=(p-form.xy)*vec2(aspect,1.)/max(form.z,.001);
  float c=cos(pose.x),s=sin(pose.x);
  q=mat2(c,-s,s,c)*q;
  q.x*=pose.y/pose.z;
  // Pressing changes depth, never the silhouette's screen-space size.
  float edge=(1.-smoothstep(.44,.50,abs(q.x)))*(1.-smoothstep(.44,.5,abs(q.y)));
  vec3 reliefData=vec3(0.);
  if(isFace<.5 && abs(model-1.)<.1){
    reliefData=texture2D(uHandClaw,clamp(q+.5,vec2(.001),vec2(.999))).rgb;
  }else if(isFace<.5 && abs(model-3.)<.1){
    reliefData=texture2D(uHandReach,clamp(q+.5,vec2(.001),vec2(.999))).rgb;
  }else if(model<3.5){
    vec2 source=vec2((model+.5)*.25,isFace>.5?.75:.25);
    reliefData=texture2D(uModels,clamp(source+q*vec2(.25,.5),vec2(.001),vec2(.999))).rgb;
  }else{
    vec2 source=isFace>.5?vec2(.62,.46):(model<4.5?vec2(.21,.38):vec2(.865,.625));
    vec2 extent=isFace>.5?vec2(.30,.57):(model<4.5?vec2(.38,.64):vec2(.27,.52));
    reliefData=texture2D(uDepth,clamp(source+q*extent,vec2(.001),vec2(.999))).rgb;
  }
  float depth=contactDepth(reliefData.r,arrival);
  float sheet=supportedSheet(reliefData,arrival,depth);
  float dissolve=smoothstep(pose.w*.58,pose.w*.58+.3,depth);
  float weight=edge*form.w*(1.-repel*.76)*mix(1.,dissolve,pose.w);
  return vec2(depth,sheet)*weight;
}
vec2 composite(vec2 p){
  vec2 q=(p-uCombo.xy)*vec2(uResolution.x/uResolution.y,1.)/max(uCombo.z,.001)+.5;
  if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return vec2(0.);
  vec3 reliefData;
  if(uComboId<.5)reliefData=texture2D(uCombo0,q).rgb;
  else if(uComboId<1.5)reliefData=texture2D(uCombo1,q).rgb;
  else reliefData=texture2D(uCombo2,q).rgb;
  float left=1.-smoothstep(.30,.36,q.x);
  float right=smoothstep(.64,.70,q.x);
  vec3 parts=vec3(1.-left-right,left,right);
  float resistance=dot(parts,uComboWeights);
  float recoil=dot(parts,uComboRecoil);
  vec2 toPointer=(p-uPointer)*vec2(uResolution.x/uResolution.y,1.);
  float repel=exp(-dot(toPointer,toPointer)*65.)*uPointerState.x*uPointerState.y;
  float arrival=dot(parts,uComboArrival);
  float depth=contactDepth(reliefData.r,arrival);
  float sheet=supportedSheet(reliefData,arrival,depth);
  float dissolve=smoothstep(recoil*.55,recoil*.55+.3,depth);
  float weight=uCombo.w*resistance*(1.-repel*.68)*mix(1.,dissolve,recoil);
  return vec2(depth,sheet)*weight;
}
vec2 entities(vec2 p){
  if(uCombo.w>.0001)return composite(p)*uLoaded;
  vec2 face=relief(p,uFace,uFacePose,uModelIds.x,1.,uArrival.x);
  vec2 hand=relief(p,uHandA,uHandAPose,uModelIds.y,0.,uArrival.y);
  vec2 other=relief(p,uHandB,uHandBPose,uModelIds.z,0.,uArrival.z);
  return (face+hand+other)*uLoaded;
}
float ripple(vec2 p,vec4 impulse){
  vec2 d=(p-impulse.xy)*vec2(uResolution.x/uResolution.y,1.);
  float r=length(d);
  return sin(r*65.-impulse.z*12.)*exp(-abs(r-impulse.z*.15)*24.)*exp(-impulse.z*.95)*impulse.w;
}
float disturbance(vec2 p,vec4 event,float mode){
  vec2 d=(p-event.xy)*vec2(uResolution.x/uResolution.y,1.);
  float falloff=exp(-dot(d,d)*14.);
  float wave=sin(length(d)*36.-event.z*12.);
  if(mode>0.5)wave=sin(d.y*24.+sin(d.x*13.+event.z*5.)*2.-event.z*7.);
  if(mode>1.5)wave=(noise(d*9.+vec2(event.z*2.,-event.z*3.))-.5)*2.;
  return wave*falloff*event.w;
}

float softRect(vec2 p,vec4 r){
  vec2 enter=smoothstep(r.xy-vec2(.06,.05),r.xy,p);
  vec2 leave=1.-smoothstep(r.zw,r.zw+vec2(.06,.05),p);
  return enter.x*enter.y*leave.x*leave.y;
}

float fbm(vec2 p){
  float f=0.,a=.5;
  for(int i=0;i<4;i++){f+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.08+3.1;a*=.5;}
  return f;
}
float stars(vec2 p,float scale,float seed){
  vec2 g=p*scale,id=floor(g),q=fract(g);
  vec2 at=vec2(hash(id+seed),hash(id+seed+21.));
  float d=length(q-at);
  float core=exp(-d*d*2700.);
  float glow=exp(-d*d*120.);
  float visible=step(.89,hash(id+71.+seed));
  float bright=.55+.45*sin(uTime*(.15+hash(id)) + hash(id+9.)*18.);
  return (core+glow*.07)*visible*bright;
}
vec3 moonPose(vec2 uv,float pose){
  uv=clamp(uv,vec2(.0006),vec2(.9994));
  if(uMoonAtlas>.5)uv.y=(uv.y+(pose<.5?1.:0.))*.5;
  return texture2D(uMoonMap,uv).rgb;
}
vec3 moonArt(vec2 uv){
  vec3 original=moonPose(uv,0.);
  float progress=uMoonEmbrace;
  if(progress<.001 || uMoonAtlas<.5)return original;
  // Local motion carries the two silhouettes inward; the Earth stays on the original frame.
  float region=smoothstep(.278,.307,uv.x)*(1.-smoothstep(.681,.710,uv.x));
  region*=smoothstep(.153,.182,uv.y)*(1.-smoothstep(.557,.595,uv.y));
  if(region<.001)return original;
  float dCenter=.405+.052*progress;
  float lCenter=.594-.074*progress;
  float david=exp(-pow(abs((uv.x-dCenter)/.087),4.));
  float lucy=exp(-pow(abs((uv.x-lCenter)/.073),4.));
  float displacement=(.052*david-.074*lucy)/max(1.,david+lucy);
  displacement*=smoothstep(.16,.23,uv.y)*(1.-smoothstep(.55,.60,uv.y));
  vec2 from=uv-vec2(displacement*progress,0.);
  vec2 to=uv+vec2(displacement*(1.-progress),0.);
  float blend=smoothstep(.12,.88,progress);
  vec3 figures=mix(moonPose(from,0.),moonPose(to,1.),blend);
  return mix(original,figures,region);
}
vec3 moonbound(vec2 uv){
  float aspect=uResolution.x/uResolution.y;
  // Preserve the paired silhouettes on portrait screens; let the Earth extend beyond the sides.
  float sceneHeight=min(1.04,max(.56,aspect/(uMoonAspect*.56)));
  float sceneWidth=sceneHeight*uMoonAspect;
  vec2 sceneSize=vec2(sceneWidth,sceneHeight);
  vec2 center=vec2(.5,.08+sceneHeight*.5);
  vec2 parallax=(uPointer-.5)*vec2(.010,.006)*uPointerState.y;
  vec2 mapUV=(uv-center)*vec2(aspect,1.)/sceneSize+.5+parallax;
  vec3 art=vec3(0.);
  float slopeX=0.,slopeY=0.;
  float inside=step(0.,mapUV.x)*step(mapUV.x,1.)*step(0.,mapUV.y)*step(mapUV.y,1.);
  if(inside>.5){
    art=moonArt(mapUV);
    slopeX=dot(moonArt(mapUV+vec2(.0015,0.))-moonArt(mapUV-vec2(.0015,0.)),vec3(.299,.587,.114));
    slopeY=dot(moonArt(mapUV+vec2(0.,.0015))-moonArt(mapUV-vec2(0.,.0015)),vec3(.299,.587,.114));
  }
  float luminance=dot(art,vec3(.299,.587,.114));
  float groundFade=smoothstep(0.,.045,mapUV.y)*(1.-smoothstep(.90,1.,mapUV.y))*inside;
  float depth=luminance*groundFade;
  float detail=clamp(length(vec2(slopeX,slopeY))*8.,0.,1.);
  vec2 p=uv*vec2(aspect,1.);
  vec2 delta=(uv-uPointer)*vec2(aspect,1.);
  float cursor=exp(-dot(delta,delta)*48.)*uPointerState.y;
  float impulse=ripple(uv,uImpulse0)+ripple(uv,uImpulse1)+ripple(uv,uImpulse2);
  vec2 q=uv;
  // Very slow coherent drift carries the image through the same digital membrane.
  q.x+=sin(uv.y*7.+uTime*.11)*.004+depth*.009+slopeX*.018+impulse*.011;
  q.y+=sin(uv.x*6.-uTime*.08)*.002+slopeY*.006;
  q+=delta*cursor*.055;
  float columns=clamp(uPatternResolution.x/3.7,115.,520.);
  float line=pow(max(0.,1.-abs(fract(q.x*columns)-.5)*2.),2.5);
  float echo=pow(max(0.,1.-abs(fract((q.x+.0017)*columns)-.5)*2.),4.);
  float rows=.48+.52*smoothstep(.10,.25,fract(q.y*uPatternResolution.y/3.0));
  vec2 pixel=floor(vec2(q.x*columns,q.y*uPatternResolution.y/3.0));
  float packet=hash(vec2(pixel.x,floor(pixel.y/8.+uTime*(.38+hash(vec2(pixel.x,2.))))));
  float broken=.30+.70*smoothstep(.10,.32,packet);
  float mist=fbm(p*3.+vec2(uTime*.008,-uTime*.004));
  // Preserve the source hues in every strand, including darker blue and green regions.
  vec3 vivid=clamp(mix(vec3(luminance),art,1.16),0.,1.);
  float peak=max(vivid.r,max(vivid.g,vivid.b));
  vec3 chroma=vivid/max(peak,.025);
  float sourceMask=smoothstep(.008,.05,peak)*groundFade;
  vec3 strandColor=mix(vec3(.24,.27,.40),chroma,sourceMask);
  float presence=pow(peak*groundFade,.72)*1.18+detail*.20*groundFade;
  float signal=line*rows*broken*(.045+mist*.055+presence);
  float dust=step(.97,hash(pixel+floor(uTime*.30)))*rows*(.016+presence*.27);
  // Color is emitted only through moving strands, broken packets, and sparks.
  vec3 color=vec3(35.,31.,35.)/255.;
  color+=strandColor*signal*1.24;
  color+=mix(strandColor,vec3(.75,.82,1.),.10)*echo*rows*broken*(.025+presence*.32);
  color+=mix(strandColor,vec3(1.),.12)*dust*1.25;
  color+=vec3(.10,.14,.24)*abs(impulse)*line;
  color+=vec3(.30,.34,.60)*stars(p,56.,2.)*.10*(1.-smoothstep(.0,.1,depth));
  return color;
}

void main(){
  vec2 uv=vUv;
  float t=uTime;
  float aspect=uResolution.x/uResolution.y;
  vec2 texel=vec2(1.8)/uPatternResolution;
  // Independent, randomly positioned events distort the surface; faces are rare.
  vec2 surface=entities(uv);
  float e=surface.x;
  vec2 dx=entities(uv+vec2(texel.x,0.))-entities(uv-vec2(texel.x,0.));
  vec2 dy=entities(uv+vec2(0.,texel.y))-entities(uv-vec2(0.,texel.y));
  float ex=dx.x,ey=dy.x;
  float impulse=ripple(uv,uImpulse0)+ripple(uv,uImpulse1)+ripple(uv,uImpulse2)+ripple(uv,uImpulse3);
  vec2 pointerDelta=(uv-uPointer)*vec2(aspect,1.);
  float pointerField=exp(-dot(pointerDelta,pointerDelta)*48.)*uPointerState.y;
  float anomaly=disturbance(uv,uRiftA,uRiftModes.x)+disturbance(uv,uRiftB,uRiftModes.y)+impulse*.8;
  float field=noise(vec2(uv.x*3.1+t*.023,uv.y*3.5-t*.026));
  float swell=sin(uv.y*8.+t*.14+sin(uv.x*5.-t*.08));
  // Original local contact deformation; no extra pull across the surrounding sheet.
  float bend=(.008*swell+.006*sin(uv.y*18.-t*.11))*uPageMood.y+e*.051+ex*1.5+anomaly*.027+pointerDelta.x*pointerField*(.15+uPointerState.x*.20);
  float tearRow=floor(uv.y*42.);
  float tear=smoothstep(.91,.998,sin(t*.39+tearRow*2.27));
  float offset=(hash(vec2(tearRow,11.))- .5)*.026*tear;
  float turn=clamp(uPageTurn/1.6,0.,1.);
  float turnBand=exp(-pow((uv.x-mix(1.15,-.15,turn))*3.6,2.))*sin(turn*3.14159);
  vec2 q=uv+vec2(bend+offset+turnBand*.006*sin(uv.y*7.),ey*.30+e*.011+pointerDelta.y*pointerField*.08);
  float columns=clamp(uPatternResolution.x/4.5,95.,460.);
  float col=floor(q.x*columns);
  float cellY=q.y*uPatternResolution.y/3.4;
  float movingY=cellY+uPageFlow*(2.+hash(vec2(col,2.))*5.);
  float block=floor(movingY/7.);
  float packet=hash(vec2(col,block));
  float breaks=smoothstep(.11,.31,packet);
  float rows=.48+.52*smoothstep(.10,.28,fract(cellY));
  float lineRed=pow(max(0.,1.-abs(fract(q.x*columns)-.5)*2.),3.5);
  float lineBlue=pow(max(0.,1.-abs(fract((q.x+.002+ex*.45)*columns)-.5)*2.),5.);
  float structure=.15+abs(anomaly)*.23+.22*field+.24*pow(.5+.5*sin(uv.x*12.+uv.y*3.+t*.09),3.);
  float presence=clamp(e*1.8+abs(ex)*17.+abs(ey)*8.,0.,1.);
  float burn=smoothstep(.68,.99,packet)*(.18+.55*presence);
  float red=lineRed*breaks*rows*(structure+presence*.88);
  float blue=lineBlue*rows*(.12+structure*.28+presence*.50)*(.3+.7*breaks);
  // A second, granular layer keeps the wall from reading as flat parallel lines.
  vec2 pixels=floor(vec2(q.x*columns,q.y*uPatternResolution.y/3.4));
  float grit=hash(pixels+floor(t*.45));
  float fleck=step(.984,grit)*(.07+presence*.45)*rows;
  float erosion=smoothstep(.22,.6,noise(vec2(q.x*17.,q.y*13.+t*.04)));
  red*=.52+.48*erosion;
  float rim=clamp(abs(ex)*18.+abs(ey)*11.,0.,1.);
  vec3 signal=vec3(.72,.075,.10)*red+vec3(.17,.22,.85)*blue;
  signal+=vec3(.57,.24,.32)*(fleck+lineRed*rim*.32);
  signal+=vec3(.28,.012,.028)*pow(e,1.65)*.24;
  signal+=vec3(.65,.17,.18)*burn*lineRed*.2;
  signal+=vec3(.07,.055,.27)*abs(anomaly)*lineBlue*.32;
  signal+=vec3(.04,.13,.24)*pointerField*(.2+uPointerState.x)*lineBlue*.8;
  signal+=vec3(.28,.11,.22)*abs(impulse)*lineRed*.38;
  // Directional membrane lighting: a soft shadow on the receding side and a
  // restrained specular line on taut, forward-facing ridges.
  vec3 normal=normalize(vec3(-dx.y*45.,-dy.y*45.,1.));
  vec3 light=normalize(vec3(-.55,.65,1.));
  float contactMask=smoothstep(.015,.26,e);
  float diffuse=dot(normal,light);
  float specular=pow(max(0.,dot(normal,normalize(light+vec3(0.,0.,1.)))),18.)*contactMask;
  float contactShadow=clamp((surface.y-e)*1.15+max(0.,-diffuse)*.22,0.,.32)*contactMask;
  signal*=mix(1.,.64+max(0.,diffuse)*.54,contactMask);
  signal+=vec3(.49,.27,.34)*specular*lineRed*rows*breaks*.21;
  signal*=1.-uPageMood.z*.12;
  vec2 breachDelta=(uv-uBreach.xy)*vec2(aspect,1.);
  float rupture=exp(-dot(breachDelta,breachDelta)*8.)*uBreach.z;
  float cracks=pow(max(0.,sin(atan(breachDelta.y,breachDelta.x)*11.+noise(uv*14.)*.55)),34.);
  signal+=vec3(.48,.045,.12)*rupture*cracks*.16;
  signal+=vec3(.57,.12,.21)*uBreach.z*(pow(e,1.3)*.27+rim*.17);
  float textMask=softRect(uv,uReading);
  float calm=(1.-textMask*.91)*mix(1.,.32,smoothstep(.73,.98,uv.y));
  float edgeFade=.65+.35*sin(clamp(uv.x,0.,1.)*3.14159);
  signal*=calm*edgeFade;
  // Exact supplied charcoal remains the base; light is added only by the field.
  vec3 base=vec3(35.,31.,32.)/255.;
  vec3 color=base*(1.-contactShadow*calm*.55)+signal*1.12;
  float grain=(hash(gl_FragCoord.xy+floor(t*8.))-.5)*.004;
  if(uMoon>.001){
    float reveal=smoothstep(0.05,.95,uMoon+(noise(uv*6.)-.5)*sin(uMoon*3.14159)*.30);
    vec3 space=moonbound(uv);
    space=mix(space,vec3(.07,.068,.095),textMask*.30);
    space=mix(space,base,smoothstep(.83,.99,uv.y)*.64);
    color=mix(color,space,reveal);
  }
  gl_FragColor=vec4(color+grain,1.);
}
`;
