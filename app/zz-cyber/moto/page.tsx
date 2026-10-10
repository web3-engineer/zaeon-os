"use client";
// PRÉVIA LOCAL (não versionar): a OFICINA da moto — vitrine das 3 carenagens e PISTA de teste com a física, o câmbio e o
// som de verdade (W/S acelera/freia, A/D esterça, Shift boost, Espaço sobe, C desce). Clique na tela pra ligar o som.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { criarMoto, type MotoHandle } from "@/components/cyber/Moto";
import { carregarModeloAvatar, criarAvatarLuz, type AvatarLuzHandle } from "@/components/cyber/AvatarLuz";
import { glowTex } from "@/components/cyber/CenaCosmica";
import { criarAudioCyber, type LoopSom } from "@/components/cyber/AudioCyber";
import { PILOTAGEM, motoParada, passoMotoSub, rompeuBarreira, sensacaoDeVelocidade, type EstadoMoto } from "@/lib/cyber/motoFisica";
import { criarVelocidadeTela } from "@/components/cyber/VelocidadeTela";
import { LOOPS_MOTO, cambioNeutro, eventosDaMoto, mixDaMoto, passoCambio, setaAcesa, somMotoParada, type EstadoSomMoto } from "@/lib/cyber/somMoto";

const CORES = ["#45d6ff", "#ff6ad5", "#ffc46b"];
const NOMES = ["Raio", "Tubarão", "Gota"];
type Hud = { kmh: number; marcha: number; rpm: number; tanque: number; boost: boolean };

export default function Oficina() {
  const ref = useRef<HTMLDivElement>(null);
  const [modo, setModo] = useState<"vitrine" | "pista">("vitrine"); const modoRef = useRef(modo); modoRef.current = modo;
  const [estilo, setEstilo] = useState(0); const estiloRef = useRef(estilo); estiloRef.current = estilo;
  const [hud, setHud] = useState<Hud>({ kmh: 0, marcha: 1, rpm: 0, tanque: 1, boost: false });
  const [som, setSom] = useState(false);
  const [kmhVitrine, setKmhVitrine] = useState(70);
  const botoes = useRef({ acel: 0, giro: 0, boost: false });

  useEffect(() => {
    const el = ref.current!; const R = new THREE.WebGLRenderer({ antialias: true }); R.setPixelRatio(Math.min(2, devicePixelRatio)); R.setSize(el.clientWidth, el.clientHeight); el.appendChild(R.domElement);
    const cena = new THREE.Scene(); cena.background = new THREE.Color(0x05060f); cena.fog = new THREE.Fog(0x05060f, 150, 1400);
    cena.add(new THREE.HemisphereLight(0x8899ff, 0x0a0a16, 1.1)); const d = new THREE.DirectionalLight(0xaaccff, 1.3); d.position.set(3, 6, 4); cena.add(d);
    const cam = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 2500); cam.position.set(6.5, 2.3, 5);
    const oc = new OrbitControls(cam, R.domElement); oc.target.set(0, 0.9, 0); oc.autoRotate = true; oc.autoRotateSpeed = 0.8; oc.enableDamping = true;

    // ── VITRINE: as três lado a lado (em fila na profundidade, pra caber na tela em pé) ──
    const vitrine = new THREE.Group(); cena.add(vitrine);
    const chaoV = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x0e1730, roughness: 1 })); chaoV.rotation.x = -Math.PI / 2; vitrine.add(chaoV);
    vitrine.add(new THREE.GridHelper(18, 36, 0x5a6cc0, 0x1b2550));
    const expostas = CORES.map((cor, i) => { const m = criarMoto({ cor, low: false, estilo: i }); m.group.position.set(0, 0, 0); m.group.visible = i === 0; vitrine.add(m.group); return m; });

    // ── PISTA: chão grande + um anel de postes de luz (r 140) e portais ──
    const pista = new THREE.Group(); pista.visible = false; cena.add(pista);
    const chaoP = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({ color: 0x0a1226, roughness: 1 })); chaoP.rotation.x = -Math.PI / 2; pista.add(chaoP);
    pista.add(new THREE.GridHelper(5000, 500, 0x3a4ca0, 0x141c40));
    // um ANEL de 3,8 km (r 600) marcado por postes dos dois lados (dá a noção de velocidade)
    const poste = new THREE.MeshBasicMaterial({ color: 0x45d6ff }), poste2 = new THREE.MeshBasicMaterial({ color: 0xff6ad5 }), gP = new THREE.CylinderGeometry(0.3, 0.3, 5, 6);
    const postes = new THREE.InstancedMesh(gP, poste, 240), postes2 = new THREE.InstancedMesh(gP, poste2, 240), mm = new THREE.Matrix4();
    for (let k = 0; k < 240; k++) { const a = (k / 240) * Math.PI * 2; postes.setMatrixAt(k, mm.makeTranslation(Math.cos(a) * 585, 2.5, Math.sin(a) * 585)); postes2.setMatrixAt(k, mm.makeTranslation(Math.cos(a) * 615, 2.5, Math.sin(a) * 615)); }
    pista.add(postes, postes2);
    let piloto: MotoHandle = criarMoto({ cor: CORES[0]!, low: false, estilo: 0 }); pista.add(piloto.group);
    let estiloPiloto = 0;

    // o PILOTO (avatar) montado na moto da vez
    let av: AvatarLuzHandle | null = null; const starTex = glowTex("rgba(255,255,255,1)", "rgba(190,215,255,0.5)");
    void carregarModeloAvatar().then((gltf) => { av = criarAvatarLuz("#2f7bff", starTex, false, gltf); cena.add(av.group); }).catch(() => {});
    const vv = { maoE: new THREE.Vector3(), maoD: new THREE.Vector3(), peE: new THREE.Vector3(), peD: new THREE.Vector3(), banco: new THREE.Vector3() };

    // física + som
    let est: EstadoMoto = motoParada(600, 3, 0, 0), pousado = false, cambio = cambioNeutro(), somEst: EstadoSomMoto = somMotoParada, yawAnt = 0;
    const audio = criarAudioCyber({ camera: cam, cena, low: false });
    let loops: Record<(typeof LOOPS_MOTO)[number], LoopSom> | null = null;
    const ligarSom = () => { audio.ativar(); setSom(true); };
    el.addEventListener("pointerdown", ligarSom);
    const keys: Record<string, boolean> = {};
    const kd = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; if ([" ", "arrowup", "arrowdown"].includes(e.key.toLowerCase())) e.preventDefault(); ligarSom(); };
    const ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    addEventListener("keydown", kd); addEventListener("keyup", ku);
    const w = window as unknown as { __cam?: (x: number, y: number, z: number, tz?: number) => void; __cmd?: { acel?: number; giro?: number; boost?: boolean }; __hud?: () => unknown };
    w.__cam = (x, y, z, tz = 0) => { oc.autoRotate = false; cam.position.set(x, y, z); oc.target.set(0, 0.9, tz); oc.update(); };
    w.__hud = () => ({ est, cambio, pousado });
    (window as unknown as { __veloz?: (v: number) => void }).__veloz = (v) => { est = { ...est, vx: Math.sin(est.yaw) * v, vz: Math.cos(est.yaw) * v }; };   // (teste: põe a moto já nessa velocidade)

    const camAlvo = new THREE.Vector3(), olhar = new THREE.Vector3(); (window as unknown as { __cena?: THREE.Scene }).__cena = cena;
    const fx = criarVelocidadeTela({ amostrasMsaa: 4 }); let velTela = 0, velVitrine = 70 / 3.6, ondaT = -1;
    (window as unknown as { __velVitrine?: (v: number) => void }).__velVitrine = (v) => { velVitrine = v; };
    const clock = new THREE.Clock(); let raf = 0, modoAnt = "", hudT = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop); const dt = Math.min(0.1, clock.getDelta()), t = clock.elapsedTime;
      const modoAgora = modoRef.current;
      if (modoAgora !== modoAnt) {
        vitrine.visible = modoAgora === "vitrine"; pista.visible = modoAgora === "pista"; oc.enabled = modoAgora === "vitrine";
        if (modoAgora === "vitrine") { cam.position.set(6.5, 2.3, 5); oc.target.set(0, 1, 0); }
        else { est = motoParada(600, 3, 0, 0); cambio = cambioNeutro(); }
        modoAnt = modoAgora;
      }
      if (estiloPiloto !== estiloRef.current) {
        estiloPiloto = estiloRef.current; expostas.forEach((m, i) => (m.group.visible = i === estiloPiloto));
        piloto.dispose(); if (loops) { for (const l of Object.values(loops)) audio.soltarLoop(l); loops = null; }
        piloto = criarMoto({ cor: CORES[estiloPiloto]!, low: false, estilo: estiloPiloto }); pista.add(piloto.group);
      }
      let montada: MotoHandle;
      if (modoAgora === "vitrine") {
        montada = expostas[estiloPiloto]!;
        montada.atualizar({ dt, t, voando: true, vel: velVitrine, boost: velVitrine > PILOTAGEM.vel + 0.5 ? 1 : 0, curva: Math.sin(t * 0.7) * 0.5, vy: 0, seta: setaAcesa(Math.sin(t * 0.7) * -0.6, t) });
        montada.group.position.y = 0.6; oc.update();
      } else {
        const b = botoes.current, x = w.__cmd ?? {};
        let acel = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + b.acel + (x.acel ?? 0);
        let giro = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + b.giro + (x.giro ?? 0);
        acel = Math.max(-1, Math.min(1, acel)); giro = Math.max(-1, Math.min(1, giro));
        const boostAntes = est.boost;
        const r = passoMotoSub(est, { acel, giro, subir: !!keys[" "], descer: !!keys.c, boost: !!keys.shift || b.boost || !!x.boost }, dt);
        est = r.s; pousado = r.pousado;
        if (!pousado && rompeuBarreira(boostAntes, est.boost, Math.hypot(est.vx, est.vz))) ondaT = 0;
        const g = piloto.group; g.position.set(est.x, est.y, est.z); g.rotation.y = est.yaw;
        let dy = est.yaw - yawAnt; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; yawAnt = est.yaw;
        const vel = Math.hypot(est.vx, est.vz);
        piloto.atualizar({ dt, t, voando: !pousado, vel, curva: dy / Math.max(dt, 1e-3), vy: est.vy, inclina: est.inclina, boost: est.boost ? 1 : 0, seta: setaAcesa(est.guidao, t) });
        montada = piloto;
        // SOM: o câmbio + o mix + os one-shots (igual ao engine)
        const base = { voando: !pousado, vel: vel / PILOTAGEM.vel, acel, boost: est.boost };
        cambio = passoCambio(cambio, base, dt);
        const e: EstadoSomMoto = { montada: true, ...base, seta: 0, rpm: cambio.rpm, marcha: cambio.marcha, corte: cambio.corte };
        if (audio.ativo && !loops) loops = Object.fromEntries(LOOPS_MOTO.map((n) => [n, audio.loop(n, g)])) as Record<(typeof LOOPS_MOTO)[number], LoopSom>;
        if (audio.ativo) for (const ev of eventosDaMoto(somEst, e)) audio.tocar(ev, g.position, { seguir: g });
        somEst = e;
        if (loops) { const mix = mixDaMoto(e); for (const n of LOOPS_MOTO) { audio.volumeLoop(loops[n], mix[n].vol, n === "moto-turbina" ? 6 : n === "moto-pipoco" ? 12 : undefined); audio.taxaLoop(loops[n], mix[n].taxa, n.startsWith("moto-motor") ? 16 : undefined); } }
        // câmera de perseguição (atrás e acima, com atraso)
        const fx = Math.sin(est.yaw), fz = Math.cos(est.yaw), longe = 7 + Math.min(4, vel * 0.06);
        camAlvo.set(est.x - fx * longe, est.y + 2.6, est.z - fz * longe);
        cam.position.lerp(camAlvo, Math.min(1, dt * 8)); olhar.set(est.x + fx * 6, est.y + 1, est.z + fz * 6); cam.lookAt(olhar);
        const alvoTela = pousado ? 0 : sensacaoDeVelocidade(est); velTela += (alvoTela - velTela) * (1 - Math.exp(-dt * (alvoTela > velTela ? 3 : 1.8)));
        cam.fov = 42 + 12 * Math.min(1.15, velTela); cam.updateProjectionMatrix();
        hudT += dt; if (hudT > 0.08) { hudT = 0; setHud({ kmh: Math.round(vel * 3.6), marcha: cambio.marcha + 1, rpm: cambio.rpm, tanque: est.tanque, boost: est.boost }); }
      }
      audio.atualizar(dt);
      if (av) {
        const m = montada; m.group.updateMatrixWorld(true);
        m.assento.getWorldPosition(vv.banco); av.group.position.copy(vv.banco); av.olharPara(m.group.rotation.y);
        m.pontos.maoE.getWorldPosition(vv.maoE); m.pontos.maoD.getWorldPosition(vv.maoD); m.pontos.peE.getWorldPosition(vv.peE); m.pontos.peD.getWorldPosition(vv.peD);
        av.animar({ andando: false, montado: { w: 1, maoE: vv.maoE, maoD: vv.maoD, peE: vv.peE, peD: vv.peD }, dt, t });
        av.group.rotation.z = 0;
      }
      if (ondaT >= 0) { ondaT += dt; if (ondaT > 1) ondaT = -1; }
      const onda = modoAgora === "pista" ? ondaT : -1;
      if (modoAgora === "pista" && (velTela > 0.03 || onda >= 0)) fx.render(R, velTela, t, () => { R.clear(); R.render(cena, cam); }, true, onda); else R.render(cena, cam);
    };
    loop();
    const rs = () => { R.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); }; addEventListener("resize", rs);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", rs); removeEventListener("keydown", kd); removeEventListener("keyup", ku); el.removeEventListener("pointerdown", ligarSom); fx.dispose(); audio.dispose(); expostas.forEach((m) => m.dispose()); piloto.dispose(); R.dispose(); el.innerHTML = ""; };
  }, []);

  const pill = (ativo: boolean) => ({ padding: "8px 14px", borderRadius: 999, border: 0, fontWeight: 800, fontSize: 13, background: ativo ? "#45d6ff" : "rgba(255,255,255,0.1)", color: ativo ? "#04101c" : "#e7ecff" }) as const;
  const segura = (k: "acel" | "giro" | "boost", v: number | boolean) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); (botoes.current as Record<string, unknown>)[k] = v; },
    onPointerUp: () => { (botoes.current as Record<string, unknown>)[k] = typeof v === "boolean" ? false : 0; },
    onPointerLeave: () => { (botoes.current as Record<string, unknown>)[k] = typeof v === "boolean" ? false : 0; },
  });
  const bt = { width: 64, height: 64, borderRadius: 16, border: "1px solid rgba(69,214,255,0.4)", background: "rgba(10,20,40,0.7)", color: "#e7ecff", fontSize: 22, fontWeight: 800, touchAction: "none" } as const;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#05060f", fontFamily: "system-ui", color: "#e7ecff" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <b style={{ marginRight: 6 }}>Oficina da moto</b>
        <button style={pill(modo === "vitrine")} onClick={() => setModo("vitrine")}>Vitrine</button>
        <button style={pill(modo === "pista")} onClick={() => setModo("pista")}>Pista de teste</button>
        <span style={{ width: 8 }} />
        {NOMES.map((n, i) => <button key={n} style={pill(estilo === i)} onClick={() => setEstilo(i)}>{n}</button>)}
      </div>
      {modo === "vitrine" && <div style={{ position: "absolute", bottom: 28, left: 16, right: 16, background: "rgba(5,10,25,0.75)", borderRadius: 14, padding: "10px 14px" }}>
        <div style={{ fontSize: 13, marginBottom: 6 }}>velocidade simulada: <b>{kmhVitrine} km/h</b> <span style={{ opacity: 0.6 }}>(calor da propulsão · acima de 560 = boost supersônico)</span></div>
        <input type="range" min={0} max={1000} step={10} value={kmhVitrine} style={{ width: "100%" }}
          onChange={(e) => { const v = Number(e.target.value); setKmhVitrine(v); (window as unknown as { __velVitrine?: (v: number) => void }).__velVitrine?.(v / 3.6); }} />
      </div>}
      {modo === "pista" && <>
        <div style={{ position: "absolute", top: 112, left: 16, background: "rgba(5,10,25,0.75)", borderRadius: 14, padding: "10px 14px", minWidth: 190 }}>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{hud.kmh}<span style={{ fontSize: 13, opacity: 0.7 }}> km/h</span></div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>marcha <b style={{ fontSize: 18 }}>{hud.marcha}</b>{hud.boost && <b style={{ color: "#7fd8ff", marginLeft: 8 }}>BOOST</b>}{hud.boost && hud.kmh >= 300 && <b style={{ color: "#ffd27a", marginLeft: 8 }}>SUPERSÔNICO</b>}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>giro</div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4 }}><div style={{ height: 8, width: `${Math.min(100, hud.rpm * 100)}%`, background: hud.rpm > 0.9 ? "#ff5a5a" : "#45d6ff", borderRadius: 4 }} /></div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>boost</div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}><div style={{ height: 6, width: `${hud.tanque * 100}%`, background: "#ffc46b", borderRadius: 3 }} /></div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>{som ? "som ligado" : "clique na tela pra ligar o som"} · W/S · A/D · Shift · Espaço/C</div>
        </div>
        <div style={{ position: "absolute", bottom: 24, left: 16, display: "flex", gap: 10 }}>
          <button style={bt} {...segura("giro", -1)}>◀</button><button style={bt} {...segura("giro", 1)}>▶</button>
        </div>
        <div style={{ position: "absolute", bottom: 24, right: 16, display: "flex", gap: 10 }}>
          <button style={bt} {...segura("acel", -1)}>▼</button><button style={{ ...bt, background: "rgba(255,196,107,0.25)" }} {...segura("boost", true)}>⚡</button><button style={bt} {...segura("acel", 1)}>▲</button>
        </div>
      </>}
    </div>
  );
}
