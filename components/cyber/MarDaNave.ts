import * as THREE from "three";
import { ctx2d, novoCanvas } from "@/lib/cyber/canvas2d";

function texturaPeixe() {
  const canvas = novoCanvas(128, 64);
  const ctx = ctx2d(canvas);
  ctx.filter = "blur(2px)";
  const cor = ctx.createLinearGradient(0, 14, 0, 51);
  cor.addColorStop(0, "#a9f0de");
  cor.addColorStop(.45, "#5eacb4");
  cor.addColorStop(1, "#276076");
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(32, 32);
  ctx.bezierCurveTo(56, 7, 97, 12, 115, 32);
  ctx.bezierCurveTo(94, 54, 59, 54, 32, 32);
  ctx.moveTo(39, 32);
  ctx.lineTo(14, 12);
  ctx.quadraticCurveTo(24, 31, 12, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#174355";
  ctx.beginPath();
  ctx.arc(101, 29, 3, 0, Math.PI * 2);
  ctx.fill();
  const mapa = new THREE.CanvasTexture(canvas as HTMLCanvasElement);
  mapa.colorSpace = THREE.SRGBColorSpace;
  return mapa;
}

export function criarMarDaNave(low: boolean, escala = 1) {
  const group = new THREE.Group();
  group.scale.setScalar(escala);
  const tempo = { value: 0 };
  const agua = new THREE.Mesh(
    new THREE.SphereGeometry(155, 32, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { tempo },
      vertexShader: "varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `
        uniform float tempo;
        varying vec3 vPos;
        void main(){
          vec3 p=normalize(vPos);
          float altura=smoothstep(-.52,.7,p.y);
          vec3 cor=mix(vec3(.008,.052,.17),vec3(.035,.32,.56),altura);
          float feixes=.5+.5*sin(p.x*18.+p.z*13.+sin(p.z*8.+tempo*.18)*1.4);
          float onda=.5+.5*sin(p.x*29.-p.z*11.+tempo*.32);
          cor+=vec3(.035,.17,.28)*pow(feixes,3.)*onda*smoothstep(-.1,.8,p.y);
          gl_FragColor=vec4(cor,1.);
          #include <colorspace_fragment>
        }`,
    }),
  );
  group.add(agua);

  const piso = new THREE.Mesh(
    new THREE.CircleGeometry(145, 56),
    new THREE.MeshBasicMaterial({ color: "#17465d" }),
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.y = -19;
  group.add(piso);

  const mapa = texturaPeixe();
  const mapaInverso = mapa.clone();
  mapaInverso.repeat.x = -1;
  mapaInverso.offset.x = 1;
  mapaInverso.needsUpdate = true;
  const parado = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mares = ["#b5ead9", "#7cbed1", "#88ada7"];
  const cardumes = Array.from({ length: low ? 6 : 10 }, (_, i) => {
    const peixes = Array.from({ length: i % 2 ? 2 : 3 }, () => {
      const peixe = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mapa, color: mares[i % mares.length], transparent: true,
        opacity: .72 - (i % 3) * .14, depthWrite: false,
      }));
      const escala = 2.3 + (i % 3) * .65;
      peixe.scale.set(escala, escala * .5, 1);
      group.add(peixe);
      return peixe;
    });
    return { peixes, raio: 24 + i % 4 * 11, fase: i * 2.399963, altura: -4 + i % 5 * 2.4, sentido: i % 2 ? -1 : 1 };
  });

  const folhas = new THREE.MeshBasicMaterial({ color: "#386b62", side: THREE.DoubleSide });
  const algas = Array.from({ length: low ? 16 : 28 }, (_, i) => {
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-.32, 2, 0),
      new THREE.Vector3(.68, 4, .3), new THREE.Vector3(.28, 6.8, .55),
    ]);
    const alga = new THREE.Mesh(new THREE.TubeGeometry(curva, 9, .22, 4, false), folhas);
    const angulo = i * 2.399963;
    const raio = 24 + i % 7 * 5.7;
    alga.position.set(Math.cos(angulo) * raio, -19, Math.sin(angulo) * raio);
    alga.scale.y = .62 + (i % 5) * .36;
    group.add(alga);
    return alga;
  });

  return {
    group,
    atualizar(agora: number) {
      const t = parado ? 0 : agora;
      tempo.value = t;
      cardumes.forEach(({ peixes, raio, fase, altura, sentido }, i) => {
        peixes.forEach((peixe, j) => {
          const a = fase + sentido * t * (.066 + i % 3 * .011) - j * .073 * sentido;
          peixe.position.set(Math.cos(a) * raio, altura + Math.sin(a * 2 + j) * 1.3 + j * .6, Math.sin(a) * raio);
          peixe.material.map = Math.sin(a) * sentido < 0 ? mapa : mapaInverso;
          peixe.material.rotation = Math.sin(t * 1.9 + i + j) * .1;
        });
      });
      algas.forEach((alga, i) => { alga.rotation.z = Math.sin(t * .55 + i) * .17; });
    },
    dispose() {
      group.removeFromParent();
      agua.geometry.dispose();
      agua.material.dispose();
      piso.geometry.dispose();
      piso.material.dispose();
      cardumes.forEach(({ peixes }) => peixes.forEach(({ material }) => material.dispose()));
      algas.forEach(({ geometry }) => geometry.dispose());
      folhas.dispose();
      mapa.dispose();
      mapaInverso.dispose();
    },
  };
}
