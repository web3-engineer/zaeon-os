"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import * as THREE from "three";

const COLOR_TECH_BLUE = new THREE.Color("#001a2c");
const COLOR_WIRE_BLUE = new THREE.Color("#00d2ff");
const COLOR_DOT       = new THREE.Color("#00f0ff");

const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
};

const LocationMarker = ({ lat, lon, label, code, onClick }: { lat: number, lon: number, label: string, code: string, onClick: (code: string) => void }) => {
    const ref = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);
    const position = latLonToVector3(lat, lon, 1.57);

    useFrame(({ clock }) => {
        if (ref.current) {
            const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.1;
            ref.current.scale.set(scale, scale, scale);
        }
    });

    useEffect(() => {
        if (hovered) document.body.style.cursor = 'pointer';
        return () => { document.body.style.cursor = 'auto'; }
    }, [hovered]);

    return (
        <group>
            <mesh
                ref={ref}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(code); }}
                onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
                onPointerOut={(e) => { e.stopPropagation(); setHover(false); }}
            >
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial color={COLOR_DOT} toneMapped={false} />
            </mesh>
            <mesh position={position} scale={[1.8, 1.8, 1.8]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial color={COLOR_DOT} transparent opacity={0.3} toneMapped={false} />
            </mesh>
            {hovered && (
                <Html position={position} distanceFactor={15} style={{ pointerEvents: 'none' }}>
                    <div className="bg-black/90 backdrop-blur-md border border-cyan-500/30 px-1 py-0.5 rounded transform -translate-y-4 -translate-x-1/2 shadow-[0_0_10px_rgba(0,210,255,0.5)]">
                        <p className="text-[5px] font-black uppercase tracking-widest text-cyan-400 whitespace-nowrap leading-none">
                            {label}
                        </p>
                    </div>
                </Html>
            )}
        </group>
    );
};

const CyberGlobe = ({ onSelectRegion }: { onSelectRegion: (region: string) => void }) => {
    // CORREÇÃO AQUI: Definimos o tipo correto para cada referência
    const coreRef = useRef<THREE.Mesh>(null);
    const wireframeGroupRef = useRef<THREE.Group>(null); // Ref de Grupo para o grupo rotativo

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (coreRef.current) coreRef.current.rotation.y = t / 15;
        if (wireframeGroupRef.current) wireframeGroupRef.current.rotation.y = t / 15;
    });

    return (
        <group>
            <Sphere ref={coreRef} args={[1.5, 64, 64]}>
                <meshPhongMaterial
                    color={COLOR_TECH_BLUE}
                    transparent={true}
                    opacity={0.8}
                    shininess={100}
                    specular={new THREE.Color("#00d2ff")}
                />
            </Sphere>

            {/* USANDO A REF DE GRUPO NO ELEMENTO GROUP */}
            <group ref={wireframeGroupRef}>
                <Sphere args={[1.55, 32, 32]}>
                    <meshBasicMaterial
                        color={COLOR_WIRE_BLUE}
                        wireframe
                        transparent
                        opacity={0.25}
                        toneMapped={false}
                    />
                </Sphere>

                <LocationMarker lat={39.8} lon={-98.6} label="USA" code="us" onClick={onSelectRegion} />
                <LocationMarker lat={-14.2} lon={-51.9} label="BRA" code="br" onClick={onSelectRegion} />
                <LocationMarker lat={35.8} lon={104.1} label="CHN" code="cn" onClick={onSelectRegion} />
            </group>

            <Sphere args={[1.8, 32, 32]}>
                <meshBasicMaterial
                    color={COLOR_WIRE_BLUE}
                    transparent
                    opacity={0.04}
                    side={THREE.BackSide}
                    toneMapped={false}
                />
            </Sphere>
        </group>
    );
};

interface LoungeEarthProps {
    onSelectRegion?: (region: string) => void;
}

const LoungeEarth: React.FC<LoungeEarthProps> = ({ onSelectRegion = () => {} }) => {
    return (
        <div className="w-full h-full">
            <Canvas camera={{ position: [0, 0, 4.8], fov: 45 }} gl={{ antialias: true }}>
                <ambientLight intensity={0.7} />
                <pointLight position={[10, 10, 10]} intensity={2.5} color="#ffffff" />
                <pointLight position={[-10, -10, -10]} intensity={1.5} color="#00d2ff" />
                <CyberGlobe onSelectRegion={onSelectRegion} />
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    rotateSpeed={0.6}
                    minPolarAngle={Math.PI / 3}
                    maxPolarAngle={Math.PI - Math.PI / 3}
                />
            </Canvas>
        </div>
    );
};

export default LoungeEarth;