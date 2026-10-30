// Same-origin status bridge: errors must not interrupt the interview controller.
(() => {
 const emit=(status,detail={})=>{if(window.cveatAvatarClosing)return;if(parent!==window)parent.postMessage({type:'cveat-avatar-status',status,...detail},location.origin)};
 window.cveatAvatarStatus=emit;
 window.addEventListener('error',()=>emit('error'),true);
 window.addEventListener('unhandledrejection',()=>emit('error'));
 window.addEventListener('webglcontextlost',()=>emit('error'),true);
 emit('loading',{progress:0});
})();
