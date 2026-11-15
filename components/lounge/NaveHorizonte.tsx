"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { criarNaveMini } from "@/components/cyber/NaveMini";
import { SKIN_MINI_PADRAO } from "@/lib/cyber/naveMini";
import { criarFiosCosmicos } from "@/components/cyber/FiosCosmicos";
import { criarEspacoAberto } from "@/components/cyber/EspacoAberto";
import { carregarModeloAvatar, criarAvatarLuz } from "@/components/cyber/AvatarLuz";
import { assentoDaCadeira, pistasDoEspaco, SOFA_TETO, TETO_MINI } from "@/lib/cyber/minhaNave";
import { criarCenaCosmica } from "@/components/cyber/CenaCosmica";

export default function NaveHorizonte() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.autoClear = false;
    const cosmos = criarCenaCosmica(true, 1);
    const nave = criarNaveMini({ low: true, skin: SKIN_MINI_PADRAO });
    const teto = criarEspacoAberto({ low: true, skin: SKIN_MINI_PADRAO, starTex: cosmos.starTex });
    let avatar: ReturnType<typeof criarAvatarLuz> | undefined;
    let ativo = true;
    const assento = assentoDaCadeira();
    cosmos.scene.add(nave.group, teto.group);
    void carregarModeloAvatar().then((modelo) => {
      if (!ativo) return;
      avatar = criarAvatarLuz("#657de0", cosmos.starTex, true, modelo);
      avatar.group.position.set(assento.x, TETO_MINI.y, assento.z);
      avatar.group.rotation.y = Math.PI + .14;
      cosmos.scene.add(avatar.group);
      if (movimento.matches) reiniciar();
    }).catch(() => {});

    const pistas = pistasDoEspaco().filter(({ b }) => b.id === "anjos");
    const buraco = criarFiosCosmicos({
      pistas: pistas.map(({ f }) => ({ ...f, bn: { ...f.bn, x: -5.5, y: 10.2, z: 48, r: 3 } })),
      cores: { lounge: 0xff2fb4, jardim: 0xb98cff, garagem: 0xffb46b, biblioteca: 0x7fb8ff },
      low: true,
      starTex: cosmos.starTex,
    });
    cosmos.scene.add(buraco.group);
    const camera = new THREE.PerspectiveCamera(42, 1, .05, 2000);
    const olhar = new THREE.Vector3(-1.05, TETO_MINI.y + 1.2, assento.z + 14);
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    let quadro = 0;
    let ultimo = 0;
    const desenhar = (agora: number) => {
      const t = movimento.matches ? 0 : agora / 1000;
      const dt = ultimo ? Math.min((agora - ultimo) / 1000, .05) : 0;
      ultimo = agora;
      camera.position.set(2.65 + Math.sin(t * .27) * .32, TETO_MINI.y + 2, assento.z - 4.1);
      camera.lookAt(olhar);
      nave.atualizar(dt, t);
      teto.atualizar(dt, t, camera);
      avatar?.animar({ andando: false, descanso: { sentar: 1, deitar: 0, assentoY: SOFA_TETO.assento }, dt, t });
      buraco.atualizar(dt, t, camera.position);
      cosmos.atualizar({ dt, t, cam: camera, aspect: camera.aspect });
      renderer.clear();
      cosmos.desenharFundo(renderer, .35);
      renderer.clearDepth();
      renderer.render(cosmos.scene, camera);
      if (!movimento.matches) quadro = requestAnimationFrame(desenhar);
    };
    const reiniciar = () => {
      cancelAnimationFrame(quadro);
      ultimo = 0;
      desenhar(performance.now());
    };
    const ajustar = () => {
      camera.aspect = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight);
      camera.fov = camera.aspect < 1.35 ? 54 : 40;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      reiniciar();
    };
    const tamanho = new ResizeObserver(ajustar);
    tamanho.observe(canvas);
    movimento.addEventListener("change", reiniciar);
    ajustar();
    return () => {
      ativo = false;
      cancelAnimationFrame(quadro);
      tamanho.disconnect();
      movimento.removeEventListener("change", reiniciar);
      nave.group.removeFromParent();
      nave.dispose();
      teto.dispose();
      avatar?.group.removeFromParent();
      avatar?.dispose();
      buraco.dispose();
      cosmos.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="block h-full w-full" />;
}
