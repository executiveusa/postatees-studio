
import React, { useMemo } from 'react';
import { Icons } from './Icons';

interface HypeMeterProps {
    prompt: string;
}

export const HypeMeter: React.FC<HypeMeterProps> = ({ prompt }) => {
    const hypeScore = useMemo(() => {
        if (!prompt) return 0;
        let score = 0;
        if (prompt.length > 20) score += 20;
        if (prompt.length > 50) score += 20;
        
        const powerWords = ['vector', 'halftone', 'vintage', 'bootleg', 'collage', 'shading', 'gta', 'texture', 'heavy', 'contrast'];
        powerWords.forEach(word => {
            if (prompt.toLowerCase().includes(word)) score += 10;
        });
        
        return Math.min(100, score);
    }, [prompt]);

    const getHypeLabel = (score: number) => {
        if (score < 30) return "Weak Sauce";
        if (score < 60) return "Heating Up";
        if (score < 90) return "Fire";
        return "GOD TIER";
    };

    const getColor = (score: number) => {
        if (score < 30) return "bg-gray-500";
        if (score < 60) return "bg-yellow-500";
        if (score < 90) return "bg-orange-500";
        return "bg-red-600 shadow-[0_0_10px_#DC2626]";
    };

    return (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 z-10">
            <div className="text-[10px] font-bold uppercase text-white w-20 text-right">
                {getHypeLabel(hypeScore)}
            </div>
            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${getColor(hypeScore)}`} 
                    style={{ width: `${hypeScore}%` }}
                />
            </div>
            {hypeScore >= 90 && <Icons.fire className="w-3 h-3 text-red-500 animate-bounce" />}
        </div>
    );
};
