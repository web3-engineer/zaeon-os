import Image from "next/image";

export type AIState = "idle" | "thinking" | "executing";

interface ZaeonLogoProps {
  aiState: AIState;
  className?: string;
}

export default function ZaeonLogo({ aiState, className = "w-10 h-10" }: ZaeonLogoProps) {
  const animation = aiState === "idle" ? "" : "motion-safe:animate-pulse";

  return (
    <span className={`relative block shrink-0 ${className} ${animation}`}>
      <Image src="/icons/hummingbird-compact.png" alt="" fill sizes="64px" className="object-contain" />
    </span>
  );
}
