
import React, { useState } from 'react';
import type { ImageVariant } from '../types';
import { Icons } from './Icons';
import { ScratchReveal } from './ScratchReveal';

interface ImageGridProps {
    variants: ImageVariant[];
    onSelect: (variant: ImageVariant) => void;
    selectedId?: string;
}

export const ImageGrid: React.FC<ImageGridProps> = ({ variants, onSelect, selectedId }) => {
    // Track revealed state locally per session
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

    const handleReveal = (id: string) => {
        setRevealedIds(prev => new Set(prev).add(id));
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {variants.map((variant) => {
                const isSelected = selectedId === variant.id;
                const isRevealed = revealedIds.has(variant.id);
                
                return (
                    <div 
                        key={variant.id}
                        className={`
                            group relative aspect-square rounded-xl overflow-hidden transition-all duration-500 ease-out
                            ${isSelected 
                                ? 'ring-4 ring-brand-primary ring-offset-2 ring-offset-brand-bg shadow-[0_0_30px_rgba(242,190,34,0.5)] scale-[1.02]' 
                                : 'hover:ring-2 hover:ring-brand-primary/50 hover:scale-[1.05] hover:shadow-[0_0_25px_rgba(242,190,34,0.4)]'
                            }
                        `}
                    >
                        <ScratchReveal isRevealed={isRevealed} onRevealComplete={() => handleReveal(variant.id)}>
                            <div 
                                onClick={() => onSelect(variant)}
                                className="w-full h-full cursor-pointer"
                            >
                                <img 
                                    src={`data:image/png;base64,${variant.base64}`} 
                                    alt="Generated Design" 
                                    className={`w-full h-full object-cover transition-transform duration-700 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}
                                />
                                
                                {/* Overlay */}
                                <div className={`absolute inset-0 bg-black/0 transition-colors duration-300 ${isSelected ? '' : 'group-hover:bg-brand-primary/10'}`} />
                                
                                {/* Selection Checkmark */}
                                {isSelected && (
                                    <div className="absolute top-2 right-2 bg-brand-primary text-brand-bg rounded-full p-1 shadow-lg z-10 animate-[scaleIn_0.2s_ease-out]">
                                        <Icons.check className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        </ScratchReveal>
                    </div>
                );
            })}
        </div>
    );
};
