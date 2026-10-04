/**
 * AvatarLuz — o "ser de luz" do cyberespaço (HANDOFF lounge cósmico §1): corpo humano com material holográfico
 * emissivo (cor por usuário) + neurônios (point-swarm) ao redor. Componente ISOLADO: é a única peça que sabe
 * como o corpo é feito. Hoje usa o humanoide procedural do `Avatar3D` (sem asset externo); trocar por um GLB
 * rigado próprio/RPM self-hostado é reimplementar `criarAvatarLuz` mantendo o contrato abaixo.
 */
import * as THREE from "three";
import { criarAvatar } from "@/components/lounge/Avatar3D";

export type AvatarLuzHandle = {
  group: THREE.Group;
  /** meshes do corpo (raycast do clique). */
  meshes: THREE.Object3D[];
  /** caminhada/idle (`correndo` acelera o ciclo) + neurônios + sentar (0..1). */
  animar(o: { andando: boolean; correndo?: boolean; sentado?: number; dt: number; t: number }): void;
  olharPara(facing: number): void;
  dispose(): void;
};

export function criarAvatarLuz(corHex: string, starTex: THREE.Texture, low: boolean): AvatarLuzHandle {
  const base = criarAvatar(corHex);
  const cor = new THREE.Color(corHex);
  const holo = new THREE.MeshStandardMaterial({ color: 0x07131c, emissive: cor, emissiveIntensity: 1.45, roughness: 0.45, metalness: 0, transparent: true, opacity: 0.86 });
  const meshes: THREE.Object3D[] = [];
  base.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = holo; m.frustumCulled = false; m.castShadow = false; meshes.push(m); } });

  // o handle do Avatar3D anima a si mesmo; aqui só empacotamos (grupo externo = posição/yaw; interno = corpo)
  const grupo = new THREE.Group();
  const corpo = new THREE.Group(); corpo.add(base.group); grupo.add(corpo);

  const n = low ? 110 : 240, np = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const y = 0.2 + Math.random() * 1.6, r = 0.3 + Math.random() * 0.5, a = Math.random() * 6.28; np[i * 3] = Math.cos(a) * r; np[i * 3 + 1] = y; np[i * 3 + 2] = Math.sin(a) * r; }
  const ng = new THREE.BufferGeometry(); ng.setAttribute("position", new THREE.BufferAttribute(np, 3));
  const neu = new THREE.Points(ng, new THREE.PointsMaterial({ size: 0.12, map: starTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: cor }));
  grupo.add(neu);

  let facing = 0;
  return {
    group: grupo, meshes,
    animar({ andando, correndo, sentado = 0, dt, t }) {
      base.animar(andando, correndo ? dt * 1.6 : dt);
      // gira suave pro lado que está olhando (menor arco)
      let d = facing - grupo.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      grupo.rotation.y += d * 0.15;
      corpo.position.y = sentado * 0.32 + 0; corpo.rotation.x = sentado * 0.34;
      (neu.material as THREE.PointsMaterial).size = 0.1 + 0.05 * Math.sin(t * 2 + grupo.position.x);
      neu.rotation.y += dt * 0.5;
    },
    olharPara(f) { facing = f; },
    dispose() { base.dispose(); holo.dispose(); ng.dispose(); (neu.material as THREE.Material).dispose(); grupo.removeFromParent(); },
  };
}
