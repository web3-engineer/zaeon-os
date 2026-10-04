/**
 * CyberEngine — a cena RPG do cyberespaço (HANDOFF lounge cósmico): três.js imperativo, isolado do React.
 * Cenário fixo (CenaCosmica) + uma BASE DE ESTUDO por pessoa (BaseEstudo, fixa e privada) + "seres de luz"
 * (AvatarLuz). Movimento WASD/joystick/clique, correr, pular, câmera orbital livre (+pinça), colisão que desliza
 * na borda das bases, sentar ao parar na própria base, monitor destacável (hover) que leva à Sala de Estudos.
 * Rede = só o que o hook de sala entrega (remotos + enviarPos); aqui não há fetch/Pusher.
 */
import * as THREE from "three";
import { BASE_COLLIDER_R, BASE_INTERACT_R, basesDosMembros, localParaMundo, spawnDaBase, type LayoutBase } from "@/lib/cyber/bases";
import { empurrarParaFora, type Colisor } from "@/lib/cyber/colisao";
import { decidirClique, rotuloMonitor } from "@/lib/cyber/clique";
import { interpolar, moverRelativoCamera } from "@/lib/lounge3d/sala";
import type { Presenca } from "@/lib/lounge3d/tipos";
import { criarCenaCosmica, type CenaCosmicaHandle } from "./CenaCosmica";
import { criarBase, type BaseEstudoHandle } from "./BaseEstudo";
import { criarAvatarLuz, type AvatarLuzHandle } from "./AvatarLuz";

export type PessoaCyber = { id: string; name: string; color: string };
export type CyberOpts = {
  container: HTMLElement;
  /** camada de tags/falas por cima do canvas (position:absolute; inset:0; pointer-events:none). */
  overlay: HTMLElement;
  els: { menu: HTMLElement | null; hold: HTMLElement | null; monLabel: HTMLElement | null };
  eu: PessoaCyber;
  /** todas as pessoas da sala, na ORDEM dos membros (define a base de cada uma). */
  membros: PessoaCyber[];
  /** começa em modo menu (personagem sentado contemplando; opção do monitor ou ESPAÇO = play). */
  menu: boolean;
  low: boolean;
  /** teclado sempre ouvido (tela cheia). Na janela da landing só com o mouse em cima (não rouba ESPAÇO/rolagem da página). */
  teclasSempre: boolean;
  remotos?: { current: Map<string, Presenca> };
  enviarPos?: (p: { x: number; z: number; facing: number; moving: boolean; sit: boolean }) => void;
  onPerto?: (perto: boolean) => void;
  onFalarCom?: (nome: string | null) => void;
  onEntrarEstudo?: () => void;
  onSessao?: (go: string) => void;
  onPronto?: () => void;
};

type Ator = { id: string; name: string; color: string; av: AvatarLuzHandle; pos: THREE.Vector3; facing: number; moving: boolean; sit: number; tag: HTMLDivElement };
type Fala = { el: HTMLDivElement; ator: Ator; ate: number };

const TAG_CSS = "position:absolute;transform:translate(-50%,-100%);font:700 11px system-ui,sans-serif;padding:2px 8px;border-radius:999px;background:rgba(10,8,30,.62);border:1px solid rgba(160,140,255,.3);white-space:nowrap;pointer-events:none;";
const FALA_CSS = "position:absolute;transform:translate(-50%,-100%);max-width:200px;font:12.5px system-ui,sans-serif;color:#eee8ff;background:rgba(14,12,36,.82);border:1px solid;padding:6px 10px;border-radius:12px;pointer-events:none;overflow-wrap:anywhere;";

export class CyberEngine {
  private o: CyberOpts;
  private R: THREE.WebGLRenderer;
  private cam: THREE.PerspectiveCamera;
  private cena: CenaCosmicaHandle;
  private bases = new Map<string, BaseEstudoHandle>();
  private layouts = new Map<string, LayoutBase>();
  private colisores: Colisor[] = [];
  private pessoas = new Map<string, PessoaCyber>();
  /** ids na ORDEM canônica dos membros (define a base de cada um). */
  private ordem: string[] = [];
  private tagsBase = new Map<string, HTMLDivElement>();
  private eu!: Ator;
  private remotos = new Map<string, Ator>();
  private falas: Fala[] = [];
  private raf = 0; private vivo = true; private visivel = true;
  private clock = new THREE.Clock();
  private ray = new THREE.Raycaster();
  private ro: ResizeObserver; private io: IntersectionObserver | null = null;
  private w = 1; private h = 1;
  // estado de jogo
  private menu: boolean; private holdT = 0; private espaco = false;
  private keys: Record<string, boolean> = {}; private joy = { x: 0, y: 0, on: false }; private correr = false;
  private alvo: THREE.Vector2 | null = null;
  private jumpY = 0; private jumpVy = 0; private chao = true;
  private sitT = 0; private perto = false; private falandoCom: Ator | null = null;
  private hoverBase: string | null = null; private sobContainer = false;
  private camAz = 0; private camPitch = 0.16; private camDist = 9; private camT = new THREE.Vector3(0, 1.2, 0);
  private ptrs = new Map<number, { x: number; y: number }>(); private drag: { x: number; y: number; az: number; pitch: number } | null = null; private moved = false; private pinch0 = 0; private dist0 = 9;
  private prontoDisparado = false;
  private cleanups: Array<() => void> = [];

  constructor(opts: CyberOpts) {
    this.o = opts; this.menu = opts.menu;
    const { container, low } = opts;
    this.w = Math.max(1, container.clientWidth); this.h = Math.max(1, container.clientHeight);
    this.R = new THREE.WebGLRenderer({ antialias: !low, powerPreference: "high-performance" });
    this.R.setPixelRatio(Math.min(low ? 1.5 : 2, window.devicePixelRatio || 1)); this.R.setSize(this.w, this.h, false);
    this.R.autoClear = false; this.R.outputColorSpace = THREE.SRGBColorSpace;
    const cv = this.R.domElement; cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:" + (opts.menu ? "pan-y" : "none");
    container.appendChild(cv);
    this.cam = new THREE.PerspectiveCamera(45, this.w / this.h, 0.1, 900);
    this.cena = criarCenaCosmica(low, this.w / this.h);

    this.setPessoas([...opts.membros]);
    this.ligarEntradas();
    this.ro = new ResizeObserver(() => this.redimensionar()); this.ro.observe(container);
    if (typeof IntersectionObserver !== "undefined") { this.io = new IntersectionObserver((e) => { this.visivel = !!e[0]?.isIntersecting; }); this.io.observe(container); }
    this.clock.start();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  /** Reconstrói bases/atores quando a lista de membros muda (alguém entrou na sala). */
  setPessoas(lista: PessoaCyber[]) {
    const ids = lista.map((p) => p.id);
    if (!ids.includes(this.o.eu.id)) { lista = [...lista, this.o.eu]; ids.push(this.o.eu.id); }
    for (const p of lista) this.pessoas.set(p.id, p);
    this.ordem = ids;
    this.layouts = basesDosMembros(ids);
    for (const [id, lay] of this.layouts) {
      const existente = this.bases.get(id);
      if (existente) { if (existente.layout.x !== lay.x || existente.layout.z !== lay.z) existente.mover(lay); continue; }
      const p = this.pessoas.get(id)!;
      const b = criarBase(lay, p.color, this.cena.starTex, this.o.low);
      this.cena.scene.add(b.group); this.bases.set(id, b);
      const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + p.color + ";opacity:.8;";
      tag.textContent = id === this.o.eu.id ? "Sua base" : `Base de ${p.name}`; this.o.overlay.appendChild(tag); this.tagsBase.set(id, tag);
    }
    this.colisores = [...this.layouts.values()].map((l) => ({ x: l.x, z: l.z, r: BASE_COLLIDER_R }));
    if (!this.eu) {
      const sp = spawnDaBase(this.layouts.get(this.o.eu.id));
      this.eu = this.novoAtor(this.o.eu, sp.x, sp.z);
      if (this.menu) { const s = this.assento(); this.eu.pos.set(s.x, 0, s.z); this.eu.facing = this.rotAssento(); this.eu.sit = 1; this.sitT = 1; }
      else this.eu.facing = Math.atan2(-sp.x, -sp.z);
      this.camT.set(this.eu.pos.x, 1.2, this.eu.pos.z);
    }
  }

  private novoAtor(p: PessoaCyber, x: number, z: number): Ator {
    const av = criarAvatarLuz(p.color, this.cena.starTex, this.o.low);
    av.group.position.set(x, 0, z); this.cena.scene.add(av.group);
    const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + p.color + ";"; tag.textContent = p.id === this.o.eu.id ? "Você" : p.name; this.o.overlay.appendChild(tag);
    return { id: p.id, name: p.name, color: p.color, av, pos: new THREE.Vector3(x, 0, z), facing: 0, moving: false, sit: 0, tag };
  }
  private removerAtor(a: Ator) { a.av.dispose(); a.tag.remove(); this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; }); }

  // ───────────── API pública (React → engine) ─────────────
  iniciar(go = "viajar") {
    if (!this.menu) return; this.menu = false; this.holdT = 0;
    this.o.els.menu && (this.o.els.menu.style.display = "none"); if (this.o.els.hold) this.o.els.hold.style.width = "0%";
    this.R.domElement.style.touchAction = "none";
    this.o.onSessao?.(go);
  }
  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; this.joy.on = Math.hypot(x, y) > 0.15; }
  alternarCorrer(): boolean { this.correr = !this.correr; return this.correr; }
  pular() { if (!this.menu && this.chao) { this.jumpVy = 6.5; this.chao = false; } }
  /** Balão de fala sobre a pessoa (chat da sala). */
  falar(userId: string, texto: string) {
    const a = userId === this.o.eu.id ? this.eu : this.remotos.get(userId); if (!a) return;
    this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; });
    const el = document.createElement("div"); el.style.cssText = FALA_CSS + "border-color:" + a.color + ";"; el.textContent = texto.slice(0, 140);
    this.o.overlay.appendChild(el); this.falas.push({ el, ator: a, ate: performance.now() + 4200 });
  }
  get minhaBase(): LayoutBase | undefined { return this.layouts.get(this.o.eu.id); }

  // ───────────── geometria da minha base ─────────────
  private assento() { const b = this.minhaBase; return b ? localParaMundo(b, 0, -0.15) : { x: 0, z: 0 }; }
  private rotAssento() { const b = this.minhaBase; return b ? b.rot + Math.PI : 0; }
  private distBase(id: string, p: { x: number; z: number }) { const l = this.layouts.get(id); return l ? Math.hypot(p.x - l.x, p.z - l.z) : Infinity; }

  // ───────────── entradas ─────────────
  private digitando() { const a = document.activeElement; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || (a as HTMLElement).isContentEditable); }
  private ligarEntradas() {
    const on = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void) => { window.addEventListener(t, f as EventListener); this.cleanups.push(() => window.removeEventListener(t, f as EventListener)); };
    const cv = this.R.domElement;
    const onC = <K extends keyof HTMLElementEventMap>(t: K, f: (e: HTMLElementEventMap[K]) => void, opt?: AddEventListenerOptions) => { cv.addEventListener(t, f as EventListener, opt); this.cleanups.push(() => cv.removeEventListener(t, f as EventListener)); };
    on("keydown", (e) => {
      if (this.digitando() || (!this.o.teclasSempre && !this.sobContainer)) return; const k = e.key.toLowerCase();
      if (k === "shift") { this.keys.shift = true; return; }
      if (k === " " || k === "spacebar") { if (this.menu) this.espaco = true; else this.pular(); e.preventDefault(); return; }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { this.keys[k] = true; e.preventDefault(); }
    });
    on("keyup", (e) => { const k = e.key.toLowerCase(); if (k === "shift") { this.keys.shift = false; return; } if (k === " " || k === "spacebar") { this.espaco = false; return; } this.keys[k] = false; });
    onC("pointerdown", (e) => {
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch0 = Math.hypot(a!.x - b!.x, a!.y - b!.y); this.dist0 = this.camDist; }
      this.drag = { x: e.clientX, y: e.clientY, az: this.camAz, pitch: this.camPitch }; this.moved = false;
    });
    on("pointermove", (e) => {
      if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2 && this.pinch0) { const [a, b] = [...this.ptrs.values()]; this.camDist = Math.min(24, Math.max(6, (this.dist0 * this.pinch0) / Math.max(20, Math.hypot(a!.x - b!.x, a!.y - b!.y)))); this.moved = true; return; }
      if (!this.drag) { if (e.target === cv) this.passarMouse(e.clientX, e.clientY); return; }
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) this.moved = true;
      this.camAz = this.drag.az - dx * 0.006; this.camPitch = Math.max(-0.05, Math.min(1.25, this.drag.pitch + dy * 0.005));
    });
    on("pointerup", (e) => {
      const era = this.ptrs.size; this.ptrs.delete(e.pointerId); if (this.ptrs.size < 2) this.pinch0 = 0;
      if (this.drag && !this.moved && era === 1) this.clicar(e.clientX, e.clientY);
      if (!this.ptrs.size) this.drag = null;
    });
    on("pointercancel", (e) => { this.ptrs.delete(e.pointerId); if (!this.ptrs.size) { this.drag = null; this.pinch0 = 0; } });
    onC("pointerenter", () => { this.sobContainer = true; });
    onC("pointerleave", () => { this.sobContainer = false; this.hoverBase = null; cv.style.cursor = ""; });
    onC("wheel", (e) => { if (this.menu) return; /* menu: a página continua rolando */ e.preventDefault(); this.camDist = Math.min(24, Math.max(6, this.camDist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  }

  private ndc(cx: number, cy: number) { const r = this.R.domElement.getBoundingClientRect(); return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); }
  /** qual monitor (de qual base) está sob o ponteiro, se houver */
  private monitorSob(cx: number, cy: number): string | null {
    if (this.menu) return null;
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    let melhor: { id: string; d: number } | null = null;
    for (const [id, b] of this.bases) { const h = this.ray.intersectObject(b.monitor, false)[0]; if (h && (!melhor || h.distance < melhor.d)) melhor = { id, d: h.distance }; }
    return melhor?.id ?? null;
  }
  private passarMouse(cx: number, cy: number) {
    this.hoverBase = this.monitorSob(cx, cy);
    const meu = this.hoverBase === this.o.eu.id;
    this.R.domElement.style.cursor = meu && this.perto ? "pointer" : "";
  }

  private clicar(cx: number, cy: number) {
    const sob = this.monitorSob(cx, cy);
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    let colega: Ator | null = null;
    for (const a of this.remotos.values()) if (this.eu.pos.distanceTo(a.pos) < 3.0 && this.ray.intersectObjects(a.av.meshes, true).length) { colega = a; break; }
    const acao = decidirClique({ noMonitor: sob !== null, baseMinha: sob === this.o.eu.id, pertoDaBase: this.perto, noColega: !!colega, colegaPerto: !!colega });
    if (acao === "monitor") { this.o.onEntrarEstudo?.(); return; }
    if (acao === "aproximar") {   // clique no meu monitor de longe: vai até a frente da base
      const l = this.minhaBase!; const dx = this.eu.pos.x - l.x, dz = this.eu.pos.z - l.z, d = Math.hypot(dx, dz) || 1;
      const r = BASE_COLLIDER_R + 0.9; this.alvo = new THREE.Vector2(l.x + (dx / d) * r, l.z + (dz / d) * r); this.falandoCom = null; return;
    }
    if (acao === "colega" && colega) {
      this.falandoCom = colega; this.alvo = null; this.o.onFalarCom?.(colega.name);
      colega.av.olharPara(Math.atan2(this.eu.pos.x - colega.pos.x, this.eu.pos.z - colega.pos.z)); return;
    }
    const h = this.ray.intersectObject(this.cena.floor)[0];
    if (h) { const p = empurrarParaFora({ x: h.point.x, z: h.point.z }, this.colisores); this.alvo = new THREE.Vector2(p.x, p.z); this.falandoCom = null; this.o.onFalarCom?.(null); }
  }

  private redimensionar() {
    const c = this.o.container; this.w = Math.max(1, c.clientWidth); this.h = Math.max(1, c.clientHeight);
    this.R.setSize(this.w, this.h, false); this.cam.aspect = this.w / this.h; this.cam.updateProjectionMatrix();
  }

  private proj(v: THREE.Vector3) { const p = v.clone().project(this.cam); return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h, vis: p.z < 1 }; }

  private atualizarCamera() {
    const l = this.minhaBase;
    if (this.menu && l) {
      const pm = Math.min(2.4, Math.max(1, 0.9 / this.cam.aspect));   // retrato: afasta p/ caber a base
      const rel = localParaMundo(l, -2.6 * pm, 4.8 * pm);
      this.cam.position.lerp(new THREE.Vector3(rel.x, 2.5 + 0.9 * (pm - 1), rel.z), 0.06);
      this.camT.lerp(new THREE.Vector3(l.x, pm > 1 ? 0.1 : 1.4, l.z), 0.06); this.cam.lookAt(this.camT);
      return;
    }
    this.camT.lerp(new THREE.Vector3(this.eu.pos.x, 1.2, this.eu.pos.z), 0.12);
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    this.cam.position.set(this.camT.x + Math.sin(this.camAz) * cp * this.camDist, Math.max(0.6, this.camT.y + sp * this.camDist + 0.8), this.camT.z + Math.cos(this.camAz) * cp * this.camDist);
    this.cam.lookAt(this.camT.x, this.camT.y + 0.8, this.camT.z);
  }

  // ───────────── loop ─────────────
  private loop(now: number) {
    if (!this.vivo) return;
    this.raf = requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, this.clock.getDelta()), t = now * 0.001;
    if (!this.visivel || document.hidden) return;
    const eu = this.eu, euId = this.o.eu.id;

    // MENU: segurar ESPAÇO p/ viajar; personagem fica sentado contemplando
    if (this.menu) {
      if (this.espaco) { this.holdT += dt; if (this.o.els.hold) this.o.els.hold.style.width = Math.min(100, (this.holdT / 1.2) * 100) + "%"; if (this.holdT >= 1.2) this.iniciar("viajar"); }
      else if (this.holdT > 0) { this.holdT = Math.max(0, this.holdT - dt * 2); if (this.o.els.hold) this.o.els.hold.style.width = (this.holdT / 1.2) * 100 + "%"; }
      const s = this.assento(); eu.pos.set(s.x, 0, s.z); eu.facing = this.rotAssento(); this.sitT = 1; eu.moving = false;
    } else {
      let ix = 0, iz = 0;
      if (this.keys.w || this.keys.arrowup) iz -= 1; if (this.keys.s || this.keys.arrowdown) iz += 1;
      if (this.keys.a || this.keys.arrowleft) ix -= 1; if (this.keys.d || this.keys.arrowright) ix += 1;
      if (this.joy.on) { ix += this.joy.x; iz += this.joy.y; }
      const correndo = this.keys.shift || this.correr, spd = correndo ? 7.5 : 4;
      let andando = false;
      const dir = moverRelativoCamera(ix, iz, this.camAz);
      if (dir) { eu.pos.x += dir.wx * dt * spd; eu.pos.z += dir.wz * dt * spd; this.alvo = null; andando = true; eu.facing = Math.atan2(dir.wx, dir.wz); this.falandoCom = null; }
      else if (this.alvo) {
        const dx = this.alvo.x - eu.pos.x, dz = this.alvo.y - eu.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.12) { eu.pos.x += (dx / d) * dt * 4; eu.pos.z += (dz / d) * dt * 4; andando = true; eu.facing = Math.atan2(dx, dz); } else this.alvo = null;
      }
      // sentar ao parar perto da PRÓPRIA base
      const querSentar = this.distBase(euId, eu.pos) < BASE_INTERACT_R && !andando && !this.alvo && this.chao;
      this.sitT += ((querSentar ? 1 : 0) - this.sitT) * Math.min(1, dt * 3);
      if (this.sitT > 0.05) { const s = this.assento(); eu.pos.x += (s.x - eu.pos.x) * Math.min(1, dt * 3); eu.pos.z += (s.z - eu.pos.z) * Math.min(1, dt * 3); eu.facing = this.rotAssento(); }
      else { const p = empurrarParaFora({ x: eu.pos.x, z: eu.pos.z }, this.colisores); eu.pos.x = p.x; eu.pos.z = p.z; }
      if (!this.chao) { this.jumpVy -= 20 * dt; this.jumpY += this.jumpVy * dt; if (this.jumpY <= 0) { this.jumpY = 0; this.jumpVy = 0; this.chao = true; } }
      eu.moving = andando;
    }
    eu.sit = this.sitT;

    // estar perto da própria base = estado de estudo (luz/cristais/botão)
    const perto = this.distBase(euId, eu.pos) < BASE_INTERACT_R;
    if (perto !== this.perto) { this.perto = perto; this.o.onPerto?.(perto); }

    // rede: eu → difusão; remotos → atores
    if (!this.menu) this.o.enviarPos?.({ x: eu.pos.x, z: eu.pos.z, facing: eu.facing, moving: eu.moving, sit: this.sitT > 0.5 });
    this.sincronizarRemotos(dt, t);

    // avatares
    eu.av.group.position.set(eu.pos.x, this.jumpY, eu.pos.z); eu.av.olharPara(eu.facing);
    eu.av.animar({ andando: eu.moving, correndo: !!(this.keys.shift || this.correr) && eu.moving, sentado: this.sitT, dt, t });
    for (const a of this.remotos.values()) { a.av.group.position.set(a.pos.x, 0, a.pos.z); a.av.olharPara(a.facing); a.av.animar({ andando: a.moving, sentado: a.sit, dt, t }); }

    // bases
    for (const [id, b] of this.bases) {
      const alguemPerto = id === euId ? perto : [...this.remotos.values()].some((a) => a.id === id && this.distBase(id, a.pos) < BASE_INTERACT_R);
      b.atualizar({ dt, t, ativa: alguemPerto, hover: this.hoverBase === id, perto: id === euId && perto });
    }

    this.atualizarCamera();
    this.cena.atualizar({ dt, t, cam: this.cam, aspect: this.cam.aspect });
    this.atualizarHud(now);
    this.R.clear(); this.R.render(this.cena.bgScene, this.cena.bgCam); this.R.clearDepth(); this.R.render(this.cena.scene, this.cam);
    if (!this.prontoDisparado) { this.prontoDisparado = true; this.o.onPronto?.(); }
  }

  private sincronizarRemotos(dt: number, t: number) {
    const src = this.o.remotos?.current;
    if (src) {
      for (const [id, p] of src) {
        if (id === this.o.eu.id) continue;
        let a = this.remotos.get(id);
        if (!a) {
          a = this.novoAtor({ id, name: p.name, color: p.color }, p.x, p.z);
          a.facing = p.facing; this.remotos.set(id, a);
          if (!this.pessoas.has(id)) this.setPessoas([...this.ordem.map((i) => this.pessoas.get(i)!), { id, name: p.name, color: p.color }]);
        }
        const r = interpolar({ x: a.pos.x, z: a.pos.z, facing: a.facing }, { x: p.x, z: p.z, facing: p.facing }, dt);
        a.pos.x = r.x; a.pos.z = r.z; a.facing = r.facing; a.moving = r.moving || p.moving === true;
        a.sit += ((p.sit ? 1 : 0) - a.sit) * Math.min(1, dt * 3);
        void t;
      }
      // saiu da sala: o personagem some; a BASE fica (bases vivem em this.bases)
      for (const [id, a] of this.remotos) if (!src.has(id)) { this.removerAtor(a); this.remotos.delete(id); if (this.falandoCom === a) { this.falandoCom = null; this.o.onFalarCom?.(null); } }
    }
  }

  private atualizarHud(now: number) {
    const { eu } = this;
    const atores = [eu, ...this.remotos.values()];
    for (const a of atores) {
      const s = this.proj(new THREE.Vector3(a.pos.x, 2.1 + a.sit * -0.3, a.pos.z));
      a.tag.style.left = s.x + "px"; a.tag.style.top = s.y + "px"; a.tag.style.display = this.menu || !s.vis ? "none" : "block";
      if (a !== eu) { const perto = eu.pos.distanceTo(a.pos) < 3.0; a.tag.style.borderColor = perto ? "#fff" : ""; a.tag.textContent = (perto ? "💬 " : "") + a.name; }
    }
    for (const [id, tag] of this.tagsBase) {
      const l = this.layouts.get(id)!; const s = this.proj(new THREE.Vector3(l.x, 3.4, l.z));
      tag.style.left = s.x + "px"; tag.style.top = s.y + "px"; tag.style.display = this.menu || !s.vis ? "none" : "block";
    }
    for (let i = this.falas.length - 1; i >= 0; i--) {
      const f = this.falas[i]!; if (now > f.ate) { f.el.remove(); this.falas.splice(i, 1); continue; }
      const p = this.proj(new THREE.Vector3(f.ator.pos.x, 2.4, f.ator.pos.z)); f.el.style.left = p.x + "px"; f.el.style.top = p.y + "px"; f.el.style.display = p.vis ? "block" : "none";
    }
    // menu projetado no monitor (retrato: fixo, sempre tocável)
    const m = this.o.els.menu;
    if (m && this.menu) {
      if (this.cam.aspect < 0.8) { m.style.display = "flex"; m.style.left = "50%"; m.style.top = "79%"; }
      else { const l = this.minhaBase; if (l) { const mw = localParaMundo(l, 0, -1.44); const p = this.proj(new THREE.Vector3(mw.x, 1.85, mw.z)); m.style.display = p.vis ? "flex" : "none"; if (p.vis) { m.style.left = p.x + "px"; m.style.top = p.y + "px"; } } }
    }
    // rótulo do monitor em hover
    const lab = this.o.els.monLabel;
    if (lab) {
      if (this.hoverBase && !this.menu) {
        const l = this.layouts.get(this.hoverBase)!; const mw = localParaMundo(l, 0, -1.44); const p = this.proj(new THREE.Vector3(mw.x, 2.7, mw.z));
        const meu = this.hoverBase === this.o.eu.id;
        lab.textContent = rotuloMonitor({ baseMinha: meu, pertoDaBase: this.perto, dono: this.pessoas.get(this.hoverBase)?.name ?? "alguém" });
        lab.dataset.longe = String(!(meu && this.perto));
        lab.style.left = Math.min(this.w - 110, Math.max(110, p.x)) + "px"; lab.style.top = p.y + "px"; lab.style.display = p.vis ? "block" : "none";
      } else lab.style.display = "none";
    }
  }

  dispose() {
    this.vivo = false; cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io?.disconnect();
    this.cleanups.forEach((f) => f());
    for (const a of [this.eu, ...this.remotos.values()]) if (a) this.removerAtor(a);
    for (const b of this.bases.values()) b.dispose(); for (const t of this.tagsBase.values()) t.remove();
    this.cena.dispose(); this.R.dispose(); this.R.forceContextLoss(); this.R.domElement.remove();
  }
}
