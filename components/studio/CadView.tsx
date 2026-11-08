"use client";

/**
 * CadView — a MINIATURA da peça CAD do Eiffel dentro da bolha do chat.
 *
 * NÃO é o editor: o editor de verdade é o embed WASM do SolidCraft (modo edição, FALTA step 5). Aqui
 * é só a prévia — leve de propósito, porque uma bolha de chat não deve subir um CAD inteiro. Por isso
 * o PNG do screenshot é o caminho PADRÃO (um `<img>`, sem WebGL); o glTF no three.js só entra quando
 * não há PNG, ou quando a pessoa pede "Ver em 3D". Mesmo molde do MoleculeView: "use client", import
 * DINÂMICO do three só depois da montagem (em SSR ele quebra), e montado em DOIS lugares (StudioBlock
 * e MagazineAnswerView) — registrado só num, aparece pela metade.
 */
import { useEffect, useRef, useState } from "react";
import { Box, RotateCw, Pause, Download, Image as ImageIcon } from "lucide-react";

export type CadData = {
  titulo?: string;
  /** o script JSON de comandos — o artefato canônico, reconstrói a peça inteira */
  script?: unknown;
  /** o modelo pra visualizar: data URL (`data:model/gltf-binary;base64,…`) ou base64 cru de um .glb */
  gltf?: string;
  /** o STEP pra baixar (texto ISO-10303-21) */
  step?: string;
  /** a miniatura leve (data URL de PNG) — o caminho padrão da bolha */
  png?: string;
  /** o número do `measure` do SolidCraft, quando houver */
  volumeMm3?: number;
  fonte?: string;
};

function dataUrlGltf(gltf: string): string {
  return gltf.startsWith("data:") ? gltf : `data:model/gltf-binary;base64,${gltf}`;
}

/** O STEP como data URL — baixa sem Blob/createObjectURL (SSR-safe e testável). */
function dataUrlStep(step: string): string {
  return `data:model/step;charset=utf-8,${encodeURIComponent(step)}`;
}

function nomeArquivo(data: CadData): string {
  return (data.titulo || "peca").replace(/[^\w.-]+/g, "_").slice(0, 60) || "peca";
}

/** O visualizador glTF (three.js, import dinâmico). Só monta quando chamado — nunca em SSR nem em teste. */
function Visor3D({ gltf }: { gltf: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const parar = useRef<(() => void) | null>(null);
  const spinRef = useRef(true);
  const [girando, setGirando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const THREE: any = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        if (!vivo || !box.current) return;
        const el = box.current;
        const w = el.clientWidth || 300;
        const h = el.clientHeight || 260;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(w, h);
        el.appendChild(renderer.domElement);
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dir = new THREE.DirectionalLight(0xffffff, 1.1);
        dir.position.set(1, 1, 1);
        scene.add(dir);

        const loader = new GLTFLoader();
        loader.load(
          dataUrlGltf(gltf),
          (g: any) => {
            if (!vivo) return;
            const obj = g.scene || g.scenes?.[0];
            if (!obj) { setErro("glTF vazio."); return; }
            // centraliza e enquadra pela caixa do modelo
            const bbox = new THREE.Box3().setFromObject(obj);
            const centro = bbox.getCenter(new THREE.Vector3());
            const tam = bbox.getSize(new THREE.Vector3());
            obj.position.sub(centro);
            const raio = Math.max(tam.x, tam.y, tam.z) || 1;
            camera.position.set(raio * 1.6, raio * 1.2, raio * 1.6);
            camera.lookAt(0, 0, 0);
            scene.add(obj);
            const loop = () => {
              if (!vivo) return;
              if (spinRef.current) obj.rotation.y += 0.01;
              renderer.render(scene, camera);
              req = requestAnimationFrame(loop);
            };
            let req = requestAnimationFrame(loop);
            parar.current = () => { cancelAnimationFrame(req); renderer.dispose(); el.removeChild(renderer.domElement); };
          },
          undefined,
          () => { if (vivo) setErro("Não consegui carregar o modelo 3D."); },
        );
      } catch {
        if (vivo) setErro("Não consegui desenhar a peça neste navegador.");
      }
    })();
    return () => { vivo = false; try { parar.current?.(); } catch { /* ignore */ } parar.current = null; };
  }, [gltf]);

  const girar = () => { const v = !spinRef.current; spinRef.current = v; setGirando(v); };

  return (
    <div className="relative w-full h-full">
      <div ref={box} className="absolute inset-0" />
      {erro ? (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-500 dark:text-white/60 px-4 text-center">{erro}</div>
      ) : (
        <button
          onClick={girar}
          className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-700 dark:text-white/80 bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 transition-colors"
        >
          {girando ? <Pause size={12} /> : <RotateCw size={12} />}
          {girando ? "Parar" : "Girar"}
        </button>
      )}
    </div>
  );
}

export default function CadView({ data, nu = false }: { data: CadData; nu?: boolean }) {
  // Padrão leve: mostra o PNG; o 3D é opcional. Sem PNG e com glTF, começa no 3D direto.
  const [modo, setModo] = useState<"png" | "3d">(data.png ? "png" : "3d");
  const temPng = !!data.png;
  const temGltf = !!data.gltf;
  const temPrevia = temPng || temGltf;

  const legenda = data.titulo || "peça CAD";
  const volume = typeof data.volumeMm3 === "number"
    ? `${data.volumeMm3.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm³`
    : null;

  // ── modo FIGURA (Modo Revista): só a prévia + legenda fina, sem botões ──
  if (nu) {
    return (
      <figure className="relative w-full m-0" style={{ aspectRatio: "1 / 1" }}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-white/[0.03]">
          {temPng ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.png} alt={legenda} className="w-full h-full object-contain" />
          ) : temGltf ? (
            <Visor3D gltf={data.gltf!} />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[11px] text-slate-500 dark:text-white/50">Prévia indisponível</div>
          )}
        </div>
        <figcaption className="absolute inset-x-0 bottom-1 text-center text-[11px] font-bold text-slate-600 dark:text-white/60 pointer-events-none">
          {legenda}{volume ? ` · ${volume}` : ""}
        </figcaption>
      </figure>
    );
  }

  // ── modo CARTÃO (bolha do chat / biblioteca) ──
  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full h-[260px] rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
        {!temPrevia ? (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-500 dark:text-white/60 px-4 text-center">
            Prévia indisponível.
          </div>
        ) : modo === "png" && temPng ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.png} alt={legenda} className="w-full h-full object-contain" />
        ) : temGltf ? (
          <Visor3D gltf={data.gltf!} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.png} alt={legenda} className="w-full h-full object-contain" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* trocar PNG ↔ 3D só quando os DOIS existem */}
        {temPng && temGltf && (
          <button
            onClick={() => setModo((m) => (m === "png" ? "3d" : "png"))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 transition-colors"
          >
            {modo === "png" ? <Box size={12} /> : <ImageIcon size={12} />}
            {modo === "png" ? "Ver em 3D" : "Ver miniatura"}
          </button>
        )}
        {data.step && (
          <a
            href={dataUrlStep(data.step)}
            download={`${nomeArquivo(data)}.step`}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 transition-colors"
          >
            <Download size={12} /> Baixar STEP
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-white/65">
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-white/90">
          <Box size={12} /> {legenda}
        </span>
        {volume && <span>{volume}</span>}
      </div>
    </div>
  );
}
