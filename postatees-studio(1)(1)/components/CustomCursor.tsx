
import React, { useEffect, useState } from 'react';

export const CustomCursor = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isPointer, setIsPointer] = useState(false);
    const [isClicking, setIsClicking] = useState(false);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
            
            const target = e.target as HTMLElement;
            setIsPointer(window.getComputedStyle(target).cursor === 'pointer');
        };
        
        const onMouseDown = () => setIsClicking(true);
        const onMouseUp = () => setIsClicking(false);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    return (
        <div 
            className="fixed pointer-events-none z-[9999] mix-blend-difference"
            style={{ 
                left: position.x, 
                top: position.y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            {/* Main Cursor Dot */}
            <div className={`
                rounded-full bg-white transition-all duration-150 ease-out
                ${isClicking ? 'w-3 h-3' : 'w-4 h-4'}
                ${isPointer ? 'scale-150 bg-brand-primary' : ''}
            `} />
            
            {/* Spotlight / Halo */}
            <div className={`
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                rounded-full border border-white/30 transition-all duration-300 ease-out
                ${isClicking ? 'w-8 h-8 opacity-50' : 'w-12 h-12'}
                ${isPointer ? 'w-16 h-16 border-brand-primary/50' : ''}
            `} />
        </div>
    );
};
