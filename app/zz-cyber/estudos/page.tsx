"use client";
// PRÉVIA LOCAL (não commitar): Sala de Estudos (chat + biblioteca)
import StudyCoworkChat from "@/components/study/StudyCoworkChat";
export default function Previa() {
  return <div className="dark" style={{ position: "fixed", inset: 0, background: "#05060c" }}><StudyCoworkChat active /></div>;
}
