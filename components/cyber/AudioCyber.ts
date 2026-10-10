/**
 * AudioCyber — o áudio do cyberespaço em 3 camadas, com o áudio NATIVO do three:
 *  1. ESPACIAL: um THREE.AudioListener na câmera + THREE.PositionalAudio presos aos objetos (buraco negro, bases,
 *     cristais das bases, naves) — atenua com a distância e paneia sozinho quando se anda/orbita. Buffers MONO.
 *  2. LEITO ambiente (THREE.Audio 2D, estéreo) bem baixinho — abaixa enquanto a música da intro toca.
 *  3. EVENTOS: one-shots posicionais num ponto do mundo (passos, pulo, chegada…) ou 2D (UI), com teto de vozes.
 * Nada toca antes de um GESTO, e o engine só chama ativar() ao ENTRAR na cena 3D (nunca na landing/menu): só então o
 * listener (e o AudioContext do three) é criado, e os loops entram com fade-in (FADE_ENTRADA). Respeita `zaeon_sfx` (liga/desliga) e `zaeon_volume` (mestre).
 * Regras puras e a tabela dos sons em lib/cyber/audio.ts. dispose() para e desconecta tudo.
 */
import * as THREE from "three";
import { DISTANCIA, FADE_ENTRADA, HOLO_VOZ, VOZ_DROID, silabasDroid, SINTESE, SONS, SONS_ARQUIVO, emendarLoop, recortarCanal, recortePasso, criarLimiteVozes, lerPrefs, respostaImpulso, urlDoSom, type Dist, type NomeSom } from "@/lib/cyber/audio";
import { nivelDaBoca } from "@/lib/voice/nivelVoz";
export type LoopSom = { audio: THREE.Audio<GainNode | PannerNode> | null; alvo: number; atual: number; nome: NomeSom; vel?: number; taxa?: number; taxaAtual?: number; taxaVel?: number };

export type AudioCyberHandle = {
  /** já tem gesto + listener (e os buffers estão carregando/carregados) */
  readonly ativo: boolean;
  /** ativo E com o som ligado nas preferências (`zaeon_sfx`) */
  readonly ligado: boolean;
  /** o buffer desse som já chegou (dá pra tocar agora)? */
  temSom(nome: NomeSom): boolean;
  /** chamar no 1º gesto (ou já, se a intro destravou) */
  ativar(): void;
  /** loop preso a um objeto (posicional) ou 2D (`obj` null). Fica na fila até os buffers chegarem. */
  loop(nome: NomeSom, obj: THREE.Object3D | null, o?: { volume?: number; dist?: Dist }): LoopSom;
  /** desliga e solta um loop (o objeto dele saiu de cena: nave remota, base) */
  soltarLoop(l: LoopSom): void;
  /** muda o alvo de volume de um loop (0..1 × o volume base do som); o fade é suave, a cada quadro (`vel` = 1/s; padrão 2,5) */
  volumeLoop(l: LoopSom, alvo: number, vel?: number): void;
  /** afinação (playbackRate) de um loop, suave — ex.: o jato fica mais agudo subindo (`vel` = 1/s; padrão 4 — o motor
   *  da moto usa mais, pra troca de marcha soar seca) */
  taxaLoop(l: LoopSom, taxa: number, vel?: number): void;
  /** ajusta a distância de um loop posicional (ex.: a nave em que eu estou) */
  distanciaLoop(l: LoopSom, d: Dist): void;
  /** one-shot: posicional num ponto do mundo (`em`) ou 2D (`em` ausente); `seguir` = preso a um objeto que se move
   *  (ex.: a nave subindo — o som vai junto, não fica pra trás) */
  tocar(nome: NomeSom, em?: THREE.Vector3 | null, o?: { volume?: number; dist?: Dist; taxa?: number; seguir?: THREE.Object3D }): void;
  /** releitura das preferências (liga/desliga + volume mestre) */
  aplicarPrefs(): void;
  /** VOZ ao vivo de alguém (WebRTC) presa ao avatar dele: posicional (perto = mais alto). Antes do gesto que
   *  libera o áudio, fica na fila e liga sozinha depois. `remover()` desliga e solta. */
  voz(obj: THREE.Object3D, stream: MediaStream): { remover(): void };
  /** MÚSICA de um <audio> saindo POSICIONAL de várias caixas de som ao mesmo tempo (o toca-discos do lounge); antes
   *  do gesto que libera o áudio, espera e liga sozinha. `remover()` desliga. */
  musica(caixas: THREE.Object3D[], el: HTMLMediaElement, volume?: number): { remover(): void; pronta(): boolean; /** energia dos GRAVES agora (0..1) — as luzes e as caixas pulsam com ela */ nivel(): number };
  /** decodifica um áudio (WAV/MP3…) no contexto do three — null sem gesto ainda (sem listener) ou se não decodificar */
  decodificar(dados: ArrayBuffer): Promise<AudioBuffer | null>;
  /** a FALA DE HOLOGRAMA (a voz da Zaeon): `buf` toca posicional preso a `obj`, com passa-alta → reverb por convolução
   *  (wet/dry) → chorus leve (lib/cyber/audio HOLO_VOZ). `nivel()` = o volume da voz agora (0..1, pra boca); null =
   *  sem áudio (sem gesto ou som desligado nas preferências) */
  falaHolograma(buf: AudioBuffer, obj: THREE.Object3D, o?: { dist?: Dist; volume?: number }): FalaHolograma | null;
  /** a VOZ DO DROID (sem palavras): água correndo esculpida em "sílabas" + um tom alienígena, num delay e num reverb
   *  longos (lib/cyber/audio VOZ_DROID), posicional preso a `obj`. `dur` = segundos de "fala"; `furia` = a expulsão
   *  (mais grave). false = não tocou (sem gesto, som desligado ou os arquivos ainda não chegaram) */
  vozDroid(obj: THREE.Object3D, o?: { dur?: number; furia?: boolean; dist?: Dist; volume?: number }): boolean;
  /** fade dos loops (chamar a cada quadro) */
  atualizar(dt: number): void;
  dispose(): void;
};

export type FalaHolograma = { readonly duracao: number; nivel(): number; acabou(): boolean; parar(): void };

/** som de UI 2D fora da cena (ex.: "Estudar" — a cena é desmontada logo em seguida); respeita as preferências */
export function tocarUI(nome: NomeSom) {
  try {
    const p = lerPrefs((k) => localStorage.getItem(k)); if (!p.ligado) return;
    const a = new Audio(urlDoSom(nome)); a.volume = Math.min(1, SONS[nome].volume * p.volume); void a.play().catch(() => {});
  } catch { /* sem áudio */ }
}

/** um som SINTETIZADO (lib/cyber/audio SINTESE) num buffer do contexto `ctx` */
function sintetizarBuffer(ctx: BaseAudioContext, gerar: (sr: number) => Float32Array): AudioBuffer {
  const d = gerar(ctx.sampleRate), b = ctx.createBuffer(1, d.length, ctx.sampleRate); b.getChannelData(0).set(d); return b;
}
/** um som de ARQUIVO: baixa, decodifica e prepara (loop sem emenda, recorte do passo) — null se faltar */
async function baixarSom(ctx: BaseAudioContext, n: NomeSom): Promise<AudioBuffer | null> {
  try {
    const r = await fetch(urlDoSom(n)); if (!r.ok) return null;
    let buf = await ctx.decodeAudioData(await r.arrayBuffer());
    const em = SONS[n].emendar;
    if (em) {   // vira loop sem emenda (a ponta entra em crossfade no começo)
      const x = Math.round(em * buf.sampleRate), novo = ctx.createBuffer(buf.numberOfChannels, buf.length - Math.max(1, Math.min(Math.floor(buf.length / 3), x)), buf.sampleRate);
      for (let c = 0; c < buf.numberOfChannels; c++) novo.getChannelData(c).set(emendarLoop(buf.getChannelData(c), x));
      buf = novo;
    }
    if (SONS[n].recortar) {   // passo: só a batida principal, começando no ataque dela
      const rp = recortePasso(buf.getChannelData(0), buf.sampleRate), novo = ctx.createBuffer(buf.numberOfChannels, rp.n, buf.sampleRate);
      for (let c = 0; c < buf.numberOfChannels; c++) novo.getChannelData(c).set(recortarCanal(buf.getChannelData(c), rp, buf.sampleRate));
      buf = novo;
    }
    return buf;
  } catch { return null; }
}

/** os sons PREPARADOS antes do gesto (na tela de carregamento) — buffers independem do contexto que os criou */
const PREPARADOS = new Map<NomeSom, AudioBuffer>();
let preCarga: Promise<void> | null = null;
/**
 * Prepara TODOS os sons do cyberespaço ANTES de entrar (a tela de carregamento espera): os arquivos baixam e
 * decodificam em paralelo; os sintetizados são gerados um por vez, cedendo a vez pro navegador entre eles (a barra de
 * loading anda, a aba não congela). Usa um OfflineAudioContext (não precisa de gesto). Uma vez por página.
 */
export function preCarregarSons(progresso?: (feitos: number, total: number) => void): Promise<void> {
  if (preCarga) return preCarga;
  preCarga = (async () => {
    if (typeof OfflineAudioContext === "undefined") return;
    const ctx = new OfflineAudioContext(1, 1, 48000), sint = Object.entries(SINTESE) as [NomeSom, (sr: number) => Float32Array][];
    const total = sint.length + SONS_ARQUIVO.length; let feitos = 0;
    const conta = () => { feitos++; progresso?.(feitos, total); };
    const arquivos = Promise.all(SONS_ARQUIVO.map(async (n) => { const b = await baixarSom(ctx, n); if (b) PREPARADOS.set(n, b); conta(); }));
    for (const [n, gerar] of sint) {
      try { PREPARADOS.set(n, sintetizarBuffer(ctx, gerar)); } catch { /* sem esse som */ }
      conta(); await new Promise((r) => setTimeout(r, 0));
    }
    await arquivos;
  })();
  return preCarga;
}

export function criarAudioCyber(o: { camera: THREE.Camera; cena: THREE.Scene; low: boolean }): AudioCyberHandle {
  let listener: THREE.AudioListener | null = null, vivo = true, entrada = 0;   // entrada: 0→1 no fade-in dos loops
  const buffers = new Map<NomeSom, AudioBuffer>();
  const loops: { l: LoopSom; obj: THREE.Object3D | null; dist?: Dist; volBase: number }[] = [];
  const umaVez = new Set<{ a: THREE.Audio<GainNode | PannerNode>; holder: THREE.Object3D | null }>();
  const vozes = criarLimiteVozes(o.low ? 8 : 12);
  const vozesAoVivo = new Set<{ obj: THREE.Object3D; stream: MediaStream; a: THREE.PositionalAudio | null; el: HTMLAudioElement | null }>();
  /** liga a voz (quando já há listener): PositionalAudio na origem do stream + um <audio> MUDO — no Chrome, o
   *  áudio remoto do WebRTC só "anda" pro Web Audio se também estiver tocando num elemento */
  const ligarVoz = (v: { obj: THREE.Object3D; stream: MediaStream; a: THREE.PositionalAudio | null; el: HTMLAudioElement | null }) => {
    if (!listener || v.a) return;
    try {
      const el = new Audio(); el.muted = true; el.srcObject = v.stream; void el.play().catch(() => {}); v.el = el;
      const a = new THREE.PositionalAudio(listener); aplicarDist(a, DISTANCIA.voz); a.setMediaStreamSource(v.stream); a.setVolume(1.4);
      v.obj.add(a); v.a = a;
    } catch { /* sem áudio */ }
  };
  const ler = () => lerPrefs((k) => (typeof localStorage !== "undefined" ? localStorage.getItem(k) : null));
  let prefs = ler();
  type Musica = { caixas: THREE.Object3D[]; el: HTMLMediaElement; volume: number; src: MediaElementAudioSourceNode | null; as: THREE.PositionalAudio[]; an: AnalyserNode | null; buf: Uint8Array<ArrayBuffer> | null };
  const musicas = new Set<Musica>();
  /** um MediaElementSource só pode existir 1× por elemento: guarda e reaproveita */
  const fontesDeElemento = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  const ligarMusica = (m: Musica) => {
    if (!listener || m.src) return;
    try {
      const ctx = listener.context; let src = fontesDeElemento.get(m.el);
      if (!src) { src = ctx.createMediaElementSource(m.el); fontesDeElemento.set(m.el, src); }
      m.src = src;
      for (const c of m.caixas) { const a = new THREE.PositionalAudio(listener); aplicarDist(a, DISTANCIA.musica); a.setNodeSource(src as unknown as AudioBufferSourceNode); a.setVolume(m.volume); c.add(a); m.as.push(a); }
      // o "ouvido" das luzes: um analisador na mesma fonte (não sai som por ele)
      const an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.55; src.connect(an); m.an = an; m.buf = new Uint8Array(an.frequencyBinCount);
    } catch { /* sem áudio */ }
  };

  /** as falas de holograma tocando (dispose para todas) + a resposta ao impulso do reverb (uma por contexto) */
  const falasHolo = new Set<{ parar(): void }>();
  let irHolo: AudioBuffer | null = null, irDroid: AudioBuffer | null = null;
  /** a resposta ao impulso LONGA da voz do Droid (o espaço "de outra dimensão") */
  const respostaDroid = (ctx: AudioContext) => {
    if (irDroid && irDroid.sampleRate === ctx.sampleRate) return irDroid;
    const r = VOZ_DROID.reverb, n = Math.round(ctx.sampleRate * r.seg), b = ctx.createBuffer(2, n, ctx.sampleRate);
    b.getChannelData(0).set(respostaImpulso(ctx.sampleRate, r.seg, 31, r.preAtraso)); b.getChannelData(1).set(respostaImpulso(ctx.sampleRate, r.seg, 47, r.preAtraso));
    return (irDroid = b);
  };
  const respostaHolo = (ctx: AudioContext) => {
    if (irHolo && irHolo.sampleRate === ctx.sampleRate) return irHolo;
    const n = Math.round(ctx.sampleRate * HOLO_VOZ.reverbSeg), b = ctx.createBuffer(2, n, ctx.sampleRate);
    b.getChannelData(0).set(respostaImpulso(ctx.sampleRate, HOLO_VOZ.reverbSeg, 11)); b.getChannelData(1).set(respostaImpulso(ctx.sampleRate, HOLO_VOZ.reverbSeg, 23));
    return (irHolo = b);
  };

  const aplicarDist = (a: THREE.PositionalAudio, d: Dist) => { a.setRefDistance(d.ref); a.setMaxDistance(d.max); a.setRolloffFactor(d.rolloff); a.setDistanceModel(d.modelo ?? "inverse"); };
  const criarFonte = (nome: NomeSom, obj: THREE.Object3D | null, dist?: Dist): THREE.Audio<GainNode | PannerNode> | null => {
    const buf = buffers.get(nome); if (!buf || !listener) return null;
    const pos = SONS[nome].modo === "pos" && obj;
    const a: THREE.Audio<GainNode | PannerNode> = pos ? new THREE.PositionalAudio(listener) : new THREE.Audio(listener);
    if (pos) { aplicarDist(a as THREE.PositionalAudio, dist ?? DISTANCIA.padrao); obj!.add(a); }
    a.setBuffer(buf);
    const taxa = SONS[nome].taxa; if (taxa) a.setPlaybackRate(taxa);   // ex.: o leito retocado pra 432 Hz
    const fc = SONS[nome].filtro; if (fc) { const f = listener.context.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = fc; f.Q.value = 0.5; a.setFilter(f); }   // ex.: passos mais macios
    return a;
  };
  /** cria (quando der) as fontes dos loops que estavam esperando os buffers */
  const montarLoops = () => {
    for (const x of loops) {
      if (x.l.audio || !buffers.has(x.l.nome)) continue;
      const a = criarFonte(x.l.nome, x.obj, x.dist); if (!a) continue;
      a.setLoop(true); a.setVolume(0); x.l.audio = a; x.l.atual = 0;
      try { a.play(); } catch { /* contexto ainda suspenso */ }
    }
  };

  const api: AudioCyberHandle = {
    get ativo() { return !!listener; },
    get ligado() { return !!listener && prefs.ligado; },
    temSom(nome) { return !!listener && buffers.has(nome); },
    ativar() {
      if (listener || !vivo) return;
      listener = new THREE.AudioListener(); o.camera.add(listener);
      const ctx = listener.context; if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      api.aplicarPrefs();
      for (const v of vozesAoVivo) ligarVoz(v);   // vozes que chegaram antes do gesto
      for (const m of musicas) ligarMusica(m);
      // os sons já PREPARADOS na tela de carregamento (preCarregarSons): entram na hora, sem travar o clique
      for (const [n, b] of PREPARADOS) buffers.set(n, b);
      // o que faltou (sem pré-carga): sintetiza / baixa agora
      for (const [n, gerar] of Object.entries(SINTESE) as [NomeSom, (sr: number) => Float32Array][]) {
        if (buffers.has(n)) continue;
        try { buffers.set(n, sintetizarBuffer(ctx, gerar)); } catch { /* sem esse som */ }
      }
      montarLoops();
      for (const n of SONS_ARQUIVO) {
        if (buffers.has(n)) continue;
        void baixarSom(ctx, n).then((buf) => { if (!vivo || !buf) return; buffers.set(n, buf); montarLoops(); });
      }
    },
    loop(nome, obj, op = {}) {
      const l: LoopSom = { audio: null, alvo: 0, atual: 0, nome };
      loops.push({ l, obj, dist: op.dist, volBase: (op.volume ?? 1) * SONS[nome].volume });
      montarLoops();
      return l;
    },
    soltarLoop(l) {
      const i = loops.findIndex((x) => x.l === l); if (i < 0) return;
      const a = l.audio; if (a) { try { if (a.isPlaying) a.stop(); a.disconnect(); } catch { /* já */ } a.removeFromParent(); l.audio = null; }
      loops.splice(i, 1);
    },
    volumeLoop(l, alvo, vel) { l.alvo = Math.max(0, Math.min(1, alvo)); if (vel !== undefined) l.vel = vel; },
    taxaLoop(l, taxa, vel) { l.taxa = taxa; if (vel !== undefined) l.taxaVel = vel; },
    distanciaLoop(l, d) { if (l.audio && (l.audio as THREE.PositionalAudio).panner) aplicarDist(l.audio as THREE.PositionalAudio, d); },
    tocar(nome, em, op = {}) {
      if (!listener || !prefs.ligado || !buffers.has(nome) || !vozes.pegar()) return;
      let holder: THREE.Object3D | null = null;
      if (op.seguir && SONS[nome].modo === "pos") { holder = new THREE.Object3D(); op.seguir.add(holder); }
      else if (em && SONS[nome].modo === "pos") { holder = new THREE.Object3D(); holder.position.copy(em); o.cena.add(holder); }
      const a = criarFonte(nome, holder, op.dist ?? DISTANCIA.padrao);
      if (!a) { vozes.soltar(); holder?.removeFromParent(); return; }
      a.setVolume((op.volume ?? 1) * SONS[nome].volume);
      if (op.taxa) a.setPlaybackRate(op.taxa * (SONS[nome].taxa ?? 1));
      const item = { a, holder };
      umaVez.add(item);
      const fim = () => { if (!umaVez.delete(item)) return; vozes.soltar(); try { a.disconnect(); } catch { /* já */ } a.removeFromParent(); holder?.removeFromParent(); };
      a.onEnded = () => { a.isPlaying = false; fim(); };
      try { a.play(); } catch { fim(); }
    },
    voz(obj, stream) {
      const v = { obj, stream, a: null as THREE.PositionalAudio | null, el: null as HTMLAudioElement | null };
      vozesAoVivo.add(v); ligarVoz(v);
      return { remover() { vozesAoVivo.delete(v); try { v.a?.disconnect(); } catch { /* já */ } v.a?.removeFromParent(); if (v.el) { v.el.srcObject = null; } } };
    },
    musica(caixas, el, volume = 0.9) {
      const m: Musica = { caixas, el, volume, src: null, as: [], an: null, buf: null };
      musicas.add(m); ligarMusica(m);
      return {
        pronta: () => !!m.src,
        nivel() {   // média dos graves (~0–190 Hz: os 4 primeiros "baldes" de ~94 Hz), com um piso pra o silêncio dar 0
          if (!m.an || !m.buf) return 0;
          m.an.getByteFrequencyData(m.buf); let soma = 0; for (let i = 0; i < 4; i++) soma += m.buf[i]!;
          return Math.max(0, Math.min(1, (soma / 4 / 255 - 0.25) / 0.7));
        },
        remover() { musicas.delete(m); for (const a of m.as) { try { a.disconnect(); } catch { /* já */ } a.removeFromParent(); } m.as = []; try { m.src?.disconnect(); } catch { /* já */ } m.src = null; try { m.an?.disconnect(); } catch { /* já */ } m.an = null; },
      };
    },
    async decodificar(dados) {
      if (!listener) return null;
      try { return await listener.context.decodeAudioData(dados.slice(0)); } catch { return null; }   // decodeAudioData "consome" o buffer: vai uma cópia
    },
    falaHolograma(buf, obj, op = {}) {
      if (!listener || !prefs.ligado || !vivo) return null;
      const ctx = listener.context, nos: AudioNode[] = [];
      const no = <N extends AudioNode>(n: N) => { nos.push(n); return n; };
      const ganho = (v: number) => { const g = no(ctx.createGain()); g.gain.value = v; return g; };
      try {
        const src = no(ctx.createBufferSource()); src.buffer = buf;
        // passa-alta: tira o grave "de corpo" (a voz fica projetada)
        const pa = no(ctx.createBiquadFilter()); pa.type = "highpass"; pa.frequency.value = HOLO_VOZ.passaAlta; pa.Q.value = 0.7;
        // REVERB: seco + molhado (a convolução com a resposta ao impulso gerada no código)
        const conv = no(ctx.createConvolver()); conv.buffer = respostaHolo(ctx);
        const seco = ganho(1 - HOLO_VOZ.molhado), molhado = ganho(HOLO_VOZ.molhado), soma = ganho(1);
        src.connect(pa); pa.connect(seco).connect(soma); pa.connect(conv).connect(molhado).connect(soma);
        // CHORUS leve: um atraso de ~8 ms balançando devagar, misturado baixinho por cima
        const saida = ganho(1), atraso = no(ctx.createDelay(0.05)), coro = ganho(HOLO_VOZ.chorusMix), prof = ganho(HOLO_VOZ.chorusProfMs / 1000);
        atraso.delayTime.value = HOLO_VOZ.chorusMs / 1000;
        const lfo = no(ctx.createOscillator()); lfo.frequency.value = HOLO_VOZ.chorusHz; lfo.connect(prof).connect(atraso.delayTime);
        soma.connect(saida); soma.connect(atraso).connect(coro).connect(saida);
        // o "ouvido" da boca: a voz SECA (antes do efeito — o reverb não deixa a boca aberta), sem ir pros alto-falantes
        const an = no(ctx.createAnalyser()); an.fftSize = 512; src.connect(an);
        const amostras = new Uint8Array(an.fftSize);
        // sai posicional, presa ao rosto do holograma
        const a = new THREE.PositionalAudio(listener); aplicarDist(a, op.dist ?? DISTANCIA.holograma);
        a.setNodeSource(saida as unknown as AudioBufferSourceNode); a.setVolume((op.volume ?? 1) * HOLO_VOZ.volume); obj.add(a);
        let tocando = true, solto = false, pico = 0.05, timer: ReturnType<typeof setTimeout> | null = null;
        const soltar = () => {
          if (solto) return; solto = true; tocando = false; if (timer) clearTimeout(timer); falasHolo.delete(h);
          try { src.stop(); } catch { /* já parou */ } try { lfo.stop(); } catch { /* já */ }
          try { a.disconnect(); } catch { /* já */ } for (const n of nos) { try { n.disconnect(); } catch { /* já */ } }
          a.removeFromParent();
        };
        const h = {
          duracao: buf.duration,
          nivel() {
            if (!tocando) return 0;
            an.getByteTimeDomainData(amostras); let s2 = 0;
            for (let i = 0; i < amostras.length; i++) { const v = (amostras[i]! - 128) / 128; s2 += v * v; }
            const rms = Math.sqrt(s2 / amostras.length), n = nivelDaBoca(rms, pico); pico = Math.max(rms, pico * 0.996, 0.05);
            return n;
          },
          acabou: () => !tocando,
          parar: soltar,
        };
        // acabou a voz: a cauda do reverb ainda soa um pouco; depois solta tudo
        src.onended = () => { tocando = false; if (!solto) timer = setTimeout(soltar, (HOLO_VOZ.reverbSeg + 0.2) * 1000); };
        falasHolo.add(h);
        if (ctx.state === "suspended") void ctx.resume().catch(() => {});
        lfo.start(); src.start();
        return h;
      } catch {
        for (const n of nos) { try { n.disconnect(); } catch { /* já */ } }
        return null;
      }
    },
    vozDroid(obj, op = {}) {
      const agua = buffers.get("droid-agua");
      if (!listener || !prefs.ligado || !vivo || !agua) return false;
      const ctx = listener.context, v = VOZ_DROID, furia = !!op.furia, nos: AudioNode[] = [];
      const no = <N extends AudioNode>(n: N) => { nos.push(n); return n; };
      const ganho = (x: number) => { const g = no(ctx.createGain()); g.gain.value = x; return g; };
      const dur = Math.max(0.4, op.dur ?? 2), t0 = ctx.currentTime + 0.03, taxa = furia ? v.furia.taxa : 1, forca = furia ? v.furia.ganho : 1;
      let solto = false, timer: ReturnType<typeof setTimeout> | null = null;
      const fontes: AudioScheduledSourceNode[] = [];
      try {
        // ÁGUA → dois formantes (bandpass largos) que só derivam devagar, em ondas
        const sa = no(ctx.createBufferSource()); sa.buffer = agua; sa.playbackRate.value = taxa; fontes.push(sa);
        const f1 = no(ctx.createBiquadFilter()), f2 = no(ctx.createBiquadFilter()), env = ganho(0);
        for (const f of [f1, f2]) { f.type = "bandpass"; f.Q.value = v.q; sa.connect(f); f.connect(env); }
        const sil = silabasDroid(dur, Math.floor(Math.random() * 1e9), { formantes: furia ? v.furia.formantes : 1 });
        f1.frequency.setValueAtTime(sil[0]!.f1, t0); f2.frequency.setValueAtTime(sil[0]!.f2, t0);
        for (const x of sil) { const t = t0 + x.t; f1.frequency.setTargetAtTime(x.f1, t, v.suave); f2.frequency.setTargetAtTime(x.f2, t, v.suave); env.gain.setTargetAtTime(x.ganho * forca, t, x.t === 0 ? 0.12 : v.suave); }
        env.gain.setTargetAtTime(0, t0 + dur - 0.3, 0.25);   // some devagar (o eco e o reverb continuam)
        const usar = dur * taxa + 0.2;
        sa.start(t0, Math.random() * Math.max(0, agua.duration - usar), usar);
        // o TOM ALIENÍGENA por baixo, desafinado a cada fala
        const soma = ganho(1); env.connect(soma);
        const alien = buffers.get("droid-alien");
        if (alien) {
          const sb = no(ctx.createBufferSource()); sb.buffer = alien; fontes.push(sb);
          sb.playbackRate.value = (v.alien.taxa[0] + (v.alien.taxa[1] - v.alien.taxa[0]) * Math.random()) * taxa;
          const ga = ganho(0); ga.gain.setValueAtTime(0, t0); ga.gain.linearRampToValueAtTime(v.alien.ganho * forca, t0 + 0.35); ga.gain.setTargetAtTime(0, t0 + dur - 0.2, 0.25);
          sb.connect(ga).connect(soma);
          const usarA = (dur + 0.6) * sb.playbackRate.value;
          sb.start(t0, Math.random() * Math.max(0, alien.duration - usarA), usarA);
        }
        // DELAY com repetição (o retorno passa por um passa-baixa: cada eco mais escuro) e REVERB longo, mais molhado que seco
        const dl = no(ctx.createDelay(1)), fb = ganho(v.delay.retorno), lp = no(ctx.createBiquadFilter()), ecos = ganho(v.delay.mix), pre = ganho(1);
        dl.delayTime.value = v.delay.seg; lp.type = "lowpass"; lp.frequency.value = v.delay.corte;
        soma.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(ecos); soma.connect(pre); ecos.connect(pre);
        const conv = no(ctx.createConvolver()); conv.buffer = respostaDroid(ctx);
        const seco = ganho(1 - v.reverb.molhado), molhado = ganho(v.reverb.molhado), saida = ganho(1);
        pre.connect(seco).connect(saida); pre.connect(conv).connect(molhado).connect(saida);
        const a = new THREE.PositionalAudio(listener); aplicarDist(a, op.dist ?? DISTANCIA.holograma);
        a.setNodeSource(saida as unknown as AudioBufferSourceNode); a.setVolume((op.volume ?? 1) * v.volume * SONS["droid-agua"].volume); obj.add(a);
        const h = { parar() {
          if (solto) return; solto = true; if (timer) clearTimeout(timer); falasHolo.delete(h);
          for (const f of fontes) { try { f.stop(); } catch { /* já */ } }
          try { a.disconnect(); } catch { /* já */ } for (const n of nos) { try { n.disconnect(); } catch { /* já */ } }
          a.removeFromParent();
        } };
        falasHolo.add(h);
        // solta depois da cauda (os ecos do delay + o reverb)
        timer = setTimeout(h.parar, (dur + v.reverb.seg + v.delay.seg * 12 + 0.5) * 1000);
        if (ctx.state === "suspended") void ctx.resume().catch(() => {});
        return true;
      } catch {
        for (const f of fontes) { try { f.stop(); } catch { /* já */ } }
        for (const n of nos) { try { n.disconnect(); } catch { /* já */ } }
        return false;
      }
    },
    aplicarPrefs() {
      prefs = ler();
      if (listener) listener.setMasterVolume(prefs.ligado ? prefs.volume : 0);
    },
    atualizar(dt) {
      if (!listener) return;
      entrada = Math.min(1, entrada + dt / FADE_ENTRADA);
      const k = Math.min(1, dt * 2.5);   // fades suaves (~0,4 s) — nada liga/desliga seco
      for (const x of loops) {
        const a = x.l.audio; if (!a) continue;
        x.l.atual += (x.l.alvo - x.l.atual) * (x.l.vel ? Math.min(1, dt * x.l.vel) : k);
        a.setVolume(x.l.atual * x.volBase * entrada);
        if (x.l.taxa !== undefined) { const tA = x.l.taxaAtual ?? x.l.taxa; x.l.taxaAtual = tA + (x.l.taxa - tA) * Math.min(1, dt * (x.l.taxaVel ?? 4)); a.setPlaybackRate(x.l.taxaAtual); }
      }
    },
    dispose() {
      vivo = false;
      for (const x of loops) { const a = x.l.audio; if (!a) continue; try { if (a.isPlaying) a.stop(); a.disconnect(); } catch { /* já */ } a.removeFromParent(); x.l.audio = null; }
      for (const it of umaVez) { try { if (it.a.isPlaying) it.a.stop(); it.a.disconnect(); } catch { /* já */ } it.a.removeFromParent(); it.holder?.removeFromParent(); }
      umaVez.clear(); loops.length = 0; buffers.clear();
      for (const v of vozesAoVivo) { try { v.a?.disconnect(); } catch { /* já */ } v.a?.removeFromParent(); if (v.el) v.el.srcObject = null; }
      vozesAoVivo.clear();
      for (const m of musicas) { for (const a of m.as) { try { a.disconnect(); } catch { /* já */ } a.removeFromParent(); } try { m.src?.disconnect(); } catch { /* já */ } }
      musicas.clear();
      for (const f of [...falasHolo]) f.parar();
      if (listener) { listener.removeFromParent(); listener = null; }   // o AudioContext do three é global (fica pro próximo)
    },
  };
  return api;
}
