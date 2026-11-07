/**
 * lib/anatomia/cena.ts — o VISUALIZADOR 3D do atlas. Three.js imperativo, sem React.
 *
 * Porte de `app/scene.tsx` do human-atlas (MIT — procedência completa em lib/anatomia/atlas.ts).
 * A arquitetura é a deles e é o que torna 2.234 malhas viáveis num navegador de celular:
 *
 *  ┌─ UM MESH POR SISTEMA, não um por peça. As malhas de um sistema são FUNDIDAS (mergeGeometries)
 *  │  num único buffer, e cada vértice leva um atributo `partIndex` dizendo de que peça veio.
 *  │  Resultado: 15 draw calls em vez de 2.234. É a diferença entre 60 fps e 6.
 *  │
 *  ├─ O ESTADO DE CADA PEÇA VIVE NUMA TEXTURA. `partState` é uma DataTexture RGBA-float com uma
 *  │  coluna por peça: xyz = deslocamento da explosão, w = visível ou não. O vertex shader soma o
 *  │  deslocamento e o fragment shader DESCARTA o que estiver invisível. Ligar um sistema, mover o
 *  │  cursor da explosão ou isolar uma estrutura é escrever num Float32Array e marcar a textura —
 *  │  nenhuma geometria é reconstruída, nenhum buffer sobe para a GPU de novo.
 *  │
 *  ├─ MALHAS DE PICKING SEPARADAS. O mesh fundido não serve para raycast (um acerto não diz qual
 *  │  peça foi), então cada peça guarda também um `Mesh` invisível, com um teste de caixa barato
 *  │  antes do raycast caro.
 *  │
 *  └─ NORMAIS EM INT16 NORMALIZADO. Metade da memória de um Float32, com a GPU fazendo a conversão.
 *
 * ──────────────── O que eu separei daqui, e por quê ────────────────
 * A aritmética da câmera está em `vista.ts`, o empacotamento em `explosao.ts`, o toque em
 * `toque.ts`, o download em `baixar.ts` e a regra de visibilidade em `estado.ts`. Tudo isso no
 * original mora dentro deste arquivo. Separado, é a parte que dá para PROVAR sem GPU — e sobra
 * aqui só o que de fato precisa de WebGL. A regra de visibilidade em particular: `pecaVisivel` é
 * a MESMA função que o painel usa para contar, então o que é clicável e o que é desenhado não
 * podem divergir.
 *
 * ⚠️ EDUCACIONAL. Referência de adulto masculino, parcial. Ver o cabeçalho de atlas.ts.
 */
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SISTEMAS, type Atlas, type EstadoCena, type Vista } from "@/lib/anatomia/atlas";
import { decodificarPedaco, saberDescomprimir } from "@/lib/anatomia/baixar";
import { criarLayoutDeExplosao } from "@/lib/anatomia/explosao";
import { pecaVisivel } from "@/lib/anatomia/estado";
import { DiscriminadorDeToque } from "@/lib/anatomia/toque";
import { LARGURA_CELULAR, enquadrar } from "@/lib/anatomia/vista";

export type OpcoesDaCena = {
  atlas: Atlas;
  /** o elemento que recebe o canvas. A cena mede ELE, não a janela. */
  hospede: HTMLElement;
  /** lido a cada quadro — o padrão de ref do original, para o loop não fechar sobre estado velho */
  estadoAtual: () => EstadoCena;
  aoSelecionar: (idDaPeca: string) => void;
  aoProgredir: (porcento: number) => void;
  aoErrar: (mensagem: string) => void;
};

/**
 * O fundo claro é o DELES e fica como está de propósito: as cores dos 15 sistemas (osso #e2d9ba,
 * músculo #a85b50) foram escolhidas contra este cinza. Trocar o fundo pelo escuro da casa
 * arruinaria a paleta do dado — e a paleta vem com o dado, não com o nosso tema.
 */
const FUNDO = "#f2f3f3";

/** Quantos pedaços binários baixar ao mesmo tempo. Valor do original. */
const PARALELAS = 3;

/** Acima deste ponto da explosão o botão esquerdo deixa de girar e passa a arrastar. */
const LIMITE_DE_ARRASTO = 0.8;

export function montarCena(o: OpcoesDaCena): () => void {
  const { atlas, hospede: el } = o;

  let descartada = false, quadro = 0, sujo = true, pronta = false;
  let ultimaVista = "", ultimoReset = -1, ultimoIsolar = "", chaveDoLayout = "", quantidade = 0;
  let ultimoEstado: EstadoCena | null = null;
  const aborto = new AbortController();

  let renderizador: T.WebGLRenderer;
  try {
    renderizador = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    o.aoErrar("este navegador não conseguiu iniciar o visualizador 3D. Tente um navegador com WebGL habilitado.");
    return () => {};
  }

  renderizador.setPixelRatio(Math.min(devicePixelRatio, el.clientWidth < LARGURA_CELULAR ? 1.5 : 2));
  renderizador.setClearColor(FUNDO);
  renderizador.outputColorSpace = T.SRGBColorSpace;
  renderizador.toneMapping = T.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.12;
  el.appendChild(renderizador.domElement);
  renderizador.domElement.setAttribute(
    "aria-label",
    "Anatomia humana interativa. Arraste para girar, use a roda ou a pinça para aproximar, e toque numa estrutura para inspecioná-la.",
  );

  const cena = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.005, 100);
  const controles = new OrbitControls(camera, renderizador.domElement);
  camera.position.set(1.4, 1.05, 3.6);
  controles.target.set(0, 0.85, 0);
  controles.enableDamping = true;
  controles.dampingFactor = 0.085;
  controles.minDistance = 0.07;
  controles.maxDistance = 40;
  controles.maxPolarAngle = Math.PI * 0.96;
  controles.addEventListener("change", () => { sujo = true; });

  // ambiente: ilumina as superfícies internas sem precisar de mais luzes direcionais
  const pmrem = new T.PMREMGenerator(renderizador);
  const sala = new RoomEnvironment();
  const ambiente = pmrem.fromScene(sala, 0.04);
  cena.environment = ambiente.texture;
  sala.dispose();
  pmrem.dispose();

  cena.add(new T.HemisphereLight(0xffffff, 0xa7acb2, 1.05));
  const principal = new T.DirectionalLight(0xfffaf4, 2.3);
  principal.position.set(-2, 4, 3);
  cena.add(principal);
  const contra = new T.DirectionalLight(0xe9f0ff, 1.8);
  contra.position.set(2, 2, -3);
  cena.add(contra);

  // o palco: chão, plataforma e dois anéis. Desaparecem na explosão e no isolamento.
  const chao = new T.Mesh(new T.CircleGeometry(30, 96), new T.MeshStandardMaterial({ color: 0xd5d9dc, roughness: 1 }));
  chao.rotation.x = -Math.PI / 2; chao.position.y = -0.019; cena.add(chao);
  const plataforma = new T.Mesh(
    new T.CylinderGeometry(0.68, 0.7, 0.028, 100),
    new T.MeshStandardMaterial({ color: 0xeeeeec, metalness: 0.12, roughness: 0.67 }),
  );
  plataforma.position.y = -0.016; cena.add(plataforma);
  const anel = new T.Mesh(new T.RingGeometry(0.63, 0.632, 128), new T.MeshBasicMaterial({ color: 0x8c969f, transparent: true, opacity: 0.4, side: T.DoubleSide }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.001; cena.add(anel);
  const anelInterno = new T.Mesh(new T.RingGeometry(0.55, 0.551, 128), new T.MeshBasicMaterial({ color: 0xa4aeb8, transparent: true, opacity: 0.16, side: T.DoubleSide }));
  anelInterno.rotation.x = -Math.PI / 2; anelInterno.position.y = 0.001; cena.add(anelInterno);
  const palco = [chao, plataforma, anel, anelInterno];

  // ── o estado de cada peça, em textura ──
  const largura = T.MathUtils.ceilPowerOfTwo(atlas.parts.length);
  const dados = new Float32Array(largura * 4);                   // xyz = deslocamento, w = visível
  const texturaDeEstado = new T.DataTexture(dados, largura, 1, T.RGBAFormat, T.FloatType);
  texturaDeEstado.needsUpdate = true;
  const dadosDeSelecao = new Uint8Array(largura * 4);
  const texturaDeSelecao = new T.DataTexture(dadosDeSelecao, largura, 1);
  texturaDeSelecao.needsUpdate = true;

  const materiais: T.Material[] = [];
  const geometrias: T.BufferGeometry[] = [];
  const alvosDeClique: (T.Mesh | undefined)[] = [];
  const centros = atlas.parts.map((p) =>
    new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(0.5),
  );
  const caixas = atlas.parts.map((p) => new T.Box3(new T.Vector3().fromArray(p.bounds[0]), new T.Vector3().fromArray(p.bounds[1])));
  const destinos: T.Vector3[] = [];
  let packLargura = 1, packAltura = 1;

  // pontinhos que marcam cada peça no inventário espalhado, para peças pequenas não desaparecerem
  const posicoesDosPontos = new Float32Array(atlas.parts.length * 3);
  const geometriaDosPontos = new T.BufferGeometry();
  geometriaDosPontos.setAttribute("position", new T.BufferAttribute(posicoesDosPontos, 3));
  const materialDosPontos = new T.PointsMaterial({ color: 0x64748b, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.72, depthTest: false });
  // recorta o quadrado do ponto num círculo
  materialDosPontos.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      "#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;",
    );
  };
  const pontos = new T.Points(geometriaDosPontos, materialDosPontos);
  pontos.frustumCulled = false; pontos.renderOrder = 10; pontos.visible = false; cena.add(pontos);

  const dica = document.createElement("div");
  dica.className = "anatomia-dica"; dica.setAttribute("role", "tooltip"); dica.hidden = true;
  el.appendChild(dica);

  type Alvo = { indice: number; x: number; y: number; esq: number; dir: number; topo: number; base: number };
  let alvos: Alvo[] = [];
  const projetado = new T.Vector3();

  /** O alvo de tela mais próximo do cursor, dentro de um raio. Usado na dica e no clique difícil. */
  const acharAlvo = (x: number, y: number, raio: number): number => {
    let melhor = -1, nota = Infinity;
    for (const t of alvos) {
      const dx = Math.max(t.esq - x, 0, x - t.dir), dy = Math.max(t.topo - y, 0, y - t.base);
      const d = Math.hypot(dx, dy);
      if (d > raio) continue;
      const candidata = d + Math.hypot(t.x - x, t.y - y) * 0.025;
      if (candidata < nota) { nota = candidata; melhor = t.indice; }
    }
    return melhor;
  };

  /** Um material por sistema, com o shader que lê a textura de estado. */
  const materialDe = (sistema: string): T.MeshStandardMaterial => {
    const pele = sistema === "integumentary";
    const m = new T.MeshStandardMaterial({
      color: SISTEMAS.find((s) => s.id === sistema)?.cor ?? "#aebbb8",
      metalness: 0.08, roughness: 0.53, side: T.DoubleSide,
      transparent: pele, opacity: pele ? 0.1 : 1, depthWrite: !pele,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.partState = { value: texturaDeEstado };
      shader.uniforms.selectionState = { value: texturaDeSelecao };
      shader.uniforms.stateWidth = { value: largura };
      shader.vertexShader =
        "attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;",
      );
      shader.fragmentShader = "varying float partVisible; varying float partSelected;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.85, 0.78), partSelected * 0.75);",
      );
    };
    materiais.push(m);
    return m;
  };
  const porSistema = new Map(SISTEMAS.map((s) => [s.id as string, materialDe(s.id)]));

  // ── carregamento progressivo dos 15 pedaços ──
  let carregados = 0;
  const carregarPedaco = async (indice: number): Promise<void> => {
    const pedaco = atlas.chunks[indice];
    const comprimido = !!pedaco.gzip && saberDescomprimir();
    const resposta = await fetch(comprimido ? pedaco.gzip! : pedaco.url, { signal: aborto.signal });
    const bytes = await decodificarPedaco(resposta, pedaco.bytes, comprimido);
    if (descartada) return;

    const grupos = new Map<string, T.BufferGeometry[]>();
    atlas.parts.forEach((p, i) => {
      if (p.chunk !== indice) return;
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(new Float32Array(bytes, p.positions, p.vertexCount * 3), 3));
      // normais em Int16 NORMALIZADO: metade da memória, conversão feita pela GPU
      g.setAttribute("normal", new T.BufferAttribute(new Int16Array(bytes, p.normals, p.vertexCount * 3), 3, true));
      g.setIndex(new T.BufferAttribute(new Uint32Array(bytes, p.indices, p.indexCount), 1));
      g.boundingBox = caixas[i].clone();
      g.computeBoundingSphere();

      const clique = new T.Mesh(g);
      clique.matrixAutoUpdate = false;
      alvosDeClique[i] = clique;
      geometrias.push(g);

      g.setAttribute("partIndex", new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i), 1));
      const lista = grupos.get(p.system) ?? [];
      lista.push(g);
      grupos.set(p.system, lista);
    });

    grupos.forEach((gs, sistema) => {
      const fundida = mergeGeometries(gs, false);
      if (!fundida) throw new Error("não foi possível montar a geometria da anatomia");
      geometrias.push(fundida);
      const mesh = new T.Mesh(fundida, porSistema.get(sistema));
      mesh.frustumCulled = false;
      cena.add(mesh);
    });

    ultimoEstado = null;
    carregados++;
    o.aoProgredir(Math.round((carregados / atlas.chunks.length) * 100));
    sujo = true;
  };

  void (async () => {
    try {
      let cursor = 0;
      await Promise.all(
        Array.from({ length: PARALELAS }, async () => {
          while (cursor < atlas.chunks.length) await carregarPedaco(cursor++);
        }),
      );
      if (!descartada) { pronta = true; sujo = true; }
    } catch (e) {
      if (!descartada && !aborto.signal.aborted) {
        o.aoErrar(e instanceof Error ? e.message : "não foi possível carregar a anatomia");
      }
    }
  })();

  /** Põe a câmera onde `vista.ts` disser. Toda a conta está lá; aqui só se aplica. */
  const enquadrarCamera = (vista: Vista, extensao = 0) => {
    const q = enquadrar({
      larguraTela: el.clientWidth, alturaTela: el.clientHeight, fov: camera.fov,
      extensao, packLargura, packAltura, vista,
    });
    controles.target.set(...q.alvo);
    camera.position.copy(controles.target).addScaledVector(new T.Vector3(...q.direcao), q.distancia);
    controles.update();
    sujo = true;
  };

  const redimensionar = () => {
    chaveDoLayout = ""; ultimoEstado = null;
    renderizador.setPixelRatio(Math.min(devicePixelRatio, el.clientWidth < LARGURA_CELULAR || el.clientHeight < 600 ? 1.5 : 2));
    camera.aspect = (el.clientWidth || 1) / (el.clientHeight || 1);
    camera.updateProjectionMatrix();
    renderizador.setSize(el.clientWidth, el.clientHeight);
    enquadrarCamera(o.estadoAtual().view, quantidade);
  };
  const observador = new ResizeObserver(redimensionar);
  observador.observe(el);

  // ── ponteiro: girar, arrastar e selecionar pelo mesmo botão ──
  const raio = new T.Raycaster(), ponteiro = new T.Vector2(), toque = new DiscriminadorDeToque();
  const caixaNoMundo = new T.Box3(), pontoDeAcerto = new T.Vector3();

  const aoDescer = (e: PointerEvent) => {
    dica.hidden = true;
    toque.down(e.pointerId, e.clientX, e.clientY, e.pointerType === "touch" ? 12 : 5);
  };
  const aoMover = (e: PointerEvent) => {
    toque.move(e.pointerId, e.clientX, e.clientY);
    if (e.buttons || quantidade < 0.5 || e.pointerType === "touch") { dica.hidden = true; return; }
    const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const indice = acharAlvo(x, y, 12);
    dica.hidden = indice < 0;
    renderizador.domElement.style.cursor = indice < 0 ? "grab" : "pointer";
    if (indice >= 0) {
      dica.textContent = atlas.parts[indice].name;
      dica.style.left = `${Math.max(8, Math.min(x + 14, el.clientWidth - 260))}px`;
      dica.style.top = `${Math.max(8, Math.min(y + 18, el.clientHeight - 55))}px`;
    }
  };
  const aoCancelar = (e: PointerEvent) => toque.cancel(e.pointerId);
  const aoSubir = (e: PointerEvent) => {
    if (!toque.up(e.pointerId, e.clientX, e.clientY) || !pronta) return;
    const r = renderizador.domElement.getBoundingClientRect();
    ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ponteiro, camera);

    // a pele só é clicável quando NADA mais está visível: senão ela intercepta tudo
    const temSolido = atlas.parts.some((p, i) => p.system !== "integumentary" && dados[i * 4 + 3] > 0.5);
    let maisPerto = Infinity, achado = -1;
    alvosDeClique.forEach((mesh, i) => {
      if (!mesh || dados[i * 4 + 3] < 0.5 || (temSolido && atlas.parts[i].system === "integumentary")) return;
      caixaNoMundo.copy(caixas[i]).translate(mesh.position);
      if (!raio.ray.intersectBox(caixaNoMundo, pontoDeAcerto)) return;   // teste barato antes do caro
      const acertos = raio.intersectObject(mesh, false);
      if (acertos[0] && acertos[0].distance < maisPerto) { maisPerto = acertos[0].distance; achado = i; }
    });
    // no inventário espalhado, peça minúscula não é acertável por raycast: vale o alvo de tela
    if (achado < 0 && quantidade > 0.45) {
      achado = acharAlvo(e.clientX - r.left, e.clientY - r.top, e.pointerType === "touch" ? 24 : 16);
    }
    if (achado >= 0) { dica.hidden = true; o.aoSelecionar(atlas.parts[achado].id); }
  };

  const tela = renderizador.domElement;
  tela.addEventListener("pointerdown", aoDescer);
  tela.addEventListener("pointermove", aoMover);
  tela.addEventListener("pointerup", aoSubir);
  tela.addEventListener("pointercancel", aoCancelar);

  // ── o laço ──
  const relogio = new T.Clock();
  let ultimaExtensao = -1;

  const animar = () => {
    if (descartada) return;
    quadro = requestAnimationFrame(animar);
    const dt = Math.min(relogio.getDelta(), 0.05);
    const s = o.estadoAtual();

    const mudou = ultimoEstado?.visible !== s.visible || ultimoEstado?.selected !== s.selected || ultimoEstado?.isolate !== s.isolate;
    const movendo = Math.abs(quantidade - s.explode) > 0.0001;
    if (movendo) { quantidade = T.MathUtils.damp(quantidade, s.explode, 8, dt); sujo = true; }

    if (mudou || movendo || ultimaExtensao < 0) {
      const visiveis = atlas.parts.filter((p) => pecaVisivel(s, p));
      const novaChave = visiveis.map((p) => p.id).join(",") + ":" + camera.aspect.toFixed(3);
      if (novaChave !== chaveDoLayout) {
        const layout = criarLayoutDeExplosao(visiveis, camera.aspect);
        packLargura = layout.largura; packAltura = layout.altura;
        atlas.parts.forEach((p, i) => {
          const c = layout.celulas.get(p.id);
          destinos[i] = c ? new T.Vector3(c.x, c.y + 0.85, 0) : centros[i].clone();
        });
        chaveDoLayout = novaChave;
        if (quantidade > 0.05 && !s.isolate) enquadrarCamera(s.view, Math.max(0, (quantidade - 0.3) / 0.7));
      }

      const selecionadas = new Set(s.selected);
      atlas.parts.forEach((p, i) => {
        const c = centros[i], destino = destinos[i];
        const grupo = SISTEMAS.findIndex((sys) => sys.id === p.system);
        const angulo = (grupo / SISTEMAS.length) * Math.PI * 2;
        let dx: number, dy: number, dz: number;
        if (quantidade <= 0.45) {
          // primeira metade: os sistemas se afastam em leque, o corpo ainda se reconhece
          const t = quantidade / 0.45;
          dx = Math.sin(angulo) * t * 0.48;
          dy = (c.y - 0.85) * t * 0.28;
          dz = Math.cos(angulo) * t * 0.48;
        } else {
          // segunda metade: cada peça vai para a sua célula no inventário plano
          const t = (quantidade - 0.45) / 0.55;
          dx = T.MathUtils.lerp(Math.sin(angulo) * 0.48, destino.x - c.x, t);
          dy = T.MathUtils.lerp((c.y - 0.85) * 0.28, destino.y - c.y, t);
          dz = T.MathUtils.lerp(Math.cos(angulo) * 0.48, -c.z, t);
        }
        const selecionada = selecionadas.has(p.id);
        dados.set([dx, dy, dz, pecaVisivel(s, p) ? 1 : 0], i * 4);
        dadosDeSelecao[i * 4] = selecionada ? 255 : 0;
        posicoesDosPontos.set(dados[i * 4 + 3] > 0.5 ? [c.x + dx, c.y + dy, c.z + dz] : [10000, 10000, 10000], i * 3);
        const mesh = alvosDeClique[i];
        if (mesh) { mesh.position.set(dx, dy, dz); mesh.updateMatrix(); mesh.updateMatrixWorld(true); }
      });
      texturaDeEstado.needsUpdate = true;
      texturaDeSelecao.needsUpdate = true;
      geometriaDosPontos.attributes.position.needsUpdate = true;
      ultimoEstado = s; ultimaExtensao = quantidade; sujo = true;
    }

    if (s.view !== ultimaVista || s.reset !== ultimoReset) {
      enquadrarCamera(s.view, quantidade);
      ultimaVista = s.view; ultimoReset = s.reset;
    }
    if (movendo && !s.isolate) {
      enquadrarCamera(quantidade > 0.5 ? "front" : s.view, Math.max(0, (quantidade - 0.3) / 0.7));
    }

    // isolamento: a câmera enquadra a estrutura no espaço que os painéis NÃO ocupam
    const chaveDeIsolar = s.isolate ? `${s.selected.join(",")}:${s.reset}:${s.inspectorOpen}:${camera.aspect}` : "";
    if (chaveDeIsolar !== ultimoIsolar || (s.isolate && movendo)) {
      if (s.isolate) {
        const caixa = new T.Box3();
        atlas.parts.forEach((p, i) => {
          if (!s.selected.includes(p.id)) return;
          caixa.union(caixas[i].clone().translate(new T.Vector3(dados[i * 4], dados[i * 4 + 1], dados[i * 4 + 2])));
        });
        if (!caixa.isEmpty()) {
          const centro = caixa.getCenter(new T.Vector3()), tamanho = caixa.getSize(new T.Vector3());
          const w = el.clientWidth, h = el.clientHeight;
          const celular = w < LARGURA_CELULAR, deitado = w > h && h <= 600;
          let esq = 20, dir = w - 20, topo = celular ? 175 : 110, base = h - 170;
          if (s.inspectorOpen) {
            if (deitado) { dir = w - 335; topo = 100; base = h - 125; }
            else if (celular) {
              const folha = document.querySelector(".anatomia-folha")?.getBoundingClientRect();
              const cabeca = document.querySelector(".anatomia-identidade")?.getBoundingClientRect();
              topo = (cabeca?.bottom ?? 94) + 16;
              base = (folha?.top ?? h * 0.58 - 139) - 16;
            } else { dir = w - 370; esq = w > 1100 ? 285 : 25; }
          }
          const larguraUtil = Math.max(150, dir - esq), alturaUtil = Math.max(40, base - topo);
          camera.setViewOffset(w, h, w / 2 - (esq + dir) / 2, h / 2 - (topo + base) / 2, w, h);
          const fator = 2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
          const distancia = Math.max(
            0.07,
            (Math.max((tamanho.y * h) / alturaUtil, (tamanho.x * w) / larguraUtil / camera.aspect, tamanho.z) / fator) * 1.35,
          );
          controles.maxDistance = Math.max(40, distancia * 2);
          controles.target.copy(centro);
          camera.position.copy(centro).add(new T.Vector3(0.2, 0.1, 1).normalize().multiplyScalar(distancia));
          controles.update();
          sujo = true;
        }
      } else if (ultimoIsolar) {
        camera.clearViewOffset();
        enquadrarCamera(s.view, quantidade);
      }
      ultimoIsolar = chaveDeIsolar;
    }

    // no inventário plano girar não faz sentido: o botão esquerdo passa a arrastar
    const podeGirar = quantidade < LIMITE_DE_ARRASTO;
    controles.enableRotate = podeGirar;
    controles.mouseButtons.LEFT = podeGirar ? T.MOUSE.ROTATE : T.MOUSE.PAN;
    controles.touches.ONE = podeGirar ? T.TOUCH.ROTATE : T.TOUCH.PAN;
    for (const p of palco) p.visible = quantidade < 0.5 && !s.isolate;
    pontos.visible = quantidade > 0.75;
    controles.autoRotate = s.rotate && !s.isolate && quantidade < 0.4;
    controles.autoRotateSpeed = 0.65;
    controles.update();
    if (controles.autoRotate) sujo = true;

    // só desenha quando algo mudou — é o que poupa bateria no celular
    if (sujo) {
      renderizador.render(cena, camera);
      alvos = [];
      if (quantidade > 0.45) {
        const temSolido = atlas.parts.some((p, i) => p.system !== "integumentary" && dados[i * 4 + 3] > 0.5);
        atlas.parts.forEach((p, i) => {
          if (dados[i * 4 + 3] < 0.5 || (temSolido && p.system === "integumentary")) return;
          let esq = Infinity, dir = -Infinity, topo = Infinity, base = -Infinity;
          for (let canto = 0; canto < 8; canto++) {
            projetado.set(
              p.bounds[canto & 1 ? 1 : 0][0] + dados[i * 4],
              p.bounds[canto & 2 ? 1 : 0][1] + dados[i * 4 + 1],
              p.bounds[canto & 4 ? 1 : 0][2] + dados[i * 4 + 2],
            ).project(camera);
            const x = ((projetado.x + 1) * el.clientWidth) / 2, y = ((1 - projetado.y) * el.clientHeight) / 2;
            esq = Math.min(esq, x); dir = Math.max(dir, x); topo = Math.min(topo, y); base = Math.max(base, y);
          }
          projetado.copy(centros[i]).add(new T.Vector3(dados[i * 4], dados[i * 4 + 1], dados[i * 4 + 2])).project(camera);
          if (projetado.z < -1 || projetado.z > 1) return;
          alvos.push({
            indice: i,
            x: ((projetado.x + 1) * el.clientWidth) / 2,
            y: ((1 - projetado.y) * el.clientHeight) / 2,
            esq, dir, topo, base,
          });
        });
      }
      sujo = false;
    }
  };
  animar();

  const contextoPerdido = (e: Event) => {
    e.preventDefault();
    o.aoErrar("o seu aparelho pausou a sessão 3D. Recarregue para continuar.");
  };
  tela.addEventListener("webglcontextlost", contextoPerdido);

  return () => {
    descartada = true;
    aborto.abort();
    cancelAnimationFrame(quadro);
    observador.disconnect();
    tela.removeEventListener("pointerdown", aoDescer);
    tela.removeEventListener("pointermove", aoMover);
    tela.removeEventListener("pointerup", aoSubir);
    tela.removeEventListener("pointercancel", aoCancelar);
    tela.removeEventListener("webglcontextlost", contextoPerdido);
    controles.dispose();
    geometrias.forEach((g) => g.dispose());
    materiais.forEach((m) => m.dispose());
    cena.traverse((obj) => {
      if (obj instanceof T.Mesh && !geometrias.includes(obj.geometry)) {
        obj.geometry.dispose();
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m: T.Material) => m.dispose());
      }
    });
    ambiente.dispose();
    texturaDeEstado.dispose();
    texturaDeSelecao.dispose();
    geometriaDosPontos.dispose();
    materialDosPontos.dispose();
    dica.remove();
    renderizador.dispose();
    tela.remove();
  };
}
