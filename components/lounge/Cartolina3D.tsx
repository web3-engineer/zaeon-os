"use client";
/**
 * Cartolina3D — a SALA DE CO-WORKING 3D do Lounge (docs/HANDOFF_LOUNGE_COWORK_3D.md). Porte do
 * protótipo cartolina-3d.html pro app (three.js já instalado; um só WebGLRenderer).
 *
 * Camadas: (1) mundo three.js — chão + grid, avatares (<Avatar3D/> isolado), artefatos 3D;
 * (2) overlay DOM projetado por frame — nametags, balões de fala, NOTAS editáveis (contenteditable,
 * sempre textContent: nada de innerHTML com texto de usuário); (3) HUD — presença ≤5, toolbar
 * (＋Nota · Puxar ponto do chat · Gerar artefato · Centralizar · Convidar), chat (log + input).
 * Multiplayer: useSala3D (Pusher presença + client-pos 12 Hz + interpolação dos remotos).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Plus, MessageSquarePlus, FlaskConical, Crosshair, Link2, Users, X } from "lucide-react";
import { criarAvatar, criarMolecula, type Avatar3DHandle } from "./Avatar3D";
import { useSala3D } from "./useSala3D";
import { interpolar, moverRelativoCamera, notaDoPonto, uid } from "@/lib/lounge3d/sala";
import { lerPontos, removerPonto } from "@/lib/lounge3d/pontos";
import type { PontoDoChat } from "@/lib/lounge3d/sala";
import type { ArtefatoCanvas, NotaCanvas, Presenca } from "@/lib/lounge3d/tipos";

const VEL = 3.2;
type Remoto = { h: Avatar3DHandle; cur: { x: number; z: number; facing: number }; tag: HTMLDivElement; nome: string };

export default function Cartolina3D({ salaId, onSair }: { salaId: string; onSair?: () => void }) {
  const sala = useSala3D(salaId);
  const stageRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const [chatTxt, setChatTxt] = useState("");
  const [pontos, setPontos] = useState<PontoDoChat[]>([]);
  const [mostrarPontos, setMostrarPontos] = useState(false);
  const [convite, setConvite] = useState<string | null>(null);
  const meuPos = useRef({ x: 0, z: 0, facing: 0 });
  const salaRef = useRef(sala); salaRef.current = sala;
  const falas = useRef<{ userId: string; el: HTMLDivElement; until: number }[]>([]);
  const notasEl = useRef<Map<string, { el: HTMLDivElement; anchor: THREE.Vector3 }>>(new Map());
  const artefatos3d = useRef<Map<string, THREE.Group>>(new Map());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const camRef = useRef<{ az: number; dist: number } | null>(null);

  const conteudo = sala.sala?.conteudo;
  const eu = sala.eu;

  // ─── cena ───
  useEffect(() => {
    const stage = stageRef.current, tags = tagsRef.current, notesHost = notesRef.current;
    if (!stage || !tags || !notesHost || !eu) return;
    const W = () => stage.clientWidth, H = () => stage.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W(), H());
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1226); scene.fog = new THREE.Fog(0x0b1226, 20, 46);
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a2238, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(7, 13, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { near: 1, far: 70, left: -22, right: 22, top: 22, bottom: -22 }); sun.shadow.bias = -0.0004; scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6fa8ff, 0.9); rim.position.set(-8, 5, -7); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0e1730, roughness: 0.98, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(400, 200, 0x2a3c6b, 0x1b294a); grid.position.y = 0.012; (grid.material as THREE.Material).opacity = 0.5; (grid.material as THREE.Material).transparent = true; scene.add(grid);

    // eu
    const me = criarAvatar(eu.color); me.marcarComoEu(); scene.add(me.group);
    const meTag = document.createElement("div"); meTag.className = "l3d-tag"; meTag.style.color = eu.color; meTag.textContent = `${eu.name} (você)`; tags.appendChild(meTag);
    const remotos = new Map<string, Remoto>();
    let target: THREE.Vector3 | null = null;
    const cam = { az: 0, dist: 9.5, h: 5.4 }; camRef.current = cam;
    const camTarget = new THREE.Vector3(0, 1, 0);
    const proj = (v: THREE.Vector3) => { const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * W(), y: (-p.y * 0.5 + 0.5) * H(), vis: p.z < 1 }; };

    // input
    const keys: Record<string, boolean> = {};
    const typing = () => { const a = document.activeElement as HTMLElement | null; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable); };
    const kd = (e: KeyboardEvent) => { if (typing()) return; const k = e.key.toLowerCase(); if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys[k] = true; e.preventDefault(); } };
    const ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    let drag: { x: number; y: number; az: number } | null = null, moved = false;
    const ray = new THREE.Raycaster();
    const pd = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, az: cam.az }; moved = false; };
    const pm = (e: PointerEvent) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) + Math.abs(e.clientY - drag.y) > 3) moved = true; cam.az = drag.az - dx * 0.006; };
    const pu = (e: PointerEvent) => {
      if (drag && !moved) {
        const r = renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(floor);
        if (hit[0]) { target = hit[0].point.clone(); target.y = 0; }
      }
      drag = null;
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); cam.dist = Math.min(16, Math.max(5, cam.dist * (e.deltaY > 0 ? 1.1 : 0.9))); };
    renderer.domElement.addEventListener("pointerdown", pd); window.addEventListener("pointermove", pm); window.addEventListener("pointerup", pu);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    const ro = new ResizeObserver(() => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); }); ro.observe(stage);

    let last = performance.now(), raf = 0, vivo = true;
    const loop = (now: number) => {
      if (!vivo) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const mp = meuPos.current;
      // mover eu
      let ix = 0, iz = 0; if (keys.w || keys.arrowup) iz -= 1; if (keys.s || keys.arrowdown) iz += 1; if (keys.a || keys.arrowleft) ix -= 1; if (keys.d || keys.arrowright) ix += 1;
      let moving = false;
      const dir = moverRelativoCamera(ix, iz, cam.az);
      if (dir) { mp.x += dir.wx * dt * VEL; mp.z += dir.wz * dt * VEL; target = null; moving = true; mp.facing = Math.atan2(dir.wx, dir.wz); }
      else if (target) { const dx = target.x - mp.x, dz = target.z - mp.z, d = Math.hypot(dx, dz); if (d > 0.08) { mp.x += dx / d * dt * VEL; mp.z += dz / d * dt * VEL; moving = true; mp.facing = Math.atan2(dx, dz); } else target = null; }
      me.group.position.x = mp.x; me.group.position.z = mp.z; me.olharPara(mp.facing); me.animar(moving, dt);
      if (moving) salaRef.current.enviarPos({ x: mp.x, z: mp.z, facing: mp.facing, moving: true });
      // remotos: cria/atualiza/interpola
      const rem = salaRef.current.remotos.current;
      for (const [id, p] of rem) {
        let r = remotos.get(id);
        if (!r) { const h = criarAvatar(p.color); h.group.position.set(p.x, 0, p.z); scene.add(h.group); const tag = document.createElement("div"); tag.className = "l3d-tag"; tag.style.color = p.color; tag.textContent = p.name; tags.appendChild(tag); r = { h, cur: { x: p.x, z: p.z, facing: p.facing }, tag, nome: p.name }; remotos.set(id, r); }
        const it = interpolar(r.cur, p, dt); r.cur = it; r.h.group.position.x = it.x; r.h.group.position.z = it.z; r.h.olharPara(it.facing); r.h.animar(it.moving, dt);
        const near = Math.hypot(mp.x - it.x, mp.z - it.z) < 1.6; r.tag.textContent = (near ? "💬 " : "") + r.nome;
      }
      for (const [id, r] of remotos) if (!rem.has(id)) { r.h.dispose(); r.tag.remove(); remotos.delete(id); }
      // câmera
      camTarget.lerp(new THREE.Vector3(mp.x, 1, mp.z), 0.12);
      camera.position.set(camTarget.x + Math.sin(cam.az) * cam.dist, camTarget.y + cam.h, camTarget.z + Math.cos(cam.az) * cam.dist); camera.lookAt(camTarget);
      // projeções: tags, balões, notas
      const put = (el: HTMLElement, v: THREE.Vector3) => { const s = proj(v); el.style.left = s.x + "px"; el.style.top = s.y + "px"; el.style.display = s.vis ? "block" : "none"; };
      put(meTag, new THREE.Vector3(mp.x, 2.05, mp.z));
      for (const r of remotos.values()) put(r.tag, new THREE.Vector3(r.cur.x, 2.05, r.cur.z));
      for (let i = falas.current.length - 1; i >= 0; i--) {
        const f = falas.current[i]!; if (now > f.until) { f.el.remove(); falas.current.splice(i, 1); continue; }
        const pos = f.userId === eu.id ? mp : remotos.get(f.userId)?.cur; if (!pos) { f.el.style.display = "none"; continue; }
        put(f.el, new THREE.Vector3(pos.x, 2.32, pos.z));
      }
      for (const n of notasEl.current.values()) put(n.el, n.anchor);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      vivo = false; cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("pointermove", pm); window.removeEventListener("pointerup", pu);
      renderer.domElement.remove(); renderer.dispose(); me.dispose(); for (const r of remotos.values()) { r.h.dispose(); r.tag.remove(); }
      meTag.remove(); sceneRef.current = null; artefatos3d.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eu?.id]);

  // ─── notas (DOM projetadas, editáveis; textContent sempre) ───
  const salvarNota = useCallback((n: NotaCanvas) => void sala.patch({ upsertNotes: [n] }), [sala]);
  const removerNota = useCallback((id: string) => void sala.patch({ removeNotes: [id] }), [sala]);
  useEffect(() => {
    const host = notesRef.current; if (!host || !conteudo) return;
    const vivos = new Set<string>();
    for (const n of conteudo.notes) {
      vivos.add(n.id);
      let e = notasEl.current.get(n.id);
      if (!e) {
        const el = document.createElement("div"); el.className = "l3d-note";
        const k = document.createElement("div"); k.className = "k"; const b = document.createElement("div"); b.className = "b"; b.contentEditable = "true"; b.spellcheck = false;
        const x = document.createElement("button"); x.className = "x"; x.textContent = "✕"; x.title = "Remover";
        el.append(k, b, x); host.appendChild(el);
        b.addEventListener("blur", () => { const atual = notasEl.current.get(n.id); const text = b.textContent ?? ""; const orig = (atual as any)?.nota as NotaCanvas | undefined; if (orig && text !== orig.text) salvarNota({ ...orig, text }); });
        b.addEventListener("keydown", (ev) => { if (ev.key === "Escape") b.blur(); });
        x.addEventListener("click", () => removerNota(n.id));
        e = { el, anchor: new THREE.Vector3(n.x, 1.7, n.z) }; notasEl.current.set(n.id, e);
      }
      (e as any).nota = n;
      e.anchor.set(n.x, 1.7, n.z);
      const k = e.el.querySelector(".k") as HTMLDivElement, b = e.el.querySelector(".b") as HTMLDivElement;
      k.textContent = `📌 ${n.kind} · ${n.src}`;
      if (document.activeElement !== b && b.textContent !== n.text) b.textContent = n.text;
    }
    for (const [id, e] of notasEl.current) if (!vivos.has(id)) { e.el.remove(); notasEl.current.delete(id); }
  }, [conteudo, salvarNota, removerNota]);

  // ─── artefatos 3D ───
  useEffect(() => {
    const scene = sceneRef.current; if (!scene || !conteudo) return;
    const vivos = new Set<string>();
    for (const a of conteudo.artifacts) {
      vivos.add(a.id);
      let g = artefatos3d.current.get(a.id);
      if (!g) { g = a.type === "molecula" ? criarMolecula() : criarMolecula(); scene.add(g); artefatos3d.current.set(a.id, g); }
      g.position.set(a.x, 0, a.z);
    }
    for (const [id, g] of artefatos3d.current) if (!vivos.has(id)) { g.removeFromParent(); artefatos3d.current.delete(id); }
  }, [conteudo]);

  // ─── chat → balões ───
  const vistos = useRef(new Set<string>());
  useEffect(() => {
    const host = speechRef.current; if (!host) return;
    for (const m of sala.chat) {
      if (vistos.current.has(m.id)) continue; vistos.current.add(m.id);
      for (let i = falas.current.length - 1; i >= 0; i--) if (falas.current[i]!.userId === m.userId) { falas.current[i]!.el.remove(); falas.current.splice(i, 1); }
      const el = document.createElement("div"); el.className = "l3d-speech"; el.style.borderColor = m.color; el.textContent = m.texto; host.appendChild(el);
      falas.current.push({ userId: m.userId, el, until: performance.now() + 4200 });
    }
  }, [sala.chat]);

  // ─── ações do HUD ───
  const novaNota = () => { const p = meuPos.current; salvarNota({ id: uid(), x: p.x + 0.6, z: p.z + 0.3, kind: "nota", src: "Você", text: "Nova nota — escreva aqui." }); };
  const abrirPontos = () => { setPontos(lerPontos()); setMostrarPontos((v) => !v); };
  const puxarPonto = (p: PontoDoChat) => { salvarNota(notaDoPonto(p, meuPos.current, eu?.id)); setPontos(removerPonto(p.id)); };
  const gerarArtefato = () => { const p = meuPos.current; const a: ArtefatoCanvas = { id: uid(), type: "molecula", x: p.x + 0.8, z: p.z + 0.2, data: { titulo: "molécula" } }; void sala.patch({ upsertArtifacts: [a] }); };
  const centralizar = () => { if (camRef.current) { camRef.current.az = 0; camRef.current.dist = 9.5; } };
  const convidar = async () => { const t = sala.sala?.token; if (!t) return; const url = `${location.origin}/research-lab?tab=lounge&sala=${encodeURIComponent(t)}`; try { await navigator.clipboard.writeText(url); } catch { /* */ } setConvite(url); setTimeout(() => setConvite(null), 6000); };
  const enviar = async () => { const t = chatTxt.trim(); if (!t) return; setChatTxt(""); await sala.enviarChat(t); };
  const presenca = useMemo(() => (sala.online.length ? sala.online : eu ? [eu] : []), [sala.online, eu]);

  if (sala.estado === "cheia") return <Aviso titulo="Sala cheia" texto="Esta sala já tem 5 pessoas. Tente de novo mais tarde." onSair={onSair} />;
  if (sala.estado === "erro") return <Aviso titulo="Não deu pra entrar" texto="Falha ao carregar a sala. Tente de novo." onSair={onSair} />;
  if (sala.estado === "off") return <Aviso titulo="Sala indisponível" texto="A sala 3D está desligada ou não existe." onSair={onSair} />;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1226] text-[#dbe8ff] select-none">
      <style>{`
        .l3d-tag{position:absolute;transform:translate(-50%,-100%);font:600 11px/1 system-ui,sans-serif;padding:3px 7px;border-radius:999px;background:rgba(8,16,36,.65);border:1px solid currentColor;pointer-events:none;white-space:nowrap}
        .l3d-speech{position:absolute;transform:translate(-50%,-100%);max-width:240px;font:13px/1.35 system-ui,sans-serif;color:#eaf2ff;padding:6px 10px;border-radius:12px;border:1.5px solid;background:rgba(10,21,38,.92);pointer-events:none;white-space:pre-wrap}
        .l3d-note{position:absolute;transform:translate(-50%,-100%);width:220px;background:#fff8e1;color:#3a2f1e;border-radius:6px;box-shadow:0 10px 24px rgba(0,0,0,.45);padding:8px 10px 10px;font:13px/1.35 Georgia,serif;transform-origin:bottom center}
        .l3d-note .k{font:700 10px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6b5a3e;margin-bottom:5px}
        .l3d-note .b{outline:none;white-space:pre-wrap;min-height:1em}
        .l3d-note .b:focus{background:rgba(14,116,144,.08)}
        .l3d-note .x{position:absolute;top:4px;right:6px;border:0;background:transparent;color:#6b5a3e;cursor:pointer;font-size:11px}
      `}</style>
      <div ref={stageRef} className="absolute inset-0" />
      <div ref={tagsRef} className="pointer-events-none absolute inset-0" />
      <div ref={speechRef} className="pointer-events-none absolute inset-0" />
      <div ref={notesRef} className="absolute inset-0 [&>*]:pointer-events-auto pointer-events-none" />

      {/* HUD topo: título + presença */}
      <div className="absolute left-3 top-3 flex items-center gap-3 rounded-2xl border border-[rgba(120,170,255,.22)] bg-[rgba(14,26,54,.6)] px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold">{sala.sala?.title ?? "Sala"}</p>
          <p className="text-[10.5px] text-[#9fb6e0]">WASD ou clique no chão · arraste pra girar · roda = zoom{sala.realtime === "pusher" ? "" : sala.realtime === "conectando" ? " · conectando…" : " · sem tempo real"}</p>
        </div>
        <div className="flex items-center" title={`${presenca.length}/5 na sala`}>
          {presenca.slice(0, 5).map((m) => (
            <span key={m.id} className="-ml-1 grid h-7 w-7 place-items-center rounded-full border-2 border-[#0b1226] text-[10px] font-black text-[#0b1226]" style={{ background: m.color }} title={m.name}>{m.name.slice(0, 1).toUpperCase()}</span>
          ))}
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[#9fb6e0]"><Users size={12} /> {presenca.length}/5</span>
        </div>
        {onSair && <button onClick={onSair} className="rounded-lg border border-white/15 p-1 text-[#9fb6e0] hover:text-white" aria-label="Sair da sala"><X size={14} /></button>}
      </div>

      {/* toolbar direita */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <Btn onClick={novaNota} icon={<Plus size={14} />}>Nota</Btn>
        <Btn onClick={abrirPontos} icon={<MessageSquarePlus size={14} />}>Puxar ponto do chat</Btn>
        <Btn onClick={gerarArtefato} icon={<FlaskConical size={14} />}>Gerar molécula</Btn>
        <Btn onClick={centralizar} icon={<Crosshair size={14} />}>Centralizar</Btn>
        {sala.sala?.token && <Btn onClick={() => void convidar()} icon={<Link2 size={14} />}>Convidar</Btn>}
        {convite && <span className="max-w-[260px] truncate rounded-lg bg-black/60 px-2 py-1 text-[10.5px] text-[#cfe0ff]">link copiado: {convite}</span>}
        {mostrarPontos && (
          <div className="mt-1 w-[300px] rounded-2xl border border-[rgba(120,170,255,.25)] bg-[rgba(10,21,38,.95)] p-2 backdrop-blur">
            <p className="px-1 pb-1 text-[11px] font-bold text-[#9fb6e0]">Pontos da Sala de Pesquisa</p>
            {pontos.length === 0 && <p className="px-1 text-[12px] text-[#9fb6e0]">Nada ainda — converse na Sala de Pesquisa e os pontos-chave aparecem aqui.</p>}
            {pontos.map((p) => (
              <button key={p.id} onClick={() => puxarPonto(p)} className="mb-1 block w-full rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left hover:border-cyan-400/50">
                <span className="block text-[12px] font-bold">{p.titulo ?? "Ponto"}</span>
                <span className="block text-[11px] text-[#9fb6e0] line-clamp-2">{p.texto}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* chat */}
      <div className="absolute bottom-3 left-3 w-[min(360px,80vw)] rounded-2xl border border-[rgba(120,170,255,.22)] bg-[rgba(14,26,54,.6)] p-2 backdrop-blur">
        <div className="max-h-[120px] overflow-y-auto px-1 text-[12px] leading-snug">
          {sala.chat.slice(-30).map((m) => (<div key={m.id}><b style={{ color: m.color }}>{m.name}:</b> {m.texto}</div>))}
        </div>
        <input
          value={chatTxt} onChange={(e) => setChatTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void enviar(); }}
          placeholder="Falar na sala… (Enter)" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[16px] [@media(hover:hover)_and_(pointer:fine)]:text-[13px] outline-none focus:border-cyan-400/60"
        />
      </div>
    </div>
  );
}

function Btn({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(130,180,255,.4)] bg-[linear-gradient(180deg,rgba(60,120,220,.35),rgba(20,40,90,.5))] px-3 py-1.5 text-[12px] font-semibold text-[#eaf2ff] hover:brightness-110">{icon}{children}</button>;
}
function Aviso({ titulo, texto, onSair }: { titulo: string; texto: string; onSair?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0b1226] text-center text-[#dbe8ff]">
      <p className="text-sm font-bold">{titulo}</p><p className="max-w-sm text-[12px] text-[#9fb6e0]">{texto}</p>
      {onSair && <button onClick={onSair} className="mt-2 rounded-xl border border-white/15 px-3 py-1.5 text-[12px]">Voltar</button>}
    </div>
  );
}
