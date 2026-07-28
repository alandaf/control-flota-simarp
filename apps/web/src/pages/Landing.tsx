import { useEffect, useRef } from 'react';

// Portada pública de FLOTA. Estilos y marcado aislados bajo `.lp-page`
// (clases prefijadas `lp-` y tokens definidos en el wrapper) para no colisionar
// con los estilos de la app. Los CTA entran a la app por /login.
const HTML = String.raw`
<style>
  .lp-page *, .lp-page *::before, .lp-page *::after { box-sizing: border-box; }
  .lp-page {
    --paper:#f1f2f0; --surface:#ffffff; --surface-2:#e8e9e5; --ink:#191a17; --ink-2:#53554e;
    --ink-3:#8b8d84; --line:#dedfd8; --line-2:#cbccc4; --amber:#c56a10; --amber-2:#9a4f07;
    --amber-text:#9a4f07; --amber-soft:#f6e7d3; --map:#e7e8e3; --map-line:#d5d7cf;
    --lp-sans: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --lp-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    --lp-wrap: 1080px;
    background: var(--paper); color: var(--ink); font-family: var(--lp-sans);
    line-height: 1.6; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: hidden;
  }
  @media (prefers-color-scheme: dark) {
    .lp-page {
      --paper:#101110; --surface:#191a17; --surface-2:#201f1b; --ink:#eef0e9; --ink-2:#a3a599;
      --ink-3:#6c6e63; --line:#272822; --line-2:#34352d; --amber:#f0a73c; --amber-2:#f6c374;
      --amber-text:#f0a73c; --amber-soft:#241c0e; --map:#0e0f0c; --map-line:#211f18;
    }
  }
  :root[data-theme="light"] .lp-page {
    --paper:#f1f2f0; --surface:#ffffff; --surface-2:#e8e9e5; --ink:#191a17; --ink-2:#53554e;
    --ink-3:#8b8d84; --line:#dedfd8; --line-2:#cbccc4; --amber:#c56a10; --amber-2:#9a4f07;
    --amber-text:#9a4f07; --amber-soft:#f6e7d3; --map:#e7e8e3; --map-line:#d5d7cf;
  }
  :root[data-theme="dark"] .lp-page {
    --paper:#101110; --surface:#191a17; --surface-2:#201f1b; --ink:#eef0e9; --ink-2:#a3a599;
    --ink-3:#6c6e63; --line:#272822; --line-2:#34352d; --amber:#f0a73c; --amber-2:#f6c374;
    --amber-text:#f0a73c; --amber-soft:#241c0e; --map:#0e0f0c; --map-line:#211f18;
  }

  .lp-page .lp-wrap { max-width: var(--lp-wrap); margin: 0 auto; padding: 0 22px; }
  .lp-page a { text-decoration: none; }
  .lp-page h1, .lp-page h2, .lp-page h3 { text-wrap: balance; margin: 0; letter-spacing: -.02em; font-weight: 780; }
  .lp-eyebrow { font-family: var(--lp-mono); font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: var(--amber-text); margin: 0 0 14px; }

  .lp-nav { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--paper) 85%, transparent); backdrop-filter: saturate(1.3) blur(10px); border-bottom: 1px solid var(--line); }
  .lp-nav-in { display: flex; align-items: center; gap: 18px; height: 60px; }
  .lp-brand { display: flex; align-items: center; gap: 11px; font-weight: 800; letter-spacing: .02em; font-size: 17px; }
  .lp-mark { width: 28px; height: 28px; flex: 0 0 auto; }
  .lp-brand small { font-family: var(--lp-mono); font-size: 10px; letter-spacing: .16em; color: var(--ink-3); font-weight: 500; text-transform: uppercase; }
  .lp-nav-links { margin-left: auto; display: flex; align-items: center; gap: 6px; }
  .lp-link { font-size: 14px; color: var(--ink-2); padding: 8px 12px; border-radius: 7px; font-weight: 550; }
  .lp-link:hover { color: var(--ink); background: var(--surface-2); }

  .lp-btn { display: inline-flex; align-items: center; gap: 9px; font-family: var(--lp-sans); font-size: 14px; font-weight: 640; padding: 11px 19px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; transition: transform .12s ease, background .15s ease, border-color .15s ease; }
  .lp-btn-primary { background: var(--ink); color: var(--paper); }
  .lp-btn-primary:hover { transform: translateY(-1px); }
  .lp-tick { width: 6px; height: 6px; background: var(--amber); border-radius: 1px; }
  .lp-btn-ghost { background: transparent; color: var(--ink); border-color: var(--line-2); }
  .lp-btn-ghost:hover { background: var(--surface-2); border-color: var(--ink-3); }

  .lp-hero { padding: 66px 0 34px; }
  .lp-hero-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 46px; align-items: center; }
  .lp-hero h1 { font-size: clamp(35px, 5.6vw, 60px); line-height: 1.0; font-weight: 800; }
  .lp-u { background-image: linear-gradient(transparent 66%, var(--amber-soft) 66%); padding: 0 2px; }
  .lp-lead { color: var(--ink-2); font-size: clamp(16px, 1.6vw, 19px); margin: 22px 0 28px; max-width: 33ch; }
  .lp-hero-cta { display: flex; flex-wrap: wrap; gap: 12px; }
  .lp-hero-note { margin-top: 22px; font-family: var(--lp-mono); font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); display: flex; align-items: center; gap: 9px; }
  .lp-live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 0 4px var(--amber-soft); }

  .lp-scene { position: relative; background: var(--map); border: 1px solid var(--line-2); border-radius: 12px; overflow: hidden; }
  .lp-scene svg { display: block; width: 100%; height: auto; }
  .lp-chip { position: absolute; top: 15px; left: 15px; display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line-2); padding: 7px 11px; border-radius: 7px; font-size: 12.5px; font-weight: 620; box-shadow: 0 6px 18px -12px rgba(0,0,0,.5); }
  .lp-eta { font-family: var(--lp-mono); color: var(--amber-text); font-weight: 700; }
  .lp-av { width: 19px; height: 19px; border-radius: 4px; background: var(--amber-soft); color: var(--amber-text); display: grid; place-items: center; font-size: 10px; }

  .lp-page section { padding: 58px 0; }
  .lp-ruled { border-top: 1px solid var(--line); }
  .lp-sec-head { max-width: 46ch; margin-bottom: 32px; }
  .lp-sec-head h2 { font-size: clamp(24px, 3.2vw, 34px); line-height: 1.08; }
  .lp-sec-head p { color: var(--ink-2); margin: 12px 0 0; font-size: 16px; }

  .lp-frame { border: 1px solid var(--line-2); border-radius: 12px; overflow: hidden; background: var(--line); display: grid; gap: 1px; }
  .lp-stats { grid-template-columns: repeat(4, 1fr); }
  .lp-stat { background: var(--surface); padding: 20px; }
  .lp-k { font-family: var(--lp-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); }
  .lp-v { font-size: 16px; font-weight: 720; margin-top: 9px; letter-spacing: -.01em; }
  .lp-d { color: var(--ink-2); font-size: 13.5px; margin-top: 3px; }

  .lp-caps { grid-template-columns: repeat(4, 1fr); }
  .lp-cap { background: var(--surface); padding: 22px; }
  .lp-idx { font-family: var(--lp-mono); font-size: 11px; color: var(--amber-text); letter-spacing: .1em; }
  .lp-ci { color: var(--ink); margin: 14px 0 12px; display: block; }
  .lp-cap h3 { font-size: 15.5px; letter-spacing: -.01em; font-weight: 720; }
  .lp-cap p { color: var(--ink-2); font-size: 13.5px; margin: 6px 0 0; }

  .lp-roles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .lp-role { background: var(--surface); border: 1px solid var(--line-2); border-radius: 10px; padding: 24px; }
  .lp-ic { width: 40px; height: 40px; border-radius: 8px; display: grid; place-items: center; background: var(--amber-soft); color: var(--amber-text); margin-bottom: 16px; }
  .lp-role h3 { font-size: 18px; font-weight: 760; }
  .lp-tag { font-family: var(--lp-mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
  .lp-role p { color: var(--ink-2); font-size: 14.5px; margin: 8px 0 0; }
  .lp-role-extra { margin-top: 16px; display: flex; align-items: center; gap: 12px; color: var(--ink-2); font-size: 14px; background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--amber); border-radius: 8px; padding: 14px 16px; }
  .lp-role-extra b { color: var(--ink); }

  .lp-flow { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; }
  .lp-step { padding: 0 16px; position: relative; }
  .lp-step:not(:last-child)::after { content: ""; position: absolute; top: 16px; left: 50%; right: -50%; height: 1px; background: repeating-linear-gradient(90deg, var(--line-2) 0 7px, transparent 7px 13px); }
  .lp-n { width: 34px; height: 34px; border-radius: 50%; background: var(--surface); border: 2px solid var(--amber); color: var(--ink); font-family: var(--lp-mono); font-weight: 700; font-size: 13px; display: grid; place-items: center; position: relative; z-index: 1; }
  .lp-step h3 { font-size: 15px; margin-top: 16px; font-weight: 720; }
  .lp-step p { color: var(--ink-2); font-size: 13px; margin: 6px 0 0; }

  .lp-why-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .lp-why { display: flex; gap: 16px; background: var(--surface); border: 1px solid var(--line-2); border-radius: 10px; padding: 22px; }
  .lp-wi { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 8px; display: grid; place-items: center; background: var(--surface-2); color: var(--ink); }
  .lp-why h3 { font-size: 16px; font-weight: 740; }
  .lp-why p { color: var(--ink-2); font-size: 14px; margin: 6px 0 0; }

  .lp-tech { text-align: center; }
  .lp-tech .lp-eyebrow { margin-bottom: 18px; }
  .lp-tech-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px 10px; }
  .lp-tech-list span { font-family: var(--lp-mono); font-size: 12.5px; color: var(--ink-2); background: var(--surface); border: 1px solid var(--line-2); padding: 7px 13px; border-radius: 6px; }

  .lp-cta-band { background: var(--surface); border: 1px solid var(--line-2); border-top: 3px solid var(--amber); border-radius: 12px; padding: 46px; text-align: center; }
  .lp-cta-band h2 { font-size: clamp(24px, 3.4vw, 36px); }
  .lp-cta-band p { color: var(--ink-2); margin: 12px auto 26px; max-width: 46ch; }
  .lp-cta-band .lp-hero-cta { justify-content: center; }

  .lp-footer { border-top: 1px solid var(--line); padding: 30px 0 46px; margin-top: 18px; }
  .lp-footer-in { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; justify-content: space-between; }
  .lp-meta { font-size: 13px; color: var(--ink-3); font-family: var(--lp-mono); letter-spacing: .04em; }

  .lp-graticule { stroke: var(--map-line); stroke-width: 1; }
  .lp-route-glow { stroke: var(--amber); stroke-width: 10; opacity: .14; fill: none; stroke-linecap: round; }
  .lp-route { stroke: var(--amber); stroke-width: 3.5; fill: none; stroke-linecap: round; }
  .lp-route-done { stroke: var(--ink); stroke-width: 2; fill: none; stroke-linecap: round; stroke-dasharray: 2 7; opacity: .5; }
  .lp-pin-pulse { fill: var(--amber); transform-box: fill-box; transform-origin: center; animation: lp-pulse 2.4s ease-out infinite; }
  .lp-car-body { fill: var(--surface); stroke: var(--amber); stroke-width: 2.5; }
  .lp-car-eye { fill: var(--amber); }
  @keyframes lp-pulse { 0% { transform: scale(.6); opacity: .85; } 70%,100% { transform: scale(2.6); opacity: 0; } }

  @media (max-width: 880px) {
    .lp-hero-grid { grid-template-columns: 1fr; gap: 30px; }
    .lp-hero { padding: 40px 0 14px; }
    .lp-stats, .lp-caps { grid-template-columns: repeat(2, 1fr); }
    .lp-roles { grid-template-columns: 1fr; }
    .lp-flow { grid-template-columns: 1fr 1fr; gap: 26px 0; }
    .lp-step:not(:last-child)::after { display: none; }
    .lp-why-grid { grid-template-columns: 1fr; }
    .lp-nav-links .lp-link { display: none; }
  }
  @media (max-width: 480px) {
    .lp-stats, .lp-caps { grid-template-columns: 1fr; }
    .lp-flow { grid-template-columns: 1fr; }
    .lp-cta-band { padding: 32px 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lp-pin-pulse { animation: none; }
    .lp-btn:hover { transform: none; }
  }
</style>

<header class="lp-nav">
  <div class="lp-wrap lp-nav-in">
    <div class="lp-brand">
      <svg class="lp-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--ink)"/>
        <path d="M9 22C12 18 12 13 16 13C20 13 20 9 23 9" stroke="var(--amber)" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <circle cx="9" cy="22" r="3" fill="var(--amber)"/><circle cx="23" cy="9" r="3" fill="var(--paper)"/>
      </svg>
      <div>FLOTA <small>por SIMARP</small></div>
    </div>
    <nav class="lp-nav-links">
      <a class="lp-link" href="#producto">Producto</a>
      <a class="lp-link" href="#como">Cómo funciona</a>
      <a class="lp-link" href="#porque">Por qué FLOTA</a>
      <a class="lp-btn lp-btn-primary" href="/login"><span class="lp-tick"></span>Ingresar</a>
    </nav>
  </div>
</header>

<section class="lp-hero">
  <div class="lp-wrap lp-hero-grid">
    <div>
      <p class="lp-eyebrow">Transporte corporativo · en producción</p>
      <h1>El control total de tu flota, <span class="lp-u">en tiempo real.</span></h1>
      <p class="lp-lead">Solicitud, asignación, navegación y facturación — de punta a punta. La experiencia de Uber, hecha para las empresas que trasladan a su gente.</p>
      <div class="lp-hero-cta">
        <a class="lp-btn lp-btn-primary" href="/login"><span class="lp-tick"></span>Ingresar a la plataforma</a>
        <a class="lp-btn lp-btn-ghost" href="#como">Cómo funciona</a>
      </div>
      <p class="lp-hero-note"><span class="lp-live-dot"></span>Plataforma en producción · operación en vivo</p>
    </div>

    <div class="lp-scene" aria-label="Seguimiento de un viaje en vivo sobre el mapa">
      <div class="lp-chip"><span class="lp-av">▲</span> Conductor en camino · <span class="lp-eta">ETA 4 min</span></div>
      <svg viewBox="0 0 640 440" role="img" aria-hidden="true">
        <defs>
          <pattern id="lpgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" class="lp-graticule" fill="none"/></pattern>
          <path id="lproute" d="M78,372 C168,338 150,250 240,236 C316,224 314,150 398,150 C470,150 486,104 566,74"/>
        </defs>
        <rect width="640" height="440" fill="url(#lpgrid)"/>
        <use href="#lproute" class="lp-route-glow"/>
        <use href="#lproute" class="lp-route"/>
        <path d="M78,372 C168,338 150,250 240,236" class="lp-route-done"/>
        <circle cx="78" cy="372" r="9" class="lp-pin-pulse"/>
        <circle cx="78" cy="372" r="6" fill="var(--amber)" stroke="var(--surface)" stroke-width="2.5"/>
        <g transform="translate(566,74)">
          <path d="M0,-16 C9,-16 15,-9 15,-1 C15,8 0,20 0,20 C0,20 -15,8 -15,-1 C-15,-9 -9,-16 0,-16 Z" fill="var(--ink)"/>
          <circle cx="0" cy="-1" r="5" fill="var(--paper)"/>
        </g>
        <g class="lp-car">
          <circle class="lp-car-body" cx="0" cy="0" r="12"/>
          <circle class="lp-car-eye" cx="0" cy="0" r="4"/>
          <animateMotion class="lp-car-anim" dur="6s" repeatCount="indefinite" rotate="auto" keyPoints="0.28;1" keyTimes="0;1" calcMode="linear"><mpath href="#lproute"/></animateMotion>
        </g>
      </svg>
    </div>
  </div>
</section>

<section id="producto" style="padding-top:26px">
  <div class="lp-wrap">
    <div class="lp-frame lp-stats">
      <div class="lp-stat"><div class="lp-k">Tiempo real</div><div class="lp-v">Seguimiento + ETA</div><div class="lp-d">Ves el auto acercarse, minuto a minuto.</div></div>
      <div class="lp-stat"><div class="lp-k">Ruteo real</div><div class="lp-v">La ruta más corta</div><div class="lp-d">Por calle, no en línea recta.</div></div>
      <div class="lp-stat"><div class="lp-k">Facturación</div><div class="lp-v">Folio por servicio</div><div class="lp-d">Reporte y cobro por empresa.</div></div>
      <div class="lp-stat"><div class="lp-k">Operación</div><div class="lp-v">Alertas en vivo</div><div class="lp-d">El terreno, bajo control.</div></div>
    </div>
  </div>
</section>

<section class="lp-ruled">
  <div class="lp-wrap">
    <div class="lp-sec-head">
      <p class="lp-eyebrow">Una plataforma, tres miradas</p>
      <h2>Cada quien ve exactamente lo que necesita.</h2>
      <p>Pasajero, conductor y administración operan sobre el mismo viaje, en tiempo real.</p>
    </div>
    <div class="lp-roles">
      <div class="lp-role">
        <div class="lp-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg></div>
        <span class="lp-tag">Rol 01</span><h3>Pasajero</h3>
        <p>Pide desde el mapa, ve tarifa y ruta al instante, y sigue a su conductor en vivo con ETA hasta que llega.</p>
      </div>
      <div class="lp-role">
        <div class="lp-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 12l4-2M12 12l-3 3"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg></div>
        <span class="lp-tag">Rol 02</span><h3>Conductor</h3>
        <p>Recibe solicitudes, navega giro a giro con voz y recálculo por desvío, y cierra el servicio de un toque.</p>
      </div>
      <div class="lp-role">
        <div class="lp-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></svg></div>
        <span class="lp-tag">Rol 03</span><h3>Administrador</h3>
        <p>Controla flota, tarifas y empresas. Dashboard con KPIs, mapa en vivo, reportes y centro de operaciones.</p>
      </div>
    </div>
    <div class="lp-role-extra">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="18" rx="1.5"/><path d="M16 8h4v13h-4M8 7h4M8 11h4M8 15h4"/></svg>
      <span><b>+ Portal para la empresa cliente:</b> cada empresa entra con su propio acceso y ve, en modo lectura, sus servicios y montos facturados.</span>
    </div>
  </div>
</section>

<section class="lp-ruled">
  <div class="lp-wrap">
    <div class="lp-sec-head"><p class="lp-eyebrow">Capacidades</p><h2>Todo lo que exige una operación seria.</h2></div>
    <div class="lp-frame lp-caps">
      <div class="lp-cap"><span class="lp-idx">01</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18C7 13 7 8 12 8s5-4 8-4"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="4" r="2"/></svg></span><h3>Ruta más corta real</h3><p>Motor de ruteo por calle (Google o OSRM propio), con respaldo automático.</p></div>
      <div class="lp-cap"><span class="lp-idx">02</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg></span><h3>Navegación con voz</h3><p>Indicaciones giro a giro y recálculo automático si el conductor se desvía.</p></div>
      <div class="lp-cap"><span class="lp-idx">03</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><h3>Seguimiento + ETA</h3><p>Posición del vehículo y tiempo de llegada en vivo, para pasajero y central.</p></div>
      <div class="lp-cap"><span class="lp-idx">04</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M9 8h6M9 12h6"/></svg></span><h3>Facturación B2B</h3><p>Folio por servicio, estado pagado/pendiente y reporte por empresa.</p></div>
      <div class="lp-cap"><span class="lp-idx">05</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></span><h3>Centro de operaciones</h3><p>Alertas en vivo: sin señal GPS, demoras, desvíos y viajes sin tomar.</p></div>
      <div class="lp-cap"><span class="lp-idx">06</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/></svg></span><h3>Dashboard con KPIs</h3><p>Ingresos, viajes, puntualidad y rankings, con reportes exportables.</p></div>
      <div class="lp-cap"><span class="lp-idx">07</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="18" rx="1.5"/><path d="M16 8h4v13h-4"/><path d="M8 7h4M8 11h4"/></svg></span><h3>Empresas y tarifas</h3><p>Tarifas negociadas por contrato y centros de costo por empresa.</p></div>
      <div class="lp-cap"><span class="lp-idx">08</span><span class="lp-ci"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg></span><h3>PWA instalable</h3><p>Se instala en el celular como app, sin pasar por las tiendas.</p></div>
    </div>
  </div>
</section>

<section id="como" class="lp-ruled">
  <div class="lp-wrap">
    <div class="lp-sec-head"><p class="lp-eyebrow">Cómo funciona</p><h2>Del pedido a la factura, sin una sola llamada.</h2></div>
    <div class="lp-flow">
      <div class="lp-step"><div class="lp-n">1</div><h3>Solicita</h3><p>El pasajero fija origen y destino; ve tarifa y ruta al instante.</p></div>
      <div class="lp-step"><div class="lp-n">2</div><h3>Asigna</h3><p>El conductor acepta y el pasajero lo ve acercarse en el mapa.</p></div>
      <div class="lp-step"><div class="lp-n">3</div><h3>Recoge</h3><p>Navegación giro a giro hasta el punto, con ETA en vivo.</p></div>
      <div class="lp-step"><div class="lp-n">4</div><h3>Viaja</h3><p>Ruta óptima al destino; la central lo ve todo en tiempo real.</p></div>
      <div class="lp-step"><div class="lp-n">5</div><h3>Factura</h3><p>Se emite el folio; queda listo para cobrar a la empresa.</p></div>
    </div>
  </div>
</section>

<section id="porque" class="lp-ruled">
  <div class="lp-wrap">
    <div class="lp-sec-head"><p class="lp-eyebrow">Por qué FLOTA</p><h2>Pensado para el negocio, no solo para el viaje.</h2></div>
    <div class="lp-why-grid">
      <div class="lp-why"><div class="lp-wi"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 10h18M8 18v3M16 18v3"/></svg></div><div><h3>Modelo B2B2C</h3><p>Factura a la empresa cliente, no al pasajero. Contratos, tarifas y reportes por empresa desde el primer día.</p></div></div>
      <div class="lp-why"><div class="lp-wi"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l8-4 8 4v6c0 5-4 8-8 9-4-1-8-4-8-9V7Z"/><path d="M9 12l2 2 4-4"/></svg></div><div><h3>Tus datos, tu infraestructura</h3><p>Autohospedable en tu propio servidor. Sin comisión por viaje y con control total de la información.</p></div></div>
      <div class="lp-why"><div class="lp-wi"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M12 14l4-4"/><circle cx="12" cy="18" r="1.5"/></svg></div><div><h3>Listo para escalar</h3><p>Tiempo real distribuido y motor de ruteo intercambiable. Crece de una operación a muchas sin rehacer nada.</p></div></div>
      <div class="lp-why"><div class="lp-wi"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div><div><h3>Seguro por diseño</h3><p>Sesiones firmadas, freno anti-fuerza-bruta, bitácora de auditoría y respaldos automáticos de la base.</p></div></div>
    </div>
  </div>
</section>

<section class="lp-tech lp-ruled">
  <div class="lp-wrap">
    <p class="lp-eyebrow">Construido sobre tecnología probada</p>
    <div class="lp-tech-list">
      <span>Node · Fastify</span><span>Socket.IO</span><span>PostgreSQL + PostGIS</span><span>Redis</span><span>React · PWA</span><span>Leaflet</span><span>Docker</span>
    </div>
  </div>
</section>

<section style="padding-top:20px">
  <div class="lp-wrap">
    <div class="lp-cta-band">
      <h2>Míralo funcionando.</h2>
      <p>Entra a la plataforma, pide un viaje y sigue al conductor en vivo — como lo haría tu operación real.</p>
      <div class="lp-hero-cta">
        <a class="lp-btn lp-btn-primary" href="/login"><span class="lp-tick"></span>Ingresar a la plataforma</a>
      </div>
    </div>
  </div>
</section>

<footer class="lp-footer">
  <div class="lp-wrap lp-footer-in">
    <div class="lp-brand">
      <svg class="lp-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--ink)"/>
        <path d="M9 22C12 18 12 13 16 13C20 13 20 9 23 9" stroke="var(--amber)" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <circle cx="9" cy="22" r="3" fill="var(--amber)"/><circle cx="23" cy="9" r="3" fill="var(--paper)"/>
      </svg>
      <div>FLOTA <small>Plataforma de transporte corporativo · por SIMARP</small></div>
    </div>
    <div class="lp-meta">© ${new Date().getFullYear()} SIMARP</div>
  </div>
</footer>
`;

export default function Landing() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const root = ref.current;
      if (!root) return;
      root.querySelectorAll('.lp-car-anim').forEach((a) => a.remove());
      const car = root.querySelector('.lp-car');
      if (car) car.setAttribute('transform', 'translate(240,236)');
    }
  }, []);

  return <div className="lp-page" ref={ref} dangerouslySetInnerHTML={{ __html: HTML }} />;
}
