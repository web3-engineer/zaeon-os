"use client";
// PRÉVIA LOCAL (não versionar): a NAVE-QG sozinha — arraste pra orbitar, role pra zoom. Botões: a bordo (tira o teto), voando.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { criarNave } from "@/components/cyber/Nave";
import { carregarModeloAvatar, criarAvatarLuz, type AvatarLuzHandle } from "@/components/cyber/AvatarLuz";
import { glowTex } from "@/components/cyber/CenaCosmica";
import { NAVE_QG } from "@/lib/cyber/naveQG";

export default function NaveQG() {
  const ref = useRef<HTMLDivElement>(null);
  const [voando, setVoando] = useState(false), [bordo, setBordo] = useState(false);
  const est = useRef({ voando: false, bordo: false }); est.current = { voando, bordo };
  useEffect(() => {
    const el = ref.current!; const R = new THREE.WebGLRenderer({ antialias: true }); R.setPixelRatio(Math.min(2, devicePixelRatio)); R.setSize(el.clientWidth, el.clientHeight); el.appendChild(R.domElement);
    const cena = new THREE.Scene(); cena.background = new THREE.Color(0x05060f);
    cena.add(new THREE.HemisphereLight(0x8899ff, 0x0a0a16, 1.1)); const d = new THREE.DirectionalLight(0xaaccff, 1.4); d.position.set(30, 60, 40); cena.add(d);
    const chao = new THREE.Mesh(new THREE.CircleGeometry(110, 96), new THREE.MeshStandardMaterial({ color: 0x0e1730, roughness: 1 })); chao.rotation.x = -Math.PI / 2; cena.add(chao);
    cena.add(new THREE.GridHelper(220, 110, 0x5a6cc0, 0x1b2550));
    const cam = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.5, 900); cam.position.set(95, 55, 100);
    const oc = new OrbitControls(cam, R.domElement); oc.target.set(0, 5, 0); oc.autoRotate = true; oc.autoRotateSpeed = 0.6; oc.enableDamping = true;
    const nave = criarNave({ low: false, cor: "#2f7bff" }); cena.add(nave.group);
    // gente pra dar a escala: o piloto na cadeira e dois convidados no convés/lá fora
    const starTex = glowTex("rgba(255,255,255,1)", "rgba(190,215,255,0.5)"); const avs: { av: AvatarLuzHandle; onde: "leme" | "estar" | "fora" }[] = [];
    void carregarModeloAvatar().then((gltf) => { for (const [cor, onde] of [["#2f7bff", "leme"], ["#c69bff", "estar"], ["#ffd36b", "fora"]] as const) { const av = criarAvatarLuz(cor, starTex, false, gltf); cena.add(av.group); avs.push({ av, onde }); } }).catch(() => {});
    const v = new THREE.Vector3(), clock = new THREE.Clock(); let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); const dt = clock.getDelta(), t = clock.elapsedTime, e = est.current;
      nave.group.position.y = e.voando ? 14 : 0; nave.aBordo(e.bordo); nave.abrirCabine(e.bordo);   // "bordo" = de pé na cabine (largou o leme)
      nave.atualizar({ dt, t, voando: e.voando, vel: e.voando ? 0.6 : 0, curva: 0 });
      nave.group.updateMatrixWorld(true);
      for (const { av, onde } of avs) {
        if (onde === "leme") {
          if (e.bordo) { av.group.position.set(NAVE_QG.emPe.x, nave.group.position.y + NAVE_QG.deck + NAVE_QG.cabine, NAVE_QG.emPe.z); av.olharPara(0); av.animar({ andando: false, dt, t }); }   // de pé nos controles, redoma aberta
          else { nave.assento.getWorldPosition(v); av.group.position.copy(v); av.olharPara(0); av.animar({ andando: false, pilotando: 1, dt, t }); }   // pilotando, redoma fechada
        }
        else if (onde === "estar") { av.group.position.set(-4, nave.group.position.y + NAVE_QG.deck, 14); av.olharPara(Math.PI / 2); av.animar({ andando: false, dt, t }); }
        else { av.group.position.set(Math.sin(t * 0.3) * 2, 0, NAVE_QG.saida.z); av.olharPara(0); av.animar({ andando: false, dt, t }); }
      }
      oc.update(); R.render(cena, cam); };
    (window as unknown as { __cam?: (x: number, y: number, z: number, ty?: number) => void }).__cam = (x, y, z, ty = 5) => { oc.autoRotate = false; cam.position.set(x, y, z); oc.target.set(0, ty, 0); oc.update(); };
    loop();
    const rs = () => { R.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); }; addEventListener("resize", rs);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", rs); nave.dispose(); R.dispose(); el.innerHTML = ""; };
  }, []);
  const b = { position: "absolute" as const, top: 72, padding: "10px 16px", borderRadius: 999, color: "#04101c", fontWeight: 800, border: 0 };
  return <div style={{ position: "fixed", inset: 0 }}><div ref={ref} style={{ position: "absolute", inset: 0 }} />
    <button onClick={() => setBordo((x) => !x)} style={{ ...b, left: 16, background: "#9affd0" }}>{bordo ? "■ Pegar o leme (fecha)" : "▶ Sair do leme (abre)"}</button>
    <button onClick={() => setVoando((x) => !x)} style={{ ...b, left: 210, background: "#45d6ff" }}>{voando ? "■ Pousada" : "▶ Voando"}</button></div>;
}
