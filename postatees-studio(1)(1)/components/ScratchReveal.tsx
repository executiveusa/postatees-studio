
import React, { useRef, useEffect, useState } from 'react';
import { playSound } from '../services/audioService';

interface ScratchRevealProps {
    children: React.ReactNode;
    isRevealed: boolean;
    onRevealComplete: () => void;
}

export const ScratchReveal: React.FC<ScratchRevealProps> = ({ children, isRevealed, onRevealComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [percentCleared, setPercentCleared] = useState(0);

    useEffect(() => {
        if (isRevealed) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set proper canvas dimensions based on parent
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        // Fill with silver "foil"
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add noise texture
        for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#A0A0A0' : '#E0E0E0';
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
        }
        
        // Add Logo overlay
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCRATCH TO REVEAL', canvas.width/2, canvas.height/2);

    }, [isRevealed]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || isRevealed) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();
        
        if (Math.random() > 0.8) playSound('glitch');

        checkReveal();
    };

    const checkReveal = () => {
        // Simple incremental check for demo purposes
        // Real implementation would analyze pixel data
        setPercentCleared(p => {
            const newP = p + 2; // Faster reveal for better UX
            if (newP > 100) { // Threshold
                onRevealComplete();
            }
            return newP;
        });
    };

    return (
        <div className="relative w-full h-full">
            {children}
            {!isRevealed && (
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair z-20 transition-opacity duration-500 rounded-xl"
                    onMouseDown={() => setIsDrawing(true)}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseLeave={() => setIsDrawing(false)}
                    onMouseMove={handleMouseMove}
                />
            )}
        </div>
    );
};
