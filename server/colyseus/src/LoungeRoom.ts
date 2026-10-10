/**
 * LoungeRoom — a sala do CYBERESPAÇO no Colyseus: presença + posição (estado sincronizado) e o relay do
 * signaling da VOZ (WebRTC). Uma room POR SALA do app (`filterBy(["salaId"])` → o convite cai na mesma room).
 *  - entrada só com TOKEN assinado pelo app (sessão do NextAuth), da MESMA sala; teto de 5;
 *  - o estado (players por userId) vai pros clientes em patches a 20 Hz — quem entra já recebe todo mundo na hora
 *    (sem a assimetria "um vê, o outro não" do client event efêmero);
 *  - a mesma pessoa em 2 abas = 1 avatar (a aba nova assume, a antiga sai);
 *  - sair remove o avatar (as bases são do mapa/membros da sala, não do estado efêmero).
 */
import { Room, ServerError, matchMaker, type Client } from "@colyseus/core";
import { MapSchema, Schema, defineTypes } from "@colyseus/schema";
import { verificarToken, type PayloadToken } from "./token";
import { MAX_JOGADORES, sanitizarPose, sanitizarRtc } from "./regras";

export class Jogador extends Schema {
  declare userId: string; declare name: string; declare color: string;
  declare fundador: boolean; declare qg: boolean;
  declare x: number; declare z: number; declare facing: number; declare moving: boolean; declare sit: boolean;
  declare topo: boolean; declare ceu: boolean;
  declare voando: boolean; declare vooY: number; declare vooYaw: number;
  declare parada: boolean; declare npX: number; declare npY: number; declare npZ: number; declare npYaw: number;
  /** −1 = sem (no chão) */ declare jet: number; declare alt: number;
  declare falando: boolean;
  /** já mandou a 1ª pose de verdade? (antes disso o cliente mostra a pessoa sentada na própria base) */
  declare pronto: boolean;
  /** moto voadora: vaga (−1 = a pé), altura e rumo */ declare motoS: number; declare motoY: number; declare motoYaw: number; declare motoDe: string;
  /** a moto que estacionou (−1 = nenhuma): vaga, posição, rumo */ declare mlS: number; declare mlX: number; declare mlY: number; declare mlZ: number; declare mlYaw: number;
  /** DESCANSO no lounge: 0 em pé, 1 sentado, 2 deitado, +3 com o tablet (lib/cyber/descanso) */ declare desc: number;
  /** ARENA PvP (lib/cyber/combate): o golpe (seq×4 + nº; 0 = nenhum), a vida, a espada na mão */ declare atk: number; declare hp: number; declare arma: boolean;
  /** o MOVIMENTO TURBINADO: 0 nada, 1 sprint, 2 dash, 3 guarda, 4 hero landing, 5 decolagem */ declare mov: number;
  constructor() {
    super();
    this.userId = ""; this.name = ""; this.color = "#4aa3ff"; this.fundador = false; this.qg = false;
    this.x = 0; this.z = 0; this.facing = 0; this.moving = false; this.sit = true;
    this.topo = false; this.ceu = false;
    this.voando = false; this.vooY = 0; this.vooYaw = 0;
    this.parada = false; this.npX = 0; this.npY = 0; this.npZ = 0; this.npYaw = 0;
    this.jet = -1; this.alt = -1; this.falando = false; this.pronto = false;
    this.motoS = -1; this.motoY = 0; this.motoYaw = 0; this.motoDe = "";
    this.mlS = -1; this.mlX = 0; this.mlY = 0; this.mlZ = 0; this.mlYaw = 0;
    this.desc = 0; this.atk = 0; this.hp = 100; this.arma = false; this.mov = 0;
  }
  /** a pessoa do TOKEN (identidade e regalias vêm do servidor do app) */
  static de(p: PayloadToken) { const j = new Jogador(); j.userId = p.u; j.name = p.n; j.color = p.c; j.fundador = p.f; j.qg = p.q; return j; }
}
defineTypes(Jogador, {
  userId: "string", name: "string", color: "string", fundador: "boolean", qg: "boolean",
  x: "float32", z: "float32", facing: "float32", moving: "boolean", sit: "boolean",
  topo: "boolean", ceu: "boolean",
  voando: "boolean", vooY: "float32", vooYaw: "float32",
  parada: "boolean", npX: "float32", npY: "float32", npZ: "float32", npYaw: "float32",
  jet: "float32", alt: "float32", falando: "boolean", pronto: "boolean",
  motoS: "int8", motoY: "float32", motoYaw: "float32", motoDe: "string",
  mlS: "int8", mlX: "float32", mlY: "float32", mlZ: "float32", mlYaw: "float32",
  desc: "uint8", atk: "uint32", hp: "uint8", arma: "boolean", mov: "uint8",
});

export class EstadoLounge extends Schema {
  declare players: MapSchema<Jogador>;
  constructor() { super(); this.players = new MapSchema<Jogador>(); }
}
defineTypes(EstadoLounge, { players: { map: Jogador } });

type Auth = PayloadToken;

export class LoungeRoom extends Room<{ state: EstadoLounge }> {
  maxClients = MAX_JOGADORES;
  private salaId = "";
  /** userId → client (relay da voz e "a mesma pessoa em 2 abas") */
  private porUsuario = new Map<string, Client>();
  /** o segredo compartilhado com o app — definido UMA vez por quem monta o servidor (criarServidor), nunca por
   *  opções de criação/entrada (essas vêm do cliente e poderiam forjar o próprio segredo) */
  static segredo = "";

  async onCreate(options: { salaId?: string }) {
    this.salaId = String(options?.salaId ?? "");
    // UMA room por sala: com a room cheia, o matchmaking criaria uma 2ª room do mesmo convite (o 6º ficaria sozinho
    // numa cópia). Aqui a criação é recusada → o 6º recebe "cheia", igual ao teto do Pusher.
    const ja = (await matchMaker.query({ name: "lounge" })).some((r) => r.roomId !== this.roomId && (r.metadata as { salaId?: string } | undefined)?.salaId === this.salaId);
    if (ja) throw new ServerError(409, "sala cheia");
    await this.setMetadata({ salaId: this.salaId });
    this.patchRate = 50;   // 20 Hz
    this.setState(new EstadoLounge());

    this.onMessage("pose", (client, raw) => {
      const auth = client.auth as Auth | undefined, j = auth && this.state.players.get(auth.u);
      if (!auth || !j) return;
      const p = sanitizarPose(raw, auth.f);
      if (!p) return;
      j.x = p.x; j.z = p.z; j.facing = p.facing; j.moving = p.moving; j.sit = p.sit;
      j.topo = p.topo; j.ceu = p.ceu;
      j.voando = !!p.voo; if (p.voo) { j.vooY = p.voo.y; j.vooYaw = p.voo.yaw; }
      j.parada = !!p.naveParada; if (p.naveParada) { j.npX = p.naveParada.x; j.npY = p.naveParada.y; j.npZ = p.naveParada.z; j.npYaw = p.naveParada.yaw; }
      j.jet = p.jet ?? -1; j.alt = p.alt ?? -1; j.desc = p.desc; j.atk = p.atk; j.hp = p.hp; j.arma = p.arma; j.mov = p.mov; j.pronto = true;
      j.motoS = p.moto ? p.moto.s : -1; if (p.moto) { j.motoY = p.moto.y; j.motoYaw = p.moto.yaw; } j.motoDe = p.moto?.de ?? "";
      j.mlS = p.motoLargada ? p.motoLargada.s : -1; if (p.motoLargada) { j.mlX = p.motoLargada.x; j.mlY = p.motoLargada.y; j.mlZ = p.motoLargada.z; j.mlYaw = p.motoLargada.yaw; }
    });
    // "falando" (indicador no avatar) — a voz em si vai direto entre navegadores (WebRTC)
    this.onMessage("fala", (client, raw) => {
      const auth = client.auth as Auth | undefined, j = auth && this.state.players.get(auth.u);
      if (j) j.falando = j.pronto && !!(raw && typeof raw === "object" && (raw as { on?: unknown }).on === true);
    });
    // signaling da voz: offer/answer/ICE pro destinatário (por userId), com o remetente da SESSÃO. Só entre quem já está
    // NO MUNDO (`pronto` = mandou a 1ª pose): o novato no tutorial (a Zaeon só dele) não fala nem ouve ninguém até
    // cruzar o 1º portal — mesmo com um cliente modificado
    this.onMessage("rtc", (client, raw) => {
      const auth = client.auth as Auth | undefined; if (!auth) return;
      const m = sanitizarRtc(raw, new Set(this.porUsuario.keys()));
      if (!m || m.to === auth.u) return;
      if (!this.state.players.get(auth.u)?.pronto || !this.state.players.get(m.to)?.pronto) return;
      this.porUsuario.get(m.to)?.send("rtc", { from: auth.u, data: m.data });
    });
  }

  onAuth(_client: Client, options: { token?: unknown }) {
    const p = verificarToken(options?.token, LoungeRoom.segredo);
    if (!p) throw new ServerError(401, "token inválido ou expirado");
    if (p.s !== this.salaId) throw new ServerError(403, "token de outra sala");
    return p;
  }

  onJoin(client: Client, _options: unknown, auth: Auth) {
    const a = (client.auth as Auth | undefined) ?? auth;
    const antigo = this.porUsuario.get(a.u);
    if (antigo && antigo !== client) { try { antigo.leave(4000); } catch { /* já saiu */ } }
    this.porUsuario.set(a.u, client);
    this.state.players.set(a.u, Jogador.de(a));
  }

  onLeave(client: Client) {
    const a = client.auth as Auth | undefined; if (!a) return;
    if (this.porUsuario.get(a.u) !== client) return;   // a aba antiga saindo depois da nova assumir
    this.porUsuario.delete(a.u);
    this.state.players.delete(a.u);
  }
}
