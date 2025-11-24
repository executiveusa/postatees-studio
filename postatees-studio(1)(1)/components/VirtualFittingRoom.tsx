
import React, { useState, useRef, useCallback } from 'react';
import { Icons } from './Icons';
import { Tooltip } from './Tooltip';
import { generateTryOn, generateVideoFromImage } from '../services/geminiService';

interface VirtualFittingRoomProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDesignBase64: string | null;
}

export const VirtualFittingRoom: React.FC<VirtualFittingRoomProps> = ({ isOpen, onClose, selectedDesignBase64 }) => {
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [scale, setScale] = useState(1);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => setUserPhoto(evt.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleTryOn = async () => {
        if (!userPhoto || !selectedDesignBase64) return;
        setIsGenerating(true);
        try {
            const userBase64 = userPhoto.split(',')[1];
            const resultBase64 = await generateTryOn(userBase64, selectedDesignBase64);
            setResultImage(resultBase64);
        } catch (e) {
            alert("Try-On failed. Ensure your photo is clear.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handle360View = async () => {
        if (!resultImage) return;
        setIsVideoLoading(true);
        try {
            await generateVideoFromImage(
                resultImage,
                "360 degree orbit shot of the person, studio lighting, photorealistic, seamless loop",
                "9:16",
                () => {}, // progress
                (url) => setVideoUrl(url),
                (err) => alert(err.message)
            );
        } finally {
            setIsVideoLoading(false);
        }
    };

    const handleBuy = () => {
        window.open('https://www.postatees.com', '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative w-full max-w-6xl bg-brand-bg border border-brand-primary/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] animate-[scaleIn_0.2s_ease-out]">
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full hover:bg-white/10 text-white">
                    <Icons.close className="w-6 h-6" />
                </button>

                {/* Left: Inputs */}
                <div className="w-full md:w-1/3 bg-surface-glass p-8 border-r border-white/10 flex flex-col gap-6 overflow-y-auto">
                    <div className="space-y-2">
                        <h2 className="font-display text-3xl text-white uppercase tracking-wide">Fitting Room</h2>
                        <p className="text-sm text-text-muted">Upload a photo to visualize the fit using Nano Banana AI.</p>
                    </div>

                    {/* User Photo Upload */}
                    <div className="space-y-3">
                        <h3 className="text-brand-primary font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            <Icons.camera className="w-4 h-4" /> Step 1: Your Photo
                        </h3>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-[3/4] border-2 border-dashed border-white/20 rounded-xl hover:border-brand-primary/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group"
                        >
                            {userPhoto ? (
                                <img src={userPhoto} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                            ) : (
                                <div className="text-center p-4">
                                    <Icons.upload className="w-10 h-10 mx-auto text-white/30 mb-2" />
                                    <span className="text-xs text-white/50">Click to Upload Selfie</span>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
                        </div>
                    </div>

                    {/* Selected Design Preview */}
                    <div className="space-y-3">
                        <h3 className="text-brand-primary font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                             <Icons.shirt className="w-4 h-4" /> Step 2: Selected Design
                        </h3>
                        {selectedDesignBase64 ? (
                            <div className="aspect-square rounded-xl border border-white/10 overflow-hidden bg-black relative">
                                <img src={`data:image/png;base64,${selectedDesignBase64}`} className="w-full h-full object-contain p-2" />
                            </div>
                        ) : (
                            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-xs text-center">
                                No design selected. Go back and pick one.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleTryOn}
                        disabled={!userPhoto || !selectedDesignBase64 || isGenerating}
                        className="w-full py-4 bg-brand-primary text-black font-display font-bold text-xl uppercase tracking-wider hover:bg-white transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(242,190,34,0.3)]"
                    >
                        {isGenerating ? "Stitching..." : "Generate Fit"}
                    </button>
                </div>

                {/* Right: Output Canvas */}
                <div className="w-full md:w-2/3 bg-black relative flex items-center justify-center overflow-hidden">
                     {/* Background Grid */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                    
                    {videoUrl ? (
                         <div className="relative w-full h-full flex items-center justify-center bg-black">
                            <video src={videoUrl} autoPlay loop controls className="max-h-full max-w-full" />
                            <button 
                                onClick={() => setVideoUrl(null)}
                                className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full text-xs hover:bg-white/20"
                            >
                                Back to Image
                            </button>
                        </div>
                    ) : resultImage ? (
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing group">
                            <div 
                                className="relative transition-transform duration-200"
                                style={{ transform: `scale(${scale})` }}
                                onWheel={(e) => setScale(s => Math.min(3, Math.max(1, s - e.deltaY * 0.001)))}
                            >
                                <img src={`data:image/png;base64,${resultImage}`} className="max-h-[85vh] object-contain shadow-2xl" />
                            </div>
                            
                            {/* HUD Overlay */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 items-center">
                                <Tooltip content="See yourself from all angles (Veo)">
                                    <button 
                                        onClick={handle360View}
                                        disabled={isVideoLoading}
                                        className="flex flex-col items-center gap-2 group/btn"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover/btn:bg-brand-accent group-hover/btn:text-black transition-colors backdrop-blur-md">
                                            {isVideoLoading ? <Icons.loader className="animate-spin w-6 h-6" /> : <Icons.video className="w-6 h-6" />}
                                        </div>
                                        <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold">360° View</span>
                                    </button>
                                </Tooltip>

                                <button 
                                    onClick={handleBuy}
                                    className="flex flex-col items-center gap-2 group/btn"
                                >
                                    <div className="w-16 h-16 rounded-full bg-brand-primary flex items-center justify-center shadow-[0_0_30px_rgba(242,190,34,0.4)] hover:scale-110 transition-transform z-10 text-black">
                                        <Icons.cart className="w-8 h-8" />
                                    </div>
                                    <span className="text-xs uppercase tracking-widest text-brand-primary font-bold">Buy Now</span>
                                </button>

                                <button 
                                    onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = `data:image/png;base64,${resultImage}`;
                                        a.download = 'postatees-fit.png';
                                        a.click();
                                    }}
                                    className="flex flex-col items-center gap-2 group/btn"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover/btn:bg-white group-hover/btn:text-black transition-colors backdrop-blur-md">
                                        <Icons.download className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Save</span>
                                </button>
                            </div>
                            
                            <div className="absolute top-4 left-4 text-xs font-mono text-white/30 pointer-events-none">
                                SCROLL TO ZOOM • DRAG TO PAN
                            </div>
                        </div>
                    ) : (
                        <div className="text-center opacity-30">
                            <Icons.shirt className="w-32 h-32 mx-auto mb-4" />
                            <p className="font-display text-2xl uppercase">Ready to Fit</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
