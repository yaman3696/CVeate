import * as T from 'three';
// Reuse the embedded clips; no live arm solver or extra animation download.
export class GesturePlayback {
 constructor(root,clips){this.mixer=new T.AnimationMixer(root);this.actions=new Map(clips.map(c=>{const a=this.mixer.clipAction(c);a.play();return[c.name,a]}));}
 poseAt(bodyTime,speechTime,activity,enabled,plan,context={}){
  for(const a of this.actions.values()){a.enabled=true;a.setEffectiveWeight(0);}
  let gesture=null;
  if(enabled&&activity>.001)gesture=plan.gestures.find(g=>speechTime>=g.start&&speechTime<=g.start+g.duration);
  const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x)};
  const weight=gesture?activity*smooth((speechTime-gesture.start)/.4)*smooth((gesture.start+gesture.duration-speechTime)/.55):0;
  const base=this.actions.get(context.listening?'InterviewListening':'InterviewIdle');
  base.time=enabled?(context.listening?context.listeningTime:bodyTime)%base.getClip().duration:0;base.setEffectiveWeight(1-weight);
  if(gesture){const a=this.actions.get(gesture.clip);a.time=speechTime-gesture.start;a.setEffectiveWeight(weight);}
  this.mixer.update(0);
  this.diagnostics={gesture:gesture?.clip||null,weight,base:base.getClip().name};
 }
}
