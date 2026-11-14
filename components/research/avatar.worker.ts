/// <reference lib="webworker" />
/**
 * O WORKER da avatar do painel dos documentos: a cena 3D inteira (o VRM, a animação, o holograma) roda AQUI, num
 * OffscreenCanvas transferido pelo painel — a thread principal (o chat) só troca mensagens (components/research/
 * avatarMensagens). O dono: "a geração 3D não pode compartilhar essa thread".
 */
import { criarCenaAvatar, type CenaAvatar } from "./avatarCena";
import type { DaCena, ParaCena } from "./avatarMensagens";

// o GLTFLoader do three, no Safari, carrega as texturas com <img> (que não existe num worker): aqui ele usa o
// ImageBitmapLoader (o Safari 17+, que é quem tem OffscreenCanvas com WebGL, suporta)
try {
  const ua = self.navigator.userAgent;
  if (/^((?!chrome|android).)*safari/i.test(ua)) Object.defineProperty(self.navigator, "userAgent", { get: () => ua.replace(/Safari/gi, "Webkit") });
} catch { /* sem como trocar: fica como está */ }

const enviar = (m: DaCena) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);
let cena: CenaAvatar | null = null;

self.onmessage = (e: MessageEvent<ParaCena>) => {
  const m = e.data;
  switch (m.tipo) {
    case "iniciar":
      cena?.destruir();
      cena = criarCenaAvatar(m.canvas, { largura: m.largura, altura: m.altura, dpr: m.dpr, persona: m.persona, vitrine: m.vitrine, quadro: m.quadro, aoEstado: (estado) => enviar({ tipo: "estado", estado }) });
      break;
    case "tamanho": cena?.tamanho(m.largura, m.altura); break;
    case "visivel": cena?.visivel(m.visivel); break;
    case "persona": cena?.persona(m.persona); break;
    case "olhar": cena?.olhar(m.x, m.y); break;
    case "fala": cena?.fala(m.v, m.falando); break;
    case "sinais": cena?.sinais(m.lendo, m.escrevendo); break;
    case "reagir": cena?.reagir(); break;
    case "gesto": cena?.gesto(m.nome); break;
    case "diag": if (cena) enviar(cena.diag()); break;
    case "saltar": cena?.saltar(m.t); break;
    case "fim": cena?.destruir(); cena = null; self.close(); break;
  }
};
