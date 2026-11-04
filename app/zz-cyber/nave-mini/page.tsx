"use client";
// PRÉVIA LOCAL: a NAVE MINI (lib/cyber/naveMini + components/cyber/NaveMini) nas duas SKINS — arraste pra orbitar, role
// pra zoom; os botões trocam a skin (?skin=tron|agradavel) e levam a câmera pra cada canto. As 5 pessoas sentadas no
// meio dão a escala.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { criarNaveMini } from "@/components/cyber/NaveMini";
import { carregarModeloAvatar, criarAvatarLuz, type AvatarLuzHandle } from "@/components/cyber/AvatarLuz";
import { glowTex } from "@/components/cyber/CenaCosmica";
import { NOME_SKIN_MINI, SKINS_MINI, SKIN_MINI_PADRAO, ehSkinMini, lugaresDaMini, type SkinMini } from "@/lib/cyber/naveMini";

type V3 = readonly [number, number, number];
type Vista = { nome: string; cor: string; cam: V3; alvo: V3; casco: boolean; skins?: SkinMini[] };
/** os enquadramentos (os de um canto só de uma skin levam `skins`) */
const VISTAS: Record<string, Vista> = {
  exterior: { nome: "Exterior", cor: "#45f0ff", cam: [26, 12, 30], alvo: [0, 1.2, 0], casco: true },
  popa: { nome: "Popa", cor: "#b98cff", cam: [-20, 7, -38], alvo: [0, 1.5, -10], casco: true },
  cima: { nome: "De cima", cor: "#e2d0ff", cam: [16, 30, -18], alvo: [0, 0, 0], casco: false },
  roda: { nome: "O meio", cor: "#ff2fb4", cam: [0, 2.3, -7.4], alvo: [0, 0.9, 3], casco: true },
  cupula: { nome: "Cúpula", cor: "#8fd8ff", cam: [0.6, 1.4, -0.6], alvo: [0, 6, 2.4], casco: true },
  cabine: { nome: "Cabine", cor: "#45f0ff", cam: [0, 1.9, 8.6], alvo: [0, 1.3, 17], casco: true },
  terminais: { nome: "Terminais", cor: "#5fffb0", cam: [-3.6, 2.1, 0.6], alvo: [-8.2, 1.4, -2.6], casco: true, skins: ["tron"] },
  cinema: { nome: "Cinema", cor: "#ff2fb4", cam: [-2.6, 1.9, 6.4], alvo: [-8, 1.6, 6.2], casco: true, skins: ["tron"] },
  narguile: { nome: "Lounge do narguilé", cor: "#b98cff", cam: [2.2, 2.1, 2.4], alvo: [7.2, 0.9, 6.2], casco: true, skins: ["tron"] },
  leitura: { nome: "Leitura", cor: "#bfe6d4", cam: [-1.6, 2.2, 2.6], alvo: [-8, 0.9, -0.5], casco: true, skins: ["agradavel"] },
  janela: { nome: "Banco da janela", cor: "#d6c6f2", cam: [2.4, 2, 0.4], alvo: [8.6, 1.5, 6.4], casco: true, skins: ["agradavel"] },
  copa: { nome: "Copa", cor: "#f7cbe0", cam: [1.4, 2.2, -1.6], alvo: [7.6, 0.9, -6.8], casco: true },
};

export default function NaveMiniPrevia() {
  const ref = useRef<HTMLDivElement>(null);
  const [skin, setSkin] = useState<SkinMini>(() => { const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("skin") : null; return ehSkinMini(q) ? q : SKIN_MINI_PADRAO; });
  const api = useRef<{ ir(v: string): void } | null>(null), vistaAtual = useRef("exterior");
  useEffect(() => {
    const el = ref.current!; const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setPixelRatio(Math.min(2, devicePixelRatio)); R.setSize(el.clientWidth, el.clientHeight); R.outputColorSpace = THREE.SRGBColorSpace; el.appendChild(R.domElement);
    const cena = new THREE.Scene(); cena.background = new THREE.Color(0x05030c);
    const tron = skin === "tron";
    cena.add(new THREE.HemisphereLight(tron ? 0xa898ff : 0xfff0e6, tron ? 0x05030c : 0x2a2440, tron ? 0.55 : 0.9)); const d = new THREE.DirectionalLight(tron ? 0xc8b8ff : 0xffe8d8, tron ? 0.45 : 0.7); d.position.set(14, 40, 20); cena.add(d);
    { const n = 2500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 220 + Math.random() * 200, s = Math.sqrt(1 - u * u); p.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); cena.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, color: 0xe8e0ff, sizeAttenuation: false }))); }
    const cam = new THREE.PerspectiveCamera(58, el.clientWidth / el.clientHeight, 0.05, 1200);
    const oc = new OrbitControls(cam, R.domElement); oc.enableDamping = true;
    const nave = criarNaveMini({ low: false, skin }); cena.add(nave.group);
    const ir = (v: string) => { const x = VISTAS[v]; if (!x) return; vistaAtual.current = v; cam.position.set(x.cam[0], x.cam[1], x.cam[2]); oc.target.set(x.alvo[0], x.alvo[1], x.alvo[2]); oc.update(); nave.mostrarCasco(x.casco); nave.mostrarTeto(x.casco); };
    ir(VISTAS[vistaAtual.current]?.skins?.includes(skin) === false ? "exterior" : vistaAtual.current);
    api.current = { ir };
    // as 5 pessoas sentadas no meio, olhando pro centro
    const starTex = glowTex("rgba(255,255,255,1)", "rgba(220,210,255,0.5)"), avs: { av: AvatarLuzHandle; rumo: number }[] = [], cores = tron ? ["#45f0ff", "#ff2fb4", "#c69bff", "#5fffb0", "#ffd36b"] : ["#f6c4ae", "#c69bff", "#7fe0ff", "#9affd0", "#ffd36b"];
    let vivo = true;
    void carregarModeloAvatar().then((gltf) => { if (!vivo) return; lugaresDaMini(skin).forEach((l, i) => { const av = criarAvatarLuz(cores[i]!, starTex, false, gltf); av.group.position.set(l.x, 0, l.z); av.olharPara(l.rumo); cena.add(av.group); avs.push({ av, rumo: l.rumo }); }); }).catch(() => {});
    const clock = new THREE.Clock(); let raf = 0;
    const quadro = () => { const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime; nave.atualizar(dt, t);
      for (const a of avs) { a.av.olharPara(a.rumo); a.av.animar({ andando: false, descanso: { sentar: 1, deitar: 0, assentoY: 0.46 }, dt, t }); }
      oc.update(); R.render(cena, cam); };
    const loop = () => { raf = requestAnimationFrame(loop); quadro(); };
    loop();
    (window as unknown as { __mini?: unknown }).__mini = { ir, quadro, cam, oc, nave, R, cena, skin };   // (teste: o pane escondido não roda rAF)
    const rs = () => { R.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); }; addEventListener("resize", rs);
    return () => { vivo = false; cancelAnimationFrame(raf); removeEventListener("resize", rs); nave.dispose(); R.dispose(); el.innerHTML = ""; };
  }, [skin]);
  const b = { padding: "8px 14px", borderRadius: 999, color: "#0a0418", fontWeight: 800, border: 0, cursor: "pointer", fontSize: 13 } as const;
  return <div style={{ position: "fixed", inset: 0, background: "#05030c" }}><div ref={ref} style={{ position: "absolute", inset: 0 }} />
    <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {SKINS_MINI.map((s) => <button key={s} style={{ ...b, background: s === skin ? "#ffffff" : "#2a2440", color: s === skin ? "#0a0418" : "#e2d0ff", outline: s === skin ? "2px solid #45f0ff" : "none" }} onClick={() => { const u = new URL(location.href); u.searchParams.set("skin", s); history.replaceState(null, "", u); setSkin(s); }}>Skin: {NOME_SKIN_MINI[s]}</button>)}
      <span style={{ width: "100%" }} />
      {Object.entries(VISTAS).filter(([, v]) => !v.skins || v.skins.includes(skin)).map(([id, v]) => <button key={id} style={{ ...b, background: v.cor }} onClick={() => api.current?.ir(id)}>{v.nome}</button>)}
    </div></div>;
}
