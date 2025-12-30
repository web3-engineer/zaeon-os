"use client";

import { type PropsWithChildren, useEffect, useState } from "react";
import MacSplash from "@/components/ui/MacSplash";

export default function ClientShell({ children }: PropsWithChildren) {
    const [booting, setBooting] = useState(true);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setBooting(false), 3000);
        return () => clearTimeout(t);
    }, []);

    // When splash ends, reveal content with a soft fade/translate
    useEffect(() => {
        if (!booting) {
            const t = setTimeout(() => setRevealed(true), 20);
            return () => clearTimeout(t);
        }
    }, [booting]);

    return (
        <>
            <MacSplash show={booting} minDurationMs={3000} />
            <div
                aria-hidden={booting}
                className="transition-all duration-300"
                style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? "translateY(0px)" : "translateY(6px)",
                    willChange: "opacity, transform",
                }}
            >
                {children}
            </div>
        </>
    );
}