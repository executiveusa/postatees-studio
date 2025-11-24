
import React, { useRef, useState } from 'react';
import { Icons } from './Icons';
import { extractStyleFromImage } from '../services/geminiService';
import { playSound } from '../services/audioService';

interface StyleStealerProps {
    onStyleExtracted: (stylePrompt: string) => void;
}

export const StyleStealer: React.FC<StyleStealerProps> = ({ onStyleExtracted }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        playSound('click');
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const base64 = (evt.target?.result as string).split(',')[1];
            try {
                const style = await extractStyleFromImage(base64);
                onStyleExtracted(style);
                playSound('success');
            } catch (err) {
                console.error(err);
                playSound('error');
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="bg-surface-glass border border-surface-border p-4 rounded-xl flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase text-brand-primary flex items-center gap-2">
                <Icons.sparkles className="w-3 h-3" /> Style Stealer
            </h4>
            <p className="text-[10px] text-text-muted">Upload a shirt to copy its vibe.</p>
            <button 
                onClick={() => inputRef.current?.click()}
                disabled={isAnalyzing}
                className="bg-white/10 hover:bg-white/20 text-xs py-2 rounded-lg border border-white/10 transition-colors"
            >
                {isAnalyzing ? "Analyzing DNA..." : "Upload Reference"}
            </button>
            <input type="file" ref={inputRef} className="hidden" onChange={handleUpload} accept="image/*" />
        </div>
    );
};
