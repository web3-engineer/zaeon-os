"use client";

import dynamic from "next/dynamic";

// Lounge = interativo de portais por curso (Global/MedLab/Bio/Quantic/Cyber/Human),
// onde cada portal abre o feed daquele curso via /api/posts?room=X. É a referência
// antiga da lounge room (THREE.js → ssr:false).
const LoungePortals = dynamic(
  () => import("@/app/study-rooms/lounge/main-lounge/community/page"),
  { ssr: false },
);

export default function StudentLoungeContent({ focusMode = false }: { focusMode?: boolean } = {}) {
  return (
    <div className="w-full h-full">
      <LoungePortals focusMode={focusMode} />
    </div>
  );
}
