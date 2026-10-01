"use client";
/**
 * Globo 3D de FUNDO da cartolina: só esfera + wireframe + marcadores pulsando. Extraído do
 * CyberGlobe do components/sub/LoungeEarth.tsx, sem lobby/feed/texto/hover/clique.
 *
 * Carregado com next/dynamic (ssr:false) pelo LoungeCartolina — three.js só baixa quando a
 * cartolina aparece, e nunca entra no bundle das outras rotas.
 * `pausado` (cartolina aberta cobrindo o globo) → frameloop "never": zero GPU/bateria gasta
 * desenhando o que ninguém vê.
 */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import type * as THREE from "three";
import { latLonParaXYZ, MARCADORES } from "@/lib/ui/globo";

const AZUL = "#001a2c", FIO = "#00d2ff", PONTO = "#00f0ff";

function Marcador({ lat, lon, fase }: { lat: number; lon: number; fase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.getElapsedTime() * 2.4 + fase) * 0.18;
    ref.current?.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} position={latLonParaXYZ(lat, lon, 0.785)}>
      <sphereGeometry args={[0.03, 12, 12]} />
      <meshBasicMaterial color={PONTO} toneMapped={false} />
    </mesh>
  );
}

function Globo() {
  const grupo = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (grupo.current) grupo.current.rotation.y = clock.getElapsedTime() / 15; });
  return (
    <group ref={grupo} rotation={[0.35, 0, 0]}>
      <Sphere args={[0.75, 48, 48]}>
        <meshPhongMaterial color={AZUL} transparent opacity={0.85} shininess={90} specular={FIO} />
      </Sphere>
      <Sphere args={[0.775, 28, 28]}>
        <meshBasicMaterial color={FIO} wireframe transparent opacity={0.18} toneMapped={false} />
      </Sphere>
      {MARCADORES.map(([lat, lon], i) => <Marcador key={i} lat={lat} lon={lon} fase={i * 0.9} />)}
    </group>
  );
}

export default function GloboFundo({ pausado = false, onPronto }: { pausado?: boolean; onPronto?: () => void }) {
  return (
    <Canvas
      aria-hidden
      frameloop={pausado ? "never" : "always"}
      dpr={[1, 1.75]} // tela retina sem pagar 3x de pixel
      camera={{ position: [0, 0, 2.6], fov: 45 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={() => onPronto?.()} // só agora o SVG de placeholder pode sumir
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={2.5} />
      <Globo />
    </Canvas>
  );
}
