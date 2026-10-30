// Keep expressive diagnostic targets separate from normal interviewer speech.
export function safeFacialPose(input, manualName=null) {
  const result={...input};
  result.tongueOut=0;
  if(manualName==='tongueOut') {
    const amount=Math.min(.35,Math.max(0,input.tongueOut||0));
    result.tongueOut=amount;result.jawOpen=Math.max(result.jawOpen||0,amount>0?.30+amount*.35:0);
  }
  if(manualName==='viseme_TH'&&(result.viseme_TH||0)>.05)
    result.jawOpen=Math.max(result.jawOpen||0,result.viseme_TH*.28);
  return result;
}
export function estimateMouthOpening(weights) {
  const factors={jawOpen:1,viseme_aa:.8,viseme_E:.45,viseme_I:.35,viseme_O:.65,viseme_U:.35,viseme_CH:.3,viseme_DD:.2,viseme_kk:.25,viseme_nn:.15,viseme_RR:.2,viseme_SS:.1,viseme_TH:.3};
  return Math.min(1,Object.entries(factors).reduce((s,[n,k])=>s+(weights[n]||0)*k,0));
}
