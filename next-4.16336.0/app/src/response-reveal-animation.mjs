import { RESPONSE_FADE_MS } from './response-reveal-model.mjs';

// One motion observer per message, not per word. Each node owns only its own
// animation; a remount resumes the originally scheduled instant, never restarts.
export function createResponseRevealAnimations() {
  const active = new Map();
  let view, media, observer;
  const reduced = () => media?.matches || view?.document.documentElement.dataset.reduceMotion === 'true' || view?.document.documentElement.dataset.localMotion === 'reduce';
  const stopForMotion = () => {
    if (!reduced()) return;
    for (const [node, record] of active) { record.entry.done = true; record.animation.cancel(); active.delete(node); }
  };
  const detach = () => {
    observer?.disconnect();observer = null;
    media?.removeEventListener('change',stopForMotion);
    view?.removeEventListener('local-motion-change',stopForMotion);
    view = null;media = null;
  };
  return {
    bind(node, entry) {
      if (!node || !entry || entry.done || typeof node.animate !== 'function') return () => {};
      if (!view) {
        view = node.ownerDocument.defaultView;
        media = view.matchMedia('(prefers-reduced-motion: reduce)');
        media.addEventListener('change',stopForMotion);view.addEventListener('local-motion-change',stopForMotion);
        observer = new view.MutationObserver(stopForMotion);
        observer.observe(view.document.documentElement,{attributes:true,attributeFilter:['data-reduce-motion','data-local-motion']});
      }
      const now = view.performance.now();
      if (reduced() || now >= entry.startsAt + RESPONSE_FADE_MS) { entry.done = true; return () => {}; }
      let animation;
      try {
        animation = node.animate([{opacity:0},{opacity:1}],{duration:RESPONSE_FADE_MS,easing:'linear',fill:'backwards'});
        const timeline = node.ownerDocument.timeline?.currentTime;
        if (typeof timeline === 'number') animation.startTime = timeline + entry.startsAt - now;
        else animation.currentTime = now - entry.startsAt;
      } catch { return () => {}; }
      const record = {animation,entry};active.set(node,record);
      animation.onfinish = () => { if (active.get(node) === record) active.delete(node); };
      return () => { animation.onfinish = null;animation.cancel();if(active.get(node) === record)active.delete(node); };
    },
    dispose() { for (const record of active.values()) { record.animation.onfinish=null;record.animation.cancel(); }active.clear();detach(); },
  };
}
