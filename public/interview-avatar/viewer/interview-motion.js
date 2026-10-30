import * as T from 'three';
const V = T.Vector3, Q = T.Quaternion;
const clamp = T.MathUtils.clamp;
const ease = x => { x = clamp(x, 0, 1); return x*x*x*(x*(x*6-15)+10); };
const random = seed => { const n = Math.sin(seed*127.1+311.7)*43758.5453123; return n-Math.floor(n); };
const drift = (t, period, seed) => {
  const k = Math.floor(t/period), a = random(seed+k)*2-1, b = random(seed+k+1)*2-1;
  return T.MathUtils.lerp(a, b, ease(t/period-k));
};
// Preparation, a short expressive stroke, a soft hold, then a slower return.
export function gestureEnvelope(t, start, duration) {
  const u = (t-start)/duration;
  if (u <= 0 || u >= 1) return 0;
  if (u < .4) return ease(u/.4);
  if (u < .58) return 1-.07*ease((u-.4)/.18);
  return .93*(1-ease((u-.58)/.42));
}
export const GESTURE_LIBRARY={
  open:{clip:'GestureOpenRight',side:'R',duration:3.2,height:.062,width:.022,reach:.019,roll:-.82,strength:1},
  beat:{clip:'GestureBeatLeft',side:'L',duration:2.65,height:.027,width:.008,reach:-.012,roll:-.22,strength:1},
  settle:{clip:'GestureSettleRight',side:'R',duration:2.9,height:.014,width:-.009,reach:-.006,roll:-.10,strength:1}
};
export function makeSpeechPlan(cues = []) {
  const duration=cues.length?Math.max(...cues.map(c=>c.end)):8;
  const candidates=cues.filter(c=>'CDEF'.includes(c.value)&&c.end-c.start>=.10);
  const gestures=[];let nextBeat=4.05;
  for(const cue of candidates) {
    const beat=(cue.start+cue.end)/2;
    if(beat<nextBeat||beat>duration-1.05)continue;
    const i=gestures.length,kind=i===0?'open':i%3===1?'beat':i%3===2?'settle':'open';
    const pose=GESTURE_LIBRARY[kind],start=Math.max(.3,beat-pose.duration*.4);
    if(start+pose.duration>duration-.25)continue;
    gestures.push({...pose,kind,start,beat});
    nextBeat=beat+6.6+random(i+73)*2.0;
  }
  if(!cues.length) {const p=GESTURE_LIBRARY.open;gestures.push({...p,kind:'open',start:3.1,beat:3.1+p.duration*.4});}
  return{duration,gestures,pauses:cues.filter(c=>c.value==='X'&&c.end-c.start>.16)};
}

export class InterviewMotion {
  constructor(root) {
    this.root=root; this.bones=new Map();
    root.traverse(o=>{if(o.name&&/^(head|neck|spine|clavicle|shoulder|upperarm|lowerarm|wrist|finger)/.test(o.name))
      this.bones.set(o.name.replace(/([a-z0-9])([LR])$/,'$1.$2'),o);});
    this.rest=new Map([...this.bones].map(([n,o])=>[n,{q:o.quaternion.clone(),p:o.position.clone()}]));
    this.motionNames=[...this.bones.keys()]; this.plan=makeSpeechPlan(); this.smoothed=new Map();
    this.blinks=[];
    let time=-2;
    for(let i=0;i<850;i++) {
      time+=2.7+random(i+71)*3.7;
      this.blinks.push({time,close:.065+random(i+91)*.025,hold:.025,open:.10+random(i+101)*.035});
      if(random(i+121)>.93)this.blinks.push({time:time+.29,close:.065,hold:.015,open:.10});
    }
    this.blinks.sort((a,b)=>a.time-b.time);
    this.diagnostics={};
  }
  setSpeechCues(cues) { this.plan=makeSpeechPlan(cues); }
  local(n,x=0,y=0,z=0) { const b=this.bones.get(n); if(b)b.quaternion.multiply(new Q().setFromEuler(new T.Euler(x,y,z))); }
  setWorldQ(b,q) { const parent=b.parent.getWorldQuaternion(new Q()).invert(); b.quaternion.copy(parent.multiply(q)); this.root.updateMatrixWorld(true); }
  aim(b,child,target) {
    const a=b.getWorldPosition(new V()), current=child.getWorldPosition(new V()).sub(a).normalize();
    const desired=target.clone().sub(a).normalize();
    this.setWorldQ(b,new Q().setFromUnitVectors(current,desired).multiply(b.getWorldQuaternion(new Q())));
  }
  arm(side,target,palm=0,yaw=0) {
    const s=side==='L'?1:-1, a=this.bones.get('upperarm01.'+side), b=this.bones.get('lowerarm01.'+side), c=this.bones.get('wrist.'+side);
    if(!a||!b||!c)return;
    const ap=a.getWorldPosition(new V()), bp=b.getWorldPosition(new V()), cp=c.getWorldPosition(new V());
    const l1=ap.distanceTo(bp), l2=bp.distanceTo(cp), dir=target.clone().sub(ap);
    const distance=clamp(dir.length(),Math.abs(l1-l2)+.002,l1+l2-.002);dir.normalize();
    const pole=new V(s*.75,-.25,-.65);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
    const x=(l1*l1-l2*l2+distance*distance)/(2*distance), h=Math.sqrt(Math.max(0,l1*l1-x*x));
    this.aim(a,b,ap.clone().addScaledVector(dir,x).addScaledVector(pole,h));this.aim(b,c,target);
    const y=new V(-s*.33+yaw,.01,.94).normalize(), xx=new V(0,-s,0);xx.addScaledVector(y,-xx.dot(y)).normalize();
    const z=new V().crossVectors(xx,y).normalize();
    const q=new Q().setFromRotationMatrix(new T.Matrix4().makeBasis(xx,y,z));
    q.multiply(new Q().setFromAxisAngle(new V(0,1,0),s*palm));this.setWorldQ(c,q);
  }
  attention(t,activity=0,speechTime=0,context={}) {
    let blinkL=0,blinkR=0;
    for(const b of this.blinks) {
      if(b.time>t+.25)break;
      if(b.time+b.close+b.hold+b.open<t-.03)continue;
      const sample=offset=>{
        const u=t-b.time-offset;
        if(u<0)return 0;
        if(u<b.close)return ease(u/b.close);
        if(u<b.close+b.hold)return 1;
        return 1-ease((u-b.close-b.hold)/b.open);
      };
      blinkL=Math.max(blinkL,sample(0));blinkR=Math.max(blinkR,sample(.008));
    }
    let emphasis=0;
    for(const g of this.plan.gestures)emphasis=Math.max(emphasis,gestureEnvelope(speechTime,g.start+.16,g.duration*.66)*activity);
    const headYaw=this.diagnostics.headYaw||0;
    // Small gaze adjustments lead the head drift; compensate for its slow turn.
    let gazeX=.035*drift(t+.13,3.65,201)-headYaw*1.1;
    let gazeY=.018*drift(t+.09,4.8,231);
    const glance=gestureEnvelope(t,Math.floor(t/19)*19+12.2,1.1);
    if(activity<.15) {gazeX-=.055*glance;gazeY-=.045*glance;}
    const greeting=activity*gestureEnvelope(speechTime,0,1.8);const acknowledgement=context.listening?clamp((this.diagnostics.nod||0)/.023,0,1):0;
    return {blinkL,blinkR,gazeX:clamp(gazeX,-.08,.08),gazeY:clamp(gazeY,-.065,.065),
      brow:.006+.025*emphasis+.01*greeting+.008*acknowledgement,smile:.042*(1-activity)+.012*activity+.035*greeting+.012*acknowledgement,
      cheek:.012*(1-activity)+.012*greeting+.008*acknowledgement,emphasis};
  }
  apply(t,speaking=false,amount=1,gestureTime=t,context={}) {
    for(const[n,b]of this.bones){const r=this.rest.get(n);b.quaternion.copy(r.q);b.position.copy(r.p);}
    const activity=clamp(typeof speaking==='number'?speaking:(speaking?1:0),0,1);
    const breath=Math.sin(t*1.27)+.14*Math.sin(t*.43+.8);
    const posture=drift(t,9.3,31)*amount;
    this.local('spine01',.0035*breath*amount,.003*posture,.0035*posture);
    this.local('spine02',.0025*breath*amount,-.0015*posture,0);
    let nod=0;
    for(const g of this.plan.gestures)nod+=.014*gestureEnvelope(gestureTime,g.beat-.12,.68)*activity;
    const listeningTime=context.listeningTime??t;
    if(context.listening&&activity<.15) {
      const block=Math.floor(listeningTime/10.7),start=block*10.7+2.4+random(block+61)*2;
      nod+=.023*gestureEnvelope(listeningTime,start,.95);
      nod-=.004*gestureEnvelope(listeningTime,start+.48,1.05);
    }
    const headYaw=.014*drift(t,6.1,58)*amount;
    this.local('neck01',(.003*drift(t,7.1,42)+nod*.22)*amount,headYaw*.24,0);
    this.local('neck02',nod*.22*amount,headYaw*.25,.004*drift(t,8.4,49)*amount);
    this.local('head',(nod*.56+.003*drift(t,5.7,63))*amount,headYaw*.51,.005*drift(t,7.6,88)*amount);
    for(const side of ['L','R']){const s=side==='L'?1:-1;this.local('clavicle.'+side,0,0,s*(.0046*breath+.0007*drift(t,5,side==='L'?91:93))*amount);}
    this.root.updateMatrixWorld(true);
    const handTargets={};
    for(const side of ['L','R']) {
      const s=side==='L'?1:-1;
      const target=new V(side==='L'?.178:-.191,1.117,side==='L'?.322:.302);
      let palm=side==='L'?.025:-.018, openness=0,stroke=0,yaw=0;
      for(const g of this.plan.gestures) {
        if(g.side!==side)continue;
        const envelope=gestureEnvelope(gestureTime,g.start,g.duration)*activity*amount*g.strength;
        const trail=Math.min(gestureEnvelope(gestureTime-.065,g.start,g.duration)*activity*amount*g.strength,envelope*1.05);
        const prepare=gestureEnvelope(gestureTime+.075,g.start,g.duration)*activity*amount*g.strength;
        target.x+=s*g.width*envelope;target.y+=g.height*envelope;target.z-=g.reach*envelope;
        palm+=g.roll*trail;openness=Math.max(openness,prepare);stroke=Math.max(stroke,envelope);
        yaw+=s*.04*trail;
      }
      if(context.dt!==undefined) {
        const old=this.smoothed.get(side)||target.clone();
        old.lerp(target,1-Math.exp(-13*Math.max(0,context.dt)));this.smoothed.set(side,old);target.copy(old);
      } else this.smoothed.delete(side);
      handTargets[side]=target.toArray();this.arm(side,target,palm,yaw);
      this.local(`finger1-1.${side}`,-.45+.075*openness,0,0);
      for(let f=2;f<=5;f++) {
        const variation=[0,.013,-.008,.021][f-2];
        this.local(`finger${f}-1.${side}`,0,0,-s*(.07+variation-.025*openness));
        this.local(`finger${f}-2.${side}`,0,0,-s*(.12+variation-.035*openness));
        this.local(`finger${f}-3.${side}`,0,0,-s*(.075+variation*.4));
      }
    }
    // Bring the fingers closer to a relaxed group rather than the source spread pose.
    this.root.updateMatrixWorld(true);
    for(const side of ['L','R']) {
      const wrist=this.bones.get('wrist.'+side),middle=this.bones.get('finger3-3.'+side);
      if(!wrist||!middle)continue;
      const inverse=wrist.matrixWorld.clone().invert();
      const center=middle.getWorldPosition(new V()).applyMatrix4(inverse);
      for(const f of [2,4,5]) {
        const proximal=this.bones.get(`finger${f}-1.${side}`),tip=this.bones.get(`finger${f}-3.${side}`);
        if(!proximal||!tip)continue;
        const target=tip.getWorldPosition(new V()).applyMatrix4(inverse);
        target.z=center.z+(target.z-center.z)*.78;
        target.applyMatrix4(wrist.matrixWorld);this.aim(proximal,tip,target);
      }
    }
    this.root.updateMatrixWorld(true);
    this.diagnostics={headYaw,nod,activity,handTargets,gestureTime,listening:!!context.listening};
  }
}
