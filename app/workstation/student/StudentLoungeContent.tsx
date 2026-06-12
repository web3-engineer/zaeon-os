"use client";

import dynamic from "next/dynamic";

// Lounge = globo Zaeon + mural estilo Twitter futurista (com gate social por curso).
// LoungeEarth usa THREE.js, então carrega só no cliente (ssr: false).
const LoungeEarth = dynamic(() => import("@/components/sub/LoungeEarth"), { ssr: false });

export default function StudentLoungeContent() {
    return (
        <div className="w-full h-full">
            <LoungeEarth />
        </div>
    );
}
