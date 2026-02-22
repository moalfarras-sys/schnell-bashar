"use client";

import { useEffect, useState } from "react";

const PARTICLE_COUNT = 18;

interface Particle {
    x: number;
    y: number;
    dx: number;
    dy: number;
    size: number;
    opacity: number;
    duration: number;
    delay: number;
    accent: boolean;
}

function generateParticles(): Particle[] {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        dx: (Math.random() - 0.5) * 120,
        dy: -(Math.random() * 150 + 50),
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        duration: Math.random() * 12 + 8,
        delay: Math.random() * 10,
        accent: i % 3 === 0,
    }));
}

export function FloatingParticles() {
    // Only generate particles after mount to avoid hydration mismatch (Math.random differs between server/client)
    const [particles, setParticles] = useState<Particle[] | null>(null);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (mq.matches) return;
        const id = window.requestAnimationFrame(() => {
            setParticles(generateParticles());
        });
        return () => window.cancelAnimationFrame(id);
    }, []);

    return (
        <div
            className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
            aria-hidden="true"
        >
            {particles?.map((p, i) => (
                <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: p.accent
                            ? "var(--particle-color-accent)"
                            : "var(--particle-color)",
                        opacity: p.opacity,
                        animation: `particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
                        ["--dx" as string]: `${p.dx}px`,
                        ["--dy" as string]: `${p.dy}px`,
                        filter: `blur(${p.size > 2.5 ? 1 : 0}px)`,
                        boxShadow: p.accent
                            ? "0 0 6px var(--particle-color-accent)"
                            : "none",
                    }}
                />
            ))}
        </div>
    );
}
