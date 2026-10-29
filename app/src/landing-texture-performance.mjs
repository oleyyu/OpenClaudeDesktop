export function landingRenderViewport(viewport, maxPixels) {
  const { deviceWidth, deviceHeight, devicePixelRatio } = viewport;
  if (!(deviceWidth > 0 && deviceHeight > 0 && devicePixelRatio > 0)) return viewport;
  const scale = Math.min(1, 1.5 / devicePixelRatio, Math.sqrt(maxPixels / (deviceWidth * deviceHeight)));
  return {
    ...viewport,
    deviceWidth: Math.floor(deviceWidth * scale),
    deviceHeight: Math.floor(deviceHeight * scale),
    devicePixelRatio: devicePixelRatio * scale,
  };
}

export function configureLandingPerformance(config) {
  config.grid.maxDevicePixels = 2_073_600;
  config.power.frameMs = 1000 / 60;
  // Synchronize ambient motion and ripples to the same display frame.
  config.power.rippleFrameMs = config.power.frameMs;
  config.power.budgetS = 30;
  return config;
}

export function createLandingFrameLoop(win, draw, options = {}) {
  const doc = win.document;
  let running = false, dead = false, frame, drawing = false;
  let elapsed = 0, previous = 0, nextFrame, stalls = 0, late = [];
  const allowed = () => running && !dead && !doc.hidden && doc.hasFocus() && (options.allowed?.() ?? true);
  const cancel = () => {
    if (frame !== undefined) win.cancelAnimationFrame(frame);
    frame = undefined;
  };
  const schedule = () => { if (allowed() && frame === undefined) frame = win.requestAnimationFrame(tick); };
  function tick(timestamp) {
    frame = undefined;
    if (!allowed()) return;
    const now = win.performance.now();
    const interval = options.intervalMs?.() ?? 1000 / 60;
    if (nextFrame === undefined || timestamp >= nextFrame - Math.min(2, interval / 4)) {
      drawing = true;
      try {
        late = [...late.slice(-9), now - timestamp > 17];
        if (late.filter(Boolean).length >= 5) { late = []; options.onLate?.(); }
        elapsed += Math.min(now - previous, 250);
        previous = now;
        // Advance the deadline, not the last callback time: small vsync jitter must not skip a whole frame.
        nextFrame = (nextFrame ?? timestamp) + interval;
        if (nextFrame < timestamp) nextFrame = timestamp + interval;
        draw(elapsed / 1000);
        stalls = win.performance.now() - Math.max(timestamp, now) > 50 ? stalls + 1 : 0;
        if (stalls >= 3) { stalls = 0; options.onStall?.(); }
      } finally { drawing = false; }
    }
    schedule();
  }
  const refresh = () => {
    if (drawing) return;
    if (!allowed()) cancel();
    else if (frame === undefined) { previous = win.performance.now(); nextFrame = undefined; schedule(); }
  };
  doc.addEventListener('visibilitychange', refresh);
  win.addEventListener('focus', refresh);
  win.addEventListener('blur', refresh);
  return {
    redraw: () => { if (!dead) draw(elapsed / 1000); },
    setRunning: value => { running = value; refresh(); },
    refresh,
    kill: () => { dead = true; cancel(); },
    destroy: () => {
      dead = true; cancel();
      doc.removeEventListener('visibilitychange', refresh);
      win.removeEventListener('focus', refresh);
      win.removeEventListener('blur', refresh);
    },
  };
}
