import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{MeshoptDecoder}from'three/addons/libs/meshopt_decoder.module.js';import{RoomEnvironment}from'three/addons/environments/RoomEnvironment.js';import{RectAreaLightUniformsLib}from'three/addons/lights/RectAreaLightUniformsLib.js';import{safeFacialPose,estimateMouthOpening}from'./facial-safety.js';import{GesturePlayback}from'./gesture-playback.js';import{InterviewMotion}from'./interview-motion.js';
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,innerWidth/innerHeight,.03,15);camera.position.set(0,1.52,1.85);camera.lookAt(0,1.32,.04);
const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
// Broad window light and a low-energy shadow caster, matched to the office plate.
RectAreaLightUniformsLib.init();
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.27;room.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xf5f0e8,0x9b8b78,.28));
const windowLight=new T.RectAreaLight(0xfff1df,2.9,2.4,1.9);windowLight.position.set(-1.25,2.0,1.7);windowLight.lookAt(0,1.48,.03);scene.add(windowLight);
const fillLight=new T.RectAreaLight(0xe6edf4,.4,1.8,1.6);fillLight.position.set(1.6,1.65,1.8);fillLight.lookAt(0,1.46,.03);scene.add(fillLight);
const key=new T.DirectionalLight(0xfff0dc,.4);key.position.set(-1.8,2.6,1.8);key.target.position.set(0,1.30,.10);scene.add(key.target);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-.9;key.shadow.camera.right=.9;key.shadow.camera.top=.75;key.shadow.camera.bottom=-.7;key.shadow.camera.near=.1;key.shadow.camera.far=6;key.shadow.bias=-.00015;key.shadow.normalBias=.002;key.shadow.radius=4;scene.add(key);
const rim=new T.DirectionalLight(0xffdfb5,.25);rim.position.set(.8,2,-1);scene.add(rim);
function box(name,w,h,d,x,y,z,color,rough=.7){const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:rough}));o.name=name;o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;scene.add(o);return o}
const desk=box('Desk',2.3,.045,.98,0,1.045,.695,0x49372b,.6);const deskPad=box('DeskPad',.77,.003,.42,0,1.069,.43,0x292e2e,.92);box('DeskFrontApron',2.3,.18,.03,0,.94,1.16,0x38291f,.7);box('ChairBack',.37,.36,.07,0,1.14,-.15,0x242a2b,.9);box('Notebook',.16,.015,.22,-.43,1.076,.35,0xc3b59e,.9);box('NotebookSpine',.008,.016,.22,-.505,1.077,.35,0x273634,.8);
const cup=new T.Mesh(new T.CylinderGeometry(.033,.029,.075,48),new T.MeshStandardMaterial({color:0xe0ddd2,roughness:.3}));cup.position.set(.43,1.106,.32);cup.castShadow=true;cup.receiveShadow=true;scene.add(cup);const coffee=new T.Mesh(new T.CircleGeometry(.029,48),new T.MeshStandardMaterial({color:0x291a10,roughness:.25}));coffee.rotation.x=-Math.PI/2;coffee.position.set(.43,1.145,.32);scene.add(coffee);
const audio=document.getElementById('audio'),button=document.getElementById('play'),state=document.getElementById('state'),motionToggle=document.getElementById('motion');const morphs=[],shapes=new Set();let manual=null,cues=[],motion,playback,root,listening=false,listeningTime=0,listeningSince=0;const facialState={};const mapping={A:'viseme_PP',B:'viseme_kk',C:'viseme_E',D:'viseme_aa',E:'viseme_O',F:'viseme_U',G:'viseme_FF',H:'viseme_nn',X:'viseme_sil'};
function setShape(name,value){for(const m of morphs){const i=m.morphTargetDictionary[name];if(i!==undefined)m.morphTargetInfluences[i]=value}}
function speechWeights(t){const w={},fade=.06;for(const c of cues){if(t<c.start-fade||t>c.end+fade)continue;const v=Math.max(0,Math.min(1,(t-c.start+fade)/(2*fade),(c.end+fade-t)/(2*fade)));w[mapping[c.value]]=(w[mapping[c.value]]||0)+v}const sum=Object.values(w).reduce((a,b)=>a+b,0);if(sum>1)for(const k in w)w[k]/=sum;return w}
window.cveatAvatarStatus?.('loading',{progress:0});
try{const[g,c,bg]=await Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('../Cveat_Office_Avatar_Web.glb',event=>window.cveatAvatarStatus?.('loading',{progress:event.total?Math.min(90,Math.round(event.loaded/event.total*90)):null})),fetch('../demo-cues.json').then(r=>r.json()),new T.TextureLoader().loadAsync('../office-background.webp')]);window.cveatAvatarStatus?.('loading',{progress:95});bg.colorSpace=T.SRGBColorSpace;scene.background=bg;window.officeBackground=bg;cues=c.mouthCues;root=g.scene;scene.add(root);g.scene.traverse(o=>{
 if(!o.isMesh)return;
 o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;
 if(o.morphTargetDictionary){morphs.push(o);Object.keys(o.morphTargetDictionary).forEach(n=>shapes.add(n));}
 const original=Array.isArray(o.material)?o.material:[o.material];
 const refined=original.map(m=>{
   if(!m)return m;
   const skin=m.name==='Skin_CC0',fiber=/HairFiber|FineHairWisps|HairStrands/i.test(o.name+' '+m.name),hair=/short02/i.test(o.name)||fiber,eye=/high.poly/i.test(o.name),tear=/TearFilm/i.test(m.name);
   let p=m;
   if(skin||hair||eye||tear){p=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(p,m);p.name=m.name;p.envMapIntensity=1;}
   p.side=T.FrontSide;
   if(skin){p.color.set(0xffffff);p.ior=1.4;p.specularIntensity=.35;p.roughness=p.roughnessMap?1:.55;p.normalScale.set(.35,.35);p.clearcoat=.025;p.clearcoatRoughness=.6;
     p.onBeforeCompile=shader=>{const code=T.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );','float skinWrap = saturate( ( dot( geometryNormal, directLight.direction ) + 0.18 ) / 1.18 ); vec3 skinIrradiance = mix( irradiance, skinWrap * directLight.color, 0.18 ); reflectedLight.directDiffuse += skinIrradiance * BRDF_Lambert( material.diffuseColor );');shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_pars_fragment>',code);
       shader.uniforms.cveatSkinTexel={value:new T.Vector2(1/p.map.image.width,1/p.map.image.height)};
       shader.fragmentShader='uniform vec2 cveatSkinTexel;\n'+shader.fragmentShader;
       const filteredMap=T.ShaderChunk.map_fragment.replace('vec4 sampledDiffuseColor = texture2D( map, vMapUv );','vec4 skinRaw = texture2D( map, vMapUv ); vec4 skinSoft = skinRaw * 0.5 + 0.125 * (texture2D(map,vMapUv+vec2(cveatSkinTexel.x,0.0))+texture2D(map,vMapUv-vec2(cveatSkinTexel.x,0.0))+texture2D(map,vMapUv+vec2(0.0,cveatSkinTexel.y))+texture2D(map,vMapUv-vec2(0.0,cveatSkinTexel.y))); vec4 sampledDiffuseColor = mix(skinRaw,skinSoft,0.65);');
       shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',filteredMap);
     };p.customProgramCacheKey=()=> 'cveat-skin-wrap-filter-v4';}
   if(hair){if(!fiber)p.color.setRGB(.65,.60,.55);p.roughness=.7;p.specularIntensity=.3;p.ior=1.45;p.anisotropy=fiber?.5:.12;p.sheen=.12;p.sheenRoughness=.65;p.sheenColor.set(0x574238);p.normalScale.set(.12,.12);p.transparent=false;p.alphaTest=.18;p.alphaToCoverage=true;p.depthWrite=true;p.side=T.DoubleSide;o.castShadow=false;if(fiber){p.transparent=true;p.opacity=.55;p.alphaTest=0;p.alphaToCoverage=false;p.depthWrite=false;p.forceSinglePass=true;}}
   if(tear){p.transparent=true;p.opacity=.35;p.depthWrite=false;p.side=T.DoubleSide;p.roughness=.18;p.clearcoat=.9;p.clearcoatRoughness=.06;p.polygonOffset=true;p.polygonOffsetFactor=-1;p.polygonOffsetUnits=-1;o.castShadow=false;}if(eye){p.roughness=.19;p.ior=1.38;p.specularIntensity=.6;p.clearcoat=.9;p.clearcoatRoughness=.075;p.transparent=false;}
   if(/eyebrow/i.test(o.name)){p.transparent=true;p.opacity=.76;p.alphaTest=.06;p.depthWrite=false;p.side=T.DoubleSide;o.castShadow=false;}
   if(/eyelash/i.test(o.name)){p.transparent=true;p.opacity=.32;p.alphaTest=.04;p.depthWrite=false;p.side=T.DoubleSide;o.castShadow=false;}
   return p;
 });
 o.material=Array.isArray(o.material)?refined:refined[0];
});await renderer.compileAsync(scene,camera);motion=new InterviewMotion(root);motion.setSpeechCues(cues);motion.apply(0,false,0);playback=new GesturePlayback(root,g.animations);
 const select=document.getElementById('target'),slider=document.getElementById('weight');for(const n of [...shapes].filter(n=>n!=='tongueOut').sort())select.add(new Option(n,n));const change=()=>{manual={name:select.value,value:+slider.value};audio.pause()};select.onchange=change;slider.oninput=change;document.getElementById('reset').onclick=()=>{manual=null;slider.value=0;audio.pause();audio.currentTime=0};button.disabled=false;button.textContent='Play interview preview';button.onclick=async()=>{manual=null;if(audio.paused){if(audio.ended)audio.currentTime=0;await audio.play()}else audio.pause()};audio.onplay=()=>{manual=null;listening=false;listeningTime=0;button.textContent='Pause preview'};audio.onpause=()=>button.textContent='Play interview preview';audio.onended=()=>{listening=true;listeningTime=0;listeningSince=performance.now();};document.getElementById('listen').onclick=()=>window.cveatAvatar.setListening(!listening);state.textContent='Ready';window.avatar={scene:root,fullScene:scene,morphs,head:motion.bones.get('head'),renderer,camera,shapes:[...shapes],speechWeights,setShape,cues,motion,clips:g.animations,playback,stage:{desk,deskPad,windowLight,fillLight,key}};window.cveatAvatar={setInterviewState(value){if(!value||typeof value!=="object")return;const weights={};for(const n of ['viseme_aa','viseme_O','viseme_E','viseme_U','viseme_PP']){const v=Number(value.weights?.[n]);weights[n]=Number.isFinite(v)?Math.min(1,Math.max(0,v)):0;}externalState={speaking:!!value.speaking,listening:!!value.listening,time:Number.isFinite(value.time)?Math.max(0,value.time):0,weights};if(listening!==externalState.listening){listeningSince=performance.now();listeningTime=0;}listening=externalState.listening;manual=null;audio.pause();if(value.speaking)motion.plan.gestures=[{clip:'GestureOpenRight',side:'R',duration:3.2,start:3.1,beat:4.38,strength:1}];},setSpeech(audioUrl,timedCues){if(!Array.isArray(timedCues)||timedCues.some(c=>!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.end<c.start||!mapping[c.value]))throw new Error('Expected valid Rhubarb mouth cues');audio.pause();listening=false;listeningTime=0;cues=timedCues.map(c=>({...c}));motion.setSpeechCues(cues);window.avatar.cues=cues;audio.src=audioUrl;audio.currentTime=0;manual=null;audio.load();},play(){manual=null;return audio.play();},pause(){audio.pause();},setMotion(enabled){motionToggle.checked=!!enabled;},setListening(enabled){if(enabled)audio.pause();manual=null;listening=!!enabled;listeningTime=0;listeningSince=performance.now();}};window.ready=true;}catch(e){state.textContent='3D view unavailable';window.cveatAvatarStatus?.('error');}
let start=performance.now(),lastFrame=start,activity=0,lastSpeechTime=0;
let externalState=null;
let notifiedReady=false;
let parentActive=true;
let frozenTime=null;
window.setPreviewTime=(t,speaking=true,options={})=>{frozenTime={t,speaking,...options};frame(performance.now());};
window.resumePreview=()=>{frozenTime=null;lastFrame=performance.now();};
function frame(now) {
  if(!motion)return;
  const talking=frozenTime?frozenTime.speaking:externalState?externalState.speaking:!audio.paused;
  const speechTime=frozenTime?frozenTime.t:externalState?externalState.time:audio.currentTime;
  const bodyTime=frozenTime?frozenTime.t:(now-start)/1000;
  const dt=Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  activity=T.MathUtils.damp(activity,talking?1:0,talking?5:3.8,dt);
  if(talking)lastSpeechTime=speechTime;
  if(listening&&!talking)listeningTime=Math.max(0,(now-listeningSince)/1000);else if(talking)listeningTime=0;
  const context=frozenTime?{listening:!!frozenTime.listening,listeningTime:frozenTime.listeningTime??0}
    :{dt,listening,listeningTime};
  const intensity=frozenTime?(talking?1:0):activity;
  const gestureTime=frozenTime?speechTime:lastSpeechTime;
  playback.poseAt(bodyTime,gestureTime,intensity,motionToggle.checked,motion.plan,context);
  const attention=motion.attention(bodyTime,intensity,gestureTime,context);
  for(const m of morphs)m.morphTargetInfluences.fill(0);
  let desired={};
  if(manual)desired[manual.name]=manual.value;
  else {
    if(talking)for(const[n,v]of Object.entries(externalState?externalState.weights:speechWeights(speechTime)))desired[n]=v*(n==='viseme_PP'?.96:.8);
    desired.browInnerUp=attention.brow;desired.mouthSmileLeft=attention.smile*(1-.8*(desired.viseme_PP||0));desired.mouthSmileRight=desired.mouthSmileLeft*.94;
    desired.cheekSquintLeft=attention.cheek;desired.cheekSquintRight=attention.cheek*.94;if(context.listening){desired.eyeWideLeft=.012;desired.eyeWideRight=.012;}
    const x=attention.gazeX,y=attention.gazeY;
    if(x>=0){desired.eyeLookOutLeft=x;desired.eyeLookInRight=x;}else{desired.eyeLookInLeft=-x;desired.eyeLookOutRight=-x;}
    if(y>=0){desired.eyeLookUpLeft=y;desired.eyeLookUpRight=y;}else{desired.eyeLookDownLeft=-y;desired.eyeLookDownRight=-y;}
  }
  desired=safeFacialPose(desired,manual?.name);
  for(const name of new Set([...Object.keys(facialState),...Object.keys(desired)])) {
    const goal=desired[name]||0;
    const value=frozenTime||manual?goal:T.MathUtils.damp(facialState[name]||0,goal,name==='viseme_PP'?48:28,dt);
    if(value>1e-5){facialState[name]=value;setShape(name,value);}else delete facialState[name];
  }
  const opening=estimateMouthOpening(facialState);
  for(const m of morphs)if(/tongue/i.test(m.name)){m.visible=opening>.30;for(let i=0;i<m.morphTargetInfluences.length;i++)m.morphTargetInfluences[i]=Math.min(.25,m.morphTargetInfluences[i]);}
  if(!manual){setShape('eyeBlinkLeft',attention.blinkL);setShape('eyeBlinkRight',attention.blinkR);}
  if(!frozenTime){state.textContent=talking?'Speaking preview':listening?'Listening preview':'Ready';document.getElementById('listen').textContent=listening?'Return to quiet idle':'Preview attentive listening';}
  renderer.render(scene,camera);
  if(!notifiedReady){notifiedReady=true;window.cveatAvatarStatus?.('ready',{progress:100});}
}
function updateRendering(){const running=parentActive&&!document.hidden;renderer.setAnimationLoop(running?frame:null);lastFrame=performance.now();}
window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='cveat-avatar-active'){parentActive=!!event.data.active;updateRendering();}});
document.addEventListener('visibilitychange',updateRendering);
updateRendering();
onresize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)};

window.addEventListener('pageshow',updateRendering);
window.addEventListener('pagehide',event=>{
 renderer.setAnimationLoop(null);if(event.persisted)return;window.cveatAvatarClosing=true;
 const geometries=new Set(),materials=new Set(),textures=new Set();
 scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
 for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();
 environment.dispose();scene.background?.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();
});
