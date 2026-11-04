/**
 * NaveMini — a NAVE MINI inteira (planta pura em lib/cyber/naveMini), por dentro e por fora, na SKIN escolhida pelo
 * dono: a TRON (neon cyberpunk da Zaeon, a padrão — components/cyber/NaveMiniTron) ou a AGRADÁVEL (clara e quente —
 * components/cyber/NaveMiniAgradavel). O convés e o casco são os mesmos (components/cyber/NaveMiniBase); a skin dá o
 * tema e mobília. Mesmo referencial da planta (+z = proa, y = 0 no piso).
 */
import * as THREE from "three";
import { NAVE_MINI, SKIN_MINI_PADRAO, type SkinMini } from "@/lib/cyber/naveMini";
import { kitMini, montarCasco, montarConves, montarRolante } from "./NaveMiniBase";
import { uniformesEnergia } from "./energiaNave";
import { mobiliarAgradavel, temaAgradavel } from "./NaveMiniAgradavel";
import { mobiliarTron, temaTron } from "./NaveMiniTron";

export type NaveMiniHandle = { group: THREE.Group; skin: SkinMini; atualizar(dt: number, t: number): void; mostrarTeto(v: boolean): void; mostrarCasco(v: boolean): void; dispose(): void };

export function criarNaveMini(o: { low: boolean; teto?: boolean; skin?: SkinMini }): NaveMiniHandle {
  const skin = o.skin ?? SKIN_MINI_PADRAO, energia = skin === "tron" ? uniformesEnergia(NAVE_MINI.roda) : null, k = kitMini(o.low, energia);
  const origem = new THREE.Vector3();
  if (energia) k.anim.push((_, t) => { energia.uT.value = t; k.g.getWorldPosition(origem); energia.uOrigem.value.copy(origem); });
  let teto: THREE.Group, casco: THREE.Group;
  if (skin === "tron") { const t = temaTron(k), c = montarConves(k, t.tema, o); teto = c.teto; casco = montarCasco(k, t.tema, c.escotilhas); mobiliarTron(k, teto, t, c); }
  else { const t = temaAgradavel(k), c = montarConves(k, t.tema, o); teto = c.teto; casco = montarCasco(k, t.tema, c.escotilhas); mobiliarAgradavel(k, teto, t); }
  // a ESCADA ROLANTE (do piso até a escotilha do teto): no lugar do elevador automático (o dono, nov/2026)
  const tron = skin === "tron", vidroE = new THREE.MeshLambertMaterial({ color: tron ? 0x7fe8ff : 0xdcecff, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, emissive: tron ? 0x1a6a80 : 0x6080a0, emissiveIntensity: 0.3 }); k.descartar.push(vidroE);
  montarRolante(k, { corpo: k.mat(tron ? 0x15132a : 0xd9b996, tron ? 0.5 : 0.32), degrau: k.mat(tron ? 0x231f40 : 0xf6f1f4, 0.45), vidro: vidroE, cor: tron ? 0x45f0ff : 0xffd49a, cor2: tron ? 0xff2fb4 : 0xd6c6f2 });
  return {
    group: k.g, skin,
    atualizar(dt, t) { for (const f of k.anim) f(dt, t); },
    mostrarTeto(v) { teto.visible = v; },
    mostrarCasco(v) { casco.visible = v; },
    dispose() { k.g.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) m.geometry?.dispose(); }); for (const d of k.descartar) d.dispose(); k.g.removeFromParent(); },
  };
}
