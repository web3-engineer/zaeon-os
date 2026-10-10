"use client";
import LoungeJanela from "@/components/lounge/LoungeJanela";
export default function Janela() {
  return <div style={{ position: "fixed", inset: 0, zIndex: 300, overflow: "auto", background: "#030014", padding: 24, display: "flex", justifyContent: "center" }}><LoungeJanela /></div>;
}
