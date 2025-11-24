
import React from 'react';
import { Icons } from './Icons';

interface MarketingGeneratorProps {
    selectedBase64: string;
}

export const MarketingGenerator: React.FC<MarketingGeneratorProps> = ({ selectedBase64 }) => {
    const handleGenerate = (platform: 'tiktok' | 'ig') => {
        // Simulation of canvas composition
        alert(`Generating ${platform} assets... (This would download a composited .png)`);
    };

    return (
        <div className="space-y-4 bg-surface-glass p-4 rounded-xl border border-surface-border">
            <h3 className="font-display text-lg text-white flex items-center gap-2">
                <Icons.fire className="w-4 h-4 text-red-500" /> Social Drop Pack
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleGenerate('tiktok')} className="aspect-[9/16] bg-black border border-white/10 rounded-xl relative overflow-hidden group hover:border-brand-primary transition-colors">
                     <img src={`data:image/png;base64,${selectedBase64}`} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                     <div className="absolute inset-0 flex items-center justify-center">
                         <span className="font-bold text-xl text-white drop-shadow-lg">DROP<br/>NOW</span>
                     </div>
                     <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 px-2 rounded text-white">TikTok 9:16</div>
                </button>
                
                <button onClick={() => handleGenerate('ig')} className="aspect-square bg-black border border-white/10 rounded-xl relative overflow-hidden group hover:border-brand-primary transition-colors">
                     <img src={`data:image/png;base64,${selectedBase64}`} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                     <div className="absolute bottom-4 right-4 bg-brand-primary text-black text-xs font-bold px-3 py-1 -rotate-12">
                         NEW ARRIVAL
                     </div>
                     <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 px-2 rounded text-white">Feed 1:1</div>
                </button>
            </div>
        </div>
    );
};
