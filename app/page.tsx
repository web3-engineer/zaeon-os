import { Suspense } from "react";
import  Encryption from "@/components/main/encryption";
import { Hero } from "@/components/main/hero";
import Projects from "@/components/main/projects";

export default function Home() {
  return (
    <main className="h-full w-full">
      <div className="flex flex-col gap-20">
        <Hero />
        <Encryption />
        <Suspense fallback={null}>
          <Projects />
        </Suspense>
      </div>
    </main>
  );
}
