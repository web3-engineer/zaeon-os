const coresCorpo = ["#79becd", "#e880a2", "#ee607e", "#a389d5", "#60c8b2", "#edbc76", "#d388b2"];
export const DURACAO_ANATOMIA = 22;
const TAU = Math.PI * 2;
const suavizar = (inicio: number, fim: number, tempo: number) => {
  const t = Math.max(0, Math.min(1, (tempo - inicio) / (fim - inicio)));
  return t * t * (3 - 2 * t);
};

export const pontosAnatomicos = [
  { nome: "cerebro", x: 0, z: -.018, y: 105, linhaY: 147, lado: "esquerda" },
  { nome: "coracao", x: .022, z: .025, y: 265, linhaY: 224, lado: "direita" },
  { nome: "bronquios", x: -.045, z: .014, y: 286, linhaY: 322, lado: "esquerda" },
  { nome: "estomago", x: .038, z: .038, y: 332, linhaY: 362, lado: "direita" },
  { nome: "rins", x: -.059, z: -.012, y: 375, linhaY: 420, lado: "esquerda" },
] as const;

export function linhaAnatomica(ponto: (typeof pontosAnatomicos)[number], x: number) {
  const esquerda = ponto.lado === "esquerda";
  return `M${x} ${ponto.y}H${esquerda ? 242 : 438}L${esquerda ? 183 : 497} ${ponto.linhaY}H${esquerda ? 74 : 606}`;
}

export function desenharAnatomia(
  ctx: CanvasRenderingContext2D,
  pontos: Int16Array,
  tempo: number,
  indicadores: HTMLDivElement,
  linhas: SVGPathElement[],
  marcadores: SVGCircleElement[],
  frases: HTMLElement,
) {
  ctx.clearRect(0, 0, 680, 950);
  const subida = suavizar(3.9, 5.3, tempo);
  const zoom = 1 + 3.8 * suavizar(4.35, 6.2, tempo);
  const angulo = -.48 + 1.15 * suavizar(0, 5, tempo);
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  const projetarX = (x: number, z: number) => c * x + s * z;
  const focoY = 264 - 159 * subida;
  const enquadramentoY = 264 + 59 * subida;
  const opacidade = Math.max(0, 1 - .68 * suavizar(5.3, 6.1, tempo) - .32 * suavizar(6.4, 7.3, tempo));
  const dissolucao = suavizar(5.3, 7.3, tempo);
  const dissolucaoCerebro = suavizar(6.05, 6.95, tempo);
  const opacidadeCerebro = 1 - dissolucaoCerebro;
  const revelar = 950 * suavizar(0, 1.2, tempo);
  if (opacidade > 0 || opacidadeCerebro > 0) {
    for (let grupo = 0; grupo < coresCorpo.length; grupo++) {
      const manterCerebro = grupo === 3;
      for (let frente = 0; frente < 2; frente++) {
        ctx.fillStyle = manterCerebro ? (frente ? "#359ed4" : "#20558c") : coresCorpo[grupo];
        ctx.globalAlpha = manterCerebro ? opacidadeCerebro * (frente ? 1 : .65) : opacidade * (frente ? .86 : .32);
        ctx.beginPath();
        for (let i = 0; i < pontos.length; i += 4) {
          if (pontos[i + 3] !== grupo) continue;
          const x = pontos[i] / 10000;
          const y = 920 - pontos[i + 1] * .05;
          const z = pontos[i + 2] / 10000;
          if (y > revelar || Number(c * z - s * x > 0) !== frente) continue;
          const dispersao = (manterCerebro ? dissolucaoCerebro : dissolucao) * (12 + i % 39);
          const raio = manterCerebro ? (frente ? 2.1 : 1.45) : (frente ? 1.8 : 1.35);
          ctx.rect(340 + projetarX(x, z) * 500 * zoom + (dispersao ? Math.sin(i) * dispersao : 0), enquadramentoY + (y - focoY) * zoom + (dispersao ? Math.cos(i) * dispersao : 0), raio, raio);
        }
        ctx.fill();
      }
    }
  }
  indicadores.style.opacity = String(suavizar(.7, 1.4, tempo) * (1 - suavizar(3.35, 3.9, tempo)));
  pontosAnatomicos.forEach((ponto, indice) => {
    const x = 340 + projetarX(ponto.x, ponto.z) * 500;
    linhas[indice]?.setAttribute("d", linhaAnatomica(ponto, x));
    marcadores[indice]?.setAttribute("cx", String(x));
  });

  frases.style.setProperty("--atlas-partes", String(suavizar(.8, 1.65, tempo) * (1 - suavizar(3.4, 3.95, tempo))));
  const frasesEmCena = [
    ["titulo", 0, 6.2],
    ["inicial", 6.25, 11.45],
    ["crescer", 11.55, 16],
    ["final", 16.1, DURACAO_ANATOMIA],
  ] as const;
  for (const [frase, inicio, fim] of frasesEmCena) {
    const entrada = inicio === 0 ? 1 : suavizar(inicio, inicio + .6, tempo);
    const saida = Number.isFinite(fim) ? suavizar(fim - .65, fim, tempo) : 0;
    frases.style.setProperty(`--atlas-frase-${frase}`, String(entrada * (1 - saida)));
    frases.style.setProperty(`--atlas-entrada-${frase}`, `${(1 - entrada) * 12}px`);
  }
  for (let i = 0; i < 14; i++) {
    const entrada = 11.3 + i * .3;
    const destaque = suavizar(entrada, entrada + .85, tempo) * (1 - suavizar(entrada + 2.2, entrada + 4.1, tempo));
    frases.style.setProperty(`--atlas-nota-${i + 1}`, String(destaque));
  }
  desenharChip(ctx, tempo);
  if (tempo > 6 && tempo < 7.65) {
    const encaixe = suavizar(6, 7.65, tempo);
    ctx.fillStyle = "#399fcd";
    ctx.globalAlpha = suavizar(6, 6.2, tempo) * (1 - suavizar(7.25, 7.65, tempo));
    ctx.beginPath();
    let vistos = 0;
    let indice = 0;
    for (let i = 0; i < pontos.length && indice < 110; i += 4) {
      if (pontos[i + 3] !== 3 || vistos++ % 16 !== 0) continue;
      const [destinoX, destinoY] = tracosChip[indice % tracosChip.length][0];
      const origemX = 340 + projetarX(pontos[i] / 10000, pontos[i + 2] / 10000) * 500 * zoom;
      const origemY = enquadramentoY + (920 - pontos[i + 1] * .05 - focoY) * zoom;
      const arco = Math.sin(encaixe * Math.PI) * (18 + indice % 29);
      ctx.rect(
        origemX + (340 + destinoX * 1.65 - origemX) * encaixe + Math.sin(indice) * arco,
        origemY + (429 + destinoY * 1.65 - origemY) * encaixe - arco,
        2.6, 2.6,
      );
      indice++;
    }
    ctx.fill();
  }
  desenharMoedas(ctx, tempo);
  ctx.globalAlpha = 1;
}


type Ponto = readonly [number, number];
type Traco = readonly Ponto[];

function elipse(x: number, y: number, rx: number, ry: number): Traco {
  return Array.from({ length: 33 }, (_, i) => {
    const a = i * TAU / 32;
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
  });
}

const tracosChip: Traco[] = [
  [[-104,-72],[82,-72],[108,-47],[108,76],[-105,76],[-105,-72]],
  [[-55,-36],[55,-36],[55,37],[-55,37],[-55,-36]],
  [[-38,-22],[38,-22],[38,22],[-38,22],[-38,-22]],
  ...Array.from({ length: 6 }, (_, i): Traco => {
    const x = -44 + i * 17;
    return [[x,-37],[x,-54],[x-13,-68]];
  }),
  ...Array.from({ length: 6 }, (_, i): Traco => {
    const x = -44 + i * 17;
    return [[x,37],[x,53],[x+13,69]];
  }),
  [[-55,-14],[-77,-14],[-91,-29],[-104,-29]],
  [[55,15],[76,15],[91,32],[108,32]],
  ...[-82, 84].flatMap((x) => [-53, 55].map((y) => elipse(x,y,5,5))),
  [[-31,-15],[29,-15],[29,16],[-31,16],[-31,-15]],
  ...Array.from({ length: 7 }, (_, i): Traco => [[-46 + i*15,-8],[-46 + i*15,8]]),
  [[-92,28],[-72,28],[-64,20],[-55,20]], [[55,-24],[76,-24],[93,-41]],
  [[-96,-63],[77,-63],[98,-42],[98,66],[-96,66],[-96,-63]],
  ...[-1, 1].flatMap((lado): Traco[] => Array.from({ length: 8 }, (_, i) => {
    const y = -28 + i * 8;
    return [[lado*40,y],[lado*57,y],[lado*66,y+lado*9],[lado*80,y+lado*9]];
  })),
  ...[-78,-66,66,78].flatMap((x) => [-48,46].map((y) => elipse(x,y,3,3))),
  [[-51,83],[52,83]], [[-51,79],[-51,88]], [[52,79],[52,88]],
  [[-121,-72],[-121,76]], [[-127,-72],[-115,-72]], [[-127,76],[-115,76]],
];

function desenharChip(ctx: CanvasRenderingContext2D, tempo: number) {
  const fase = tempo - 6.25;
  if (fase <= 0) return;
  const entrada = suavizar(0, 1.2, fase);
  const quebra = suavizar(11.4, 13.8, tempo);
  const saida = suavizar(12.35, 14.15, tempo);
  ctx.save();
  ctx.translate(340, 323 + entrada * 106);
  ctx.scale(1 + entrada * .65, 1 + entrada * .65);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = "#269bb4";
  for (const [indice, traco] of tracosChip.entries()) {
    const revelacao = suavizar(indice * .045, 1.05 + indice * .045, fase);
    if (revelacao <= 0) continue;
    const fragmento = indice % 3 - 1;
    ctx.save();
    ctx.translate(fragmento * 61 * quebra, (indice % 2 ? -24 : 24) * quebra);
    ctx.rotate(fragmento * .19 * quebra);
    ctx.globalAlpha = entrada * (1 - saida);
    const comprimento = traco.slice(1).reduce((total, [x, y], i) => total + Math.hypot(x - traco[i][0], y - traco[i][1]), 0);
    ctx.setLineDash(revelacao < 1 ? [comprimento] : []);
    ctx.lineDashOffset = comprimento * (1 - revelacao);
    ctx.beginPath();
    traco.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function desenharMoedas(ctx: CanvasRenderingContext2D, tempo: number) {
  for (let i = 0; i < 3; i++) {
    const fase = tempo - 12.3 - i * .27;
    if (fase <= 0 || fase >= 5.4) continue;
    const abertura = suavizar(0, 1.6, fase);
    const saida = suavizar(3.9, 5.4, fase);
    ctx.save();
    ctx.translate(340 + (i - 1) * 151 * abertura, 429 + (i === 1 ? -59 : 25) * abertura - saida * 28);
    ctx.scale(.26 + .74 * abertura, .26 + .74 * abertura);
    ctx.scale(.75 + .25 * Math.cos((1 - abertura) * Math.PI * 2), 1);
    ctx.globalAlpha = abertura * (1 - saida);
    ctx.fillStyle = "#102334";
    ctx.strokeStyle = "#62cfbf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#7f84c4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 39, 0, TAU);
    ctx.stroke();
    const cor = ctx.createLinearGradient(-25, 18, 25, -18);
    cor.addColorStop(0, "#a579ef");
    cor.addColorStop(1, "#61f7bc");
    ctx.fillStyle = cor;
    for (let barra = 0; barra < 3; barra++) {
      const y = -19 + barra * 14;
      const x = barra === 1 ? -25 : -17;
      const inclina = barra === 1 ? 8 : -8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 42, y);
      ctx.lineTo(x + 42 + inclina, y + 8);
      ctx.lineTo(x + inclina, y + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
