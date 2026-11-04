"use client";
// PRÉVIA LOCAL: a NAVE COWORKING sozinha (lib/cyber/naveCoworking + components/cyber/NaveCoworking) — arraste pra
// orbitar, role pra zoom; os botões levam a câmera pra cada área e tiram/põem o teto. Gente de luz pra dar a escala.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { criarNaveCoworking } from "@/components/cyber/NaveCoworking";
import { criarCascoCyberpunk } from "@/components/cyber/CascoCyberpunk";
import { carregarModeloAvatar, criarAvatarLuz, type AvatarLuzHandle } from "@/components/cyber/AvatarLuz";
import { glowTex } from "@/components/cyber/CenaCosmica";
import { AREAS, CHILL, NAVE_COWORK, moveisDaNave, type IdArea } from "@/lib/cyber/naveCoworking";

/** os enquadramentos: [posição da câmera, alvo] */
const VISTAS: Record<"geral" | "exterior" | "popa" | IdArea, [[number, number, number], [number, number, number]]> = {
  geral: [[46, 58, -52], [0, 0, 0]],
  exterior: [[70, 26, 62], [0, 2, 4]],
  popa: [[-48, 18, -86], [0, 3, -30]],
  mirante: [[0, 3.2, 17], [0, 2.6, 30]],
  avenida: [[0, 2.4, 6], [0, 1.6, 20]],
  cowork: [[-3.5, 4.2, 22], [-11, 0.8, 10]],
  orion: [[-6.8, 3.4, 3], [-12.5, 0.9, -4]],
  foco: [[-4, 3.6, -9], [-12, 1, -18]],
  chill: [[4, 3.4, 4.6], [11, 0.6, 14]],
  lyra: [[6.8, 3.6, 3.2], [12, 1.2, -4]],
  cafe: [[4.5, 3.2, -9.5], [13, 1, -19]],
  portal: [[0, 3.6, -18], [0, 1.8, -31]],
};

export default function Coworking() {
  const ref = useRef<HTMLDivElement>(null);
  const [teto, setTeto] = useState(false);
  const api = useRef<{ ir(v: keyof typeof VISTAS): void; teto(v: boolean): void; casco(v: boolean): void } | null>(null);
  useEffect(() => {
    const el = ref.current!; const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setPixelRatio(Math.min(2, devicePixelRatio)); R.setSize(el.clientWidth, el.clientHeight); R.outputColorSpace = THREE.SRGBColorSpace; el.appendChild(R.domElement);
    const cena = new THREE.Scene(); cena.background = new THREE.Color(0x05030c);
    cena.add(new THREE.HemisphereLight(0xb9a0ff, 0x0a0618, 1.0)); const d = new THREE.DirectionalLight(0xd8c8ff, 0.8); d.position.set(20, 60, 30); cena.add(d);
    // as estrelas lá fora (o espaço que se vê pela janela do mirante e por cima)
    { const n = 2500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 220 + Math.random() * 200, s = Math.sqrt(1 - u * u); p.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); cena.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, color: 0xd8ccff, sizeAttenuation: false }))); }
    const cam = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 1200);
    const oc = new OrbitControls(cam, R.domElement); oc.enableDamping = true;
    const ir = (v: keyof typeof VISTAS) => { const [p, a] = VISTAS[v]; cam.position.set(...p); oc.target.set(...a); oc.update(); };
    ir("geral");
    const nave = criarNaveCoworking({ low: false, teto: false }); cena.add(nave.group);
    const casco = criarCascoCyberpunk({ low: false }); cena.add(casco.group); casco.group.visible = false;
    api.current = { ir, teto: (v) => nave.mostrarTeto(v), casco: (v) => { casco.group.visible = v; nave.mostrarTeto(v); } };
    // gente: sentada nas mesas do coworking e na Lyra, no chill-out, no café e uma de pé no átrio
    const starTex = glowTex("rgba(255,255,255,1)", "rgba(190,215,255,0.5)"), avs: { av: AvatarLuzHandle; x: number; z: number; rumo: number; senta: boolean }[] = [];
    const cores = ["#c69bff", "#ffd36b", "#7fe0ff", "#ff7ad9", "#9affd0", "#2f7bff"];
    const cadeiras = moveisDaNave().filter((m) => m.tipo === "cadeira");
    const lugares = [cadeiras[0]!, cadeiras[3]!, cadeiras[9]!, cadeiras[14]!, ...cadeiras.filter((c) => c.area === "lyra").slice(0, 3), ...cadeiras.filter((c) => c.area === "foco").slice(0, 1)]
      .map((c) => ({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, rumo: c.rumo ?? 0, senta: true }));
    lugares.push({ x: CHILL.x - 2, z: CHILL.z + 1, rumo: 1.2, senta: false }, { x: CHILL.x - 1, z: CHILL.z - 1.5, rumo: -0.4, senta: false }, { x: 12.6, z: -17, rumo: Math.PI / 2, senta: false }, { x: NAVE_COWORK.chegada.x, z: NAVE_COWORK.chegada.z, rumo: Math.PI, senta: false }, { x: 1, z: 27, rumo: 0, senta: false });
    void carregarModeloAvatar().then((gltf) => lugares.forEach((l, i) => { const av = criarAvatarLuz(cores[i % cores.length]!, starTex, false, gltf); av.group.position.set(l.x, 0, l.z); av.olharPara(l.rumo); cena.add(av.group); avs.push({ av, ...l }); })).catch(() => {});
    const clock = new THREE.Clock(); let raf = 0;
    const quadro = () => { const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
      nave.atualizar(dt, t); if (casco.group.visible) casco.atualizar(dt, t);
      for (const a of avs) { a.av.olharPara(a.rumo); a.av.animar({ andando: false, descanso: a.senta ? { sentar: 1, deitar: 0, assentoY: 0.5 } : null, dt, t }); }
      oc.update(); R.render(cena, cam); };
    const loop = () => { raf = requestAnimationFrame(loop); quadro(); };
    loop();
    const w = window as unknown as { __cw?: unknown }; w.__cw = { ir, quadro, cam, oc, nave, casco, api: api.current, R, cena };   // (teste: o pane escondido não roda rAF)
    const rs = () => { R.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); }; addEventListener("resize", rs);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", rs); nave.dispose(); casco.dispose(); R.dispose(); el.innerHTML = ""; };
  }, []);
  const b = { padding: "8px 14px", borderRadius: 999, color: "#0a0418", fontWeight: 800, border: 0, cursor: "pointer", fontSize: 13 } as const;
  return <div style={{ position: "fixed", inset: 0, background: "#05030c" }}><div ref={ref} style={{ position: "absolute", inset: 0 }} />
    <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button style={{ ...b, background: "#ff2fb4", color: "#fff" }} onClick={() => { api.current?.casco(true); api.current?.ir("exterior"); }}>Exterior</button>
      <button style={{ ...b, background: "#45f0ff" }} onClick={() => { api.current?.casco(true); api.current?.ir("popa"); }}>Popa</button>
      <button style={{ ...b, background: "#e2d0ff" }} onClick={() => { api.current?.casco(false); api.current?.teto(teto); api.current?.ir("geral"); }}>Visão geral</button>
      {AREAS.map((a) => <button key={a.id} style={{ ...b, background: `#${a.cor.toString(16).padStart(6, "0")}` }} onClick={() => { api.current?.casco(false); api.current?.teto(teto); api.current?.ir(a.id); }}>{a.nome}</button>)}
      <button style={{ ...b, background: "#ffffff" }} onClick={() => { setTeto((x) => { api.current?.teto(!x); return !x; }); }}>{teto ? "Tirar teto" : "Pôr teto"}</button>
    </div></div>;
}
