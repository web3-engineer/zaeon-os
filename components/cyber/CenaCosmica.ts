/**
 * CenaCosmica — o cenário fixo do cyberespaço (HANDOFF §1): nebulosa do dono (shader) irradiando do buraco negro
 * estilo filme (esfera preta + anel de fótons billboard + disco de acreção quente edge-on; NÃO é Saturno),
 * estrelas redondas girando devagar, chão plano + grid contrastando com o céu.
 * Dois passes: o fundo (nebulosa) numa cena ortográfica, depois a cena 3D por cima.
 */
import * as THREE from "three";

export function glowTex(c0: string, c1: string): THREE.CanvasTexture {
  const s = 128, cs = document.createElement("canvas"); cs.width = cs.height = s;
  const g = cs.getContext("2d")!; const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, c0); gr.addColorStop(0.4, c1); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cs);
}

const NEB_VERT = `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`;
const NEB_FRAG = `
 vec2 rot2D(vec2 p,float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c)*p;}
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=.55;}return v;}
 float ridge(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){float n=1.-abs(2.*noise(p)-1.);v+=a*n;p*=2.2;a*=.6;}return v;}
 vec3 pal(float t,float h){vec3 a=vec3(0.30,0.10,0.55),b=vec3(0.55,0.18,0.95),c=vec3(0.35,0.78,1.0);vec3 col=mix(a,b,smoothstep(0.,0.6,t));col=mix(col,c,smoothstep(0.5,1.,t));col.rg*=(0.95+0.1*h);col.b*=(1.0+0.2*h);return col;}
 varying vec2 vUv; uniform float uTime,uScale,uSpeed,uIntensity,uHueShift,uAlpha,uDustStrength,uAspect,uSpread; uniform vec2 uCenter;
 void main(){vec2 uv=vUv*2.-1.; uv.x*=1.6*uAspect; uv.y*=1.2; float t=uTime*uSpeed;
  vec2 cc=uCenter; cc.x*=1.6*uAspect; cc.y*=1.2; vec2 d=uv-cc; float ang=atan(d.y,d.x), rr=length(d);
  vec2 p=d*uScale+vec2(cos(ang+t*0.3),sin(ang+t*0.3))*0.4;
  vec2 q=vec2(fbm(p+vec2(0.,t*0.35)),fbm(p+vec2(5.2,-t*0.25)));
  vec2 r=vec2(fbm(p+rot2D(q,1.2)+vec2(1.7,-t*0.18)),fbm(p+rot2D(q,-1.8)+vec2(-3.1,t*0.22)));
  float neb=fbm(p+3.5*q+2.*r);
  float lane=ridge(p*0.6+vec2(0.,t*0.08)); lane=smoothstep(0.55,0.85,lane); float darkMask=1.-uDustStrength*lane;
  float radial=smoothstep(uSpread,0.08,rr); float glow=smoothstep(0.35,0.95,neb)*radial;
  vec3 col=pal(neb,uHueShift); col*=(0.35+0.75*glow); col*=darkMask;
  float sparks=smoothstep(0.86,1.,neb)*0.25; col+=vec3(0.9,0.85,1.)*sparks*0.15;
  gl_FragColor=vec4(col*uIntensity,(0.6*glow+0.3*neb*radial)*uAlpha);}`;

export type CenaCosmicaHandle = {
  bgScene: THREE.Scene; bgCam: THREE.OrthographicCamera;
  scene: THREE.Scene; floor: THREE.Mesh; starTex: THREE.Texture;
  atualizar(o: { dt: number; t: number; cam: THREE.PerspectiveCamera; aspect: number }): void;
  dispose(): void;
};

export function criarCenaCosmica(low: boolean, aspect: number): CenaCosmicaHandle {
  const starTex = glowTex("rgba(255,255,255,1)", "rgba(190,215,255,0.5)");
  const bgScene = new THREE.Scene(); const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const nebulas: THREE.ShaderMaterial[] = [];
  const neb = (scale: number, speed: number, inten: number, hue: number, alpha: number, dust: number, spread: number) => {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, vertexShader: NEB_VERT, fragmentShader: NEB_FRAG,
      uniforms: { uTime: { value: Math.random() * 10 }, uScale: { value: scale }, uSpeed: { value: speed }, uIntensity: { value: inten }, uHueShift: { value: hue }, uAlpha: { value: alpha }, uDustStrength: { value: dust }, uAspect: { value: aspect }, uSpread: { value: spread }, uCenter: { value: new THREE.Vector2(0, 0.4) } },
    });
    bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); nebulas.push(m); return m;
  };
  neb(1.2, 0.25, 0.85, 0.08, 0.95, 0.25, 1.5); neb(1.9, 0.45, 1.0, -0.05, 0.9, 0.4, 1.0);

  const scene = new THREE.Scene(); scene.background = null;
  scene.add(new THREE.HemisphereLight(0x5566aa, 0x0a0a16, 0.9));
  const key = new THREE.DirectionalLight(0x99bbff, 0.6); key.position.set(4, 9, 6); scene.add(key);

  // estrelas redondas, densidade baixa
  const SN = low ? 700 : 1500, spv = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    const u = Math.random(), v = Math.random(), th = u * 6.283, ph = Math.acos(2 * v - 1), rr = 160 * Math.cbrt(Math.random());
    spv[i * 3] = rr * Math.sin(ph) * Math.cos(th); spv[i * 3 + 1] = Math.abs(rr * Math.sin(ph) * Math.sin(th)) * 0.9 + 6; spv[i * 3 + 2] = rr * Math.cos(ph);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(spv, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, map: starTex, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  stars.rotation.z = Math.PI / 4; scene.add(stars);

  // buraco negro estilo filme
  const bh = new THREE.Group(); bh.position.set(0, 16, -110);
  bh.add(new THREE.Mesh(new THREE.SphereGeometry(6, 48, 48), new THREE.MeshBasicMaterial({ color: 0x000000 })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,200,130,0.55)", "rgba(180,90,30,0.18)"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(30, 30, 1); bh.add(halo);
  const dMat = (c: number, op: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const disk = new THREE.Group();
  for (const [a, b, c, o] of [[6.6, 15, 0xffe3b0, 0.85], [6.6, 11, 0xffb45a, 0.8], [6.6, 8.6, 0xff7a2c, 0.7]] as const) disk.add(new THREE.Mesh(new THREE.RingGeometry(a, b, 180), dMat(c, o)));
  disk.rotation.x = -Math.PI / 2 + 0.06; bh.add(disk);
  const photon = new THREE.Mesh(new THREE.RingGeometry(6.0, 6.6, 128), dMat(0xfff0d6, 0.95)); bh.add(photon);
  scene.add(bh);

  // chão limpo + grid
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: 0x0e1730, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(800, 160, 0x5a6cc0, 0x1b2550); grid.position.y = 0.02;
  (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.42; scene.add(grid);

  const bhNdc = new THREE.Vector3();
  return {
    bgScene, bgCam, scene, floor, starTex,
    atualizar({ dt, t, cam, aspect: asp }) {
      bhNdc.set(0, 17, -120).project(cam);
      for (const m of nebulas) { m.uniforms.uTime!.value += dt; m.uniforms.uAspect!.value = asp; (m.uniforms.uCenter!.value as THREE.Vector2).set(bhNdc.x, bhNdc.y); }
      stars.rotation.x -= dt * 0.02; stars.rotation.y -= dt * 0.014;
      photon.lookAt(cam.position); (halo.material as THREE.SpriteMaterial).opacity = 0.75 + 0.12 * Math.sin(t * 1.5);
    },
    dispose() {
      for (const sc of [bgScene, scene]) sc.traverse((o) => {
        const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose();
        const mt = (m as { material?: THREE.Material | THREE.Material[] }).material;
        if (mt) (Array.isArray(mt) ? mt : [mt]).forEach((x) => x.dispose());
      });
      starTex.dispose();
    },
  };
}
