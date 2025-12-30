import { HeroContent } from "@/components/sub/hero-content";

export const Hero = () => {
    return (
        <div className="relative flex flex-col h-full w-full">
            {/* Removido o vídeo de fundo para isolar o efeito Matrix */}
            <HeroContent />
        </div>
    );
};