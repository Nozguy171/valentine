import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./app.css";

const SCREENS = {
  RAIN: "RAIN",
  BUNNY: "BUNNY",
  QUESTION: "QUESTION",
  SUCCESS: "SUCCESS",
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.RAIN);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const heartsRef = useRef([]);

  const buttonsAreaRef = useRef(null);

  const [noBtnStyle, setNoBtnStyle] = useState(null);
  const [noCount, setNoCount] = useState(0);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const start = useCallback(() => {
    if (screen !== SCREENS.RAIN) return;

    setScreen(SCREENS.BUNNY);

    window.setTimeout(() => {
      setScreen(SCREENS.QUESTION);
    }, 4400);
  }, [screen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const heartGlyphs = ["💕", "💖", "💗", "💝", "💞"];

    const TARGET_DENSITY = 9000;
    const MAX_CAP = 260;
    const SPAWN_PER_SEC = 18;

    let spawnAcc = 0;

    const spawnHeart = (w, yMin = -80, yMax = -20) => {
      heartsRef.current.push({
        x: rand(0, w),
        y: rand(yMin, yMax),
        vy: rand(1.0, 2.8),
        vx: rand(-0.45, 0.45),
        size: rand(16, 30),
        rot: rand(-0.25, 0.25),
        glyph: pick(heartGlyphs),
        wobble: rand(0.8, 2.2),
        phase: rand(0, Math.PI * 2),
      });
    };

    const seedHearts = (w, h) => {
      if (heartsRef.current.length > 0) return;

      const ideal = Math.floor((w * h) / TARGET_DENSITY);
      const initial = Math.max(120, Math.min(220, ideal));

      for (let i = 0; i < initial; i++) spawnHeart(w, 0, h);
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (screen === SCREENS.RAIN && !prefersReducedMotion) seedHearts(w, h);
    };

    let last = performance.now();

    const tick = (t) => {
      rafRef.current = requestAnimationFrame(tick);

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      if (screen !== SCREENS.RAIN || prefersReducedMotion) {
        ctx.clearRect(0, 0, w, h);
        return;
      }

      const dt = Math.min(32, t - last);
      last = t;

      ctx.clearRect(0, 0, w, h);

      const idealCap = Math.floor((w * h) / TARGET_DENSITY);
      const cap = Math.max(160, Math.min(MAX_CAP, idealCap));

      spawnAcc += (SPAWN_PER_SEC * dt) / 1000;
      const spawnCount = Math.floor(spawnAcc);
      spawnAcc -= spawnCount;

      for (let i = 0; i < spawnCount; i++) spawnHeart(w);

      let bottomCount = 0;
      const bottomLine = h * 0.65;
      for (const hh of heartsRef.current) if (hh.y > bottomLine) bottomCount++;

      if (bottomCount < 18) {
        const need = Math.min(4, 18 - bottomCount);
        for (let i = 0; i < need; i++) spawnHeart(w, h * 0.55, h);
      }

      for (const heart of heartsRef.current) {
        heart.y += heart.vy * (dt / 16);
        heart.x += heart.vx * (dt / 16) + Math.sin(t * 0.002 + heart.phase) * heart.wobble * 0.2;

        ctx.save();
        ctx.translate(heart.x, heart.y);
        ctx.rotate(heart.rot);
        ctx.font = `${heart.size}px "Press Start 2P", system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.85;
        ctx.fillText(heart.glyph, 2, 2);
        ctx.globalAlpha = 1;
        ctx.fillText(heart.glyph, 0, 0);
        ctx.restore();
      }

      heartsRef.current = heartsRef.current.filter((h0) => h0.y < h + 140);
      if (heartsRef.current.length > cap) heartsRef.current.splice(0, heartsRef.current.length - cap);
    };

    resize();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [screen, prefersReducedMotion]);

  const rand = (min, max) => Math.random() * (max - min) + min;

  const placeNoFarFromYes = useCallback(() => {
    const area = buttonsAreaRef.current;
    if (!area) return;

    const pad = 10;
    const margin = 20;

    const areaRect = area.getBoundingClientRect();
    const noEl = area.querySelector(".no-btn");
    const yesEl = area.querySelector(".yes-btn");

    const btnW = noEl?.offsetWidth ?? 120;
    const btnH = noEl?.offsetHeight ?? 56;

    const yesRectAbs = yesEl?.getBoundingClientRect();
    const yes = yesRectAbs
      ? {
          x: yesRectAbs.left - areaRect.left,
          y: yesRectAbs.top - areaRect.top,
          w: yesRectAbs.width,
          h: yesRectAbs.height,
        }
      : null;

    const maxX = Math.max(pad, areaRect.width - btnW - pad);
    const maxY = Math.max(pad, areaRect.height - btnH - pad);

    const intersectsForbidden = (x, y) => {
      if (!yes) return false;

      const fx = yes.x - margin;
      const fy = yes.y - margin;
      const fw = yes.w + margin * 2;
      const fh = yes.h + margin * 2;

      const nx = x;
      const ny = y;
      const nw = btnW;
      const nh = btnH;

      return nx < fx + fw && nx + nw > fx && ny < fy + fh && ny + nh > fy;
    };

    let x = pad;
    let y = pad;
    let tries = 0;

    do {
      x = rand(pad, maxX);
      y = rand(pad, maxY);
      tries++;
    } while (intersectsForbidden(x, y) && tries < 40);

    if (tries >= 40 && yes) {
      x = Math.min(maxX, yes.x + yes.w + margin);
      y = Math.min(maxY, yes.y + yes.h + margin);
    }

    setNoBtnStyle({
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      transform: "none",
    });

    setNoCount((c) => c + 1);
  }, []);

  const onYes = () => setScreen(SCREENS.SUCCESS);

  const onNo = () => {
    placeNoFarFromYes();
  };

  const resetToStart = () => {
    heartsRef.current = [];
    setNoBtnStyle(null);
    setNoCount(0);
    setScreen(SCREENS.RAIN);
  };

  return (
    <div className="app-root">
      <section className={`screen ${screen === SCREENS.RAIN ? "active" : ""}`} onPointerDown={start}>
        <canvas ref={canvasRef} className="heart-canvas" />
        <div className="content">
          <h1 className="pixel-title">💕 San Valentin 💕</h1>
          <p className="pixel-subtitle">Toca / haz click para comenzar…</p>
          <button className="game-btn ghost-btn" type="button" onPointerDown={start}>
            Start ▶
          </button>
        </div>
      </section>

      <section className={`screen ${screen === SCREENS.BUNNY ? "active" : ""}`}>
        <div className="content">
<video className="bunny-video" src="/conejtio.webm" autoPlay muted loop playsInline />

          <div className="hint">Cargando…</div>
        </div>
      </section>

      <section className={`screen ${screen === SCREENS.QUESTION ? "active" : ""}`}>
        <div className="content">
          <div className="question-box">
            <h2 className="question-text">¿Quieres ser mi San Valentin?</h2>

            <div className="buttons-area" ref={buttonsAreaRef}>
              <button className="game-btn yes-btn" onClick={onYes}>
                SÍ
              </button>

              <button className="game-btn no-btn" style={noBtnStyle ?? undefined} onPointerDown={onNo}>
                {noCount >= 4 ? "AY NO 😭" : "NO"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={`screen ${screen === SCREENS.SUCCESS ? "active" : ""}`}>
        <div className="content">
          <div className="success-box">
            <h2 className="success-title">¡Gracias por aceptar! 💕</h2>
            <p className="success-message">Eres la mejor novia del mundo y me haces muy muy muy feliz princesa hermosa.</p>
            <p className="success-message">¡Te amo muchísimo con toda mi alma! 💖</p>

            <div className="hearts-celebration" aria-hidden="true">
              <span className="heart-emoji">💕</span>
              <span className="heart-emoji">💖</span>
              <span className="heart-emoji">💗</span>
              <span className="heart-emoji">💝</span>
              <span className="heart-emoji">💞</span>
            </div>

            <button className="game-btn ghost-btn" onClick={resetToStart}>
              Volver al inicio ↺
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
