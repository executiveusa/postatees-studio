
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import type { ImageVariant, VideoGenerationState, AspectRatio } from '../types';
import { Icons } from './Icons';
import { ImageUploader } from './ImageUploader';
import { ImageGrid } from './ImageGrid';
import { VideoGenerator } from './VideoGenerator';
import { RefinementChat } from './RefinementChat';
import { Tooltip } from './Tooltip';
import { enhancePrompt } from '../services/geminiService';
import { playSound } from '../services/audioService';
import { convertToSVG } from '../services/vectorService';
import { HypeMeter } from './HypeMeter';
import { StyleStealer } from './StyleStealer';
import { MarketingGenerator } from './MarketingGenerator';

interface GenerationPanelProps {
    prompt: string;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    onGenerateImages: () => void;
    isLoadingImages: boolean;
    imageVariants: ImageVariant[];
    onSelectVariant: (variant: ImageVariant) => void;
    selectedVariant: ImageVariant | null;
    onGenerateVideo: (aspectRatio: AspectRatio, videoPrompt: string) => void;
    videoState: VideoGenerationState;
    uploadedImage: string | null;
    setUploadedImage: (image: string | null) => void;
    error: string | null;
    onSaveProject: () => void;
    onOpenFittingRoom: () => void;
}

// Base64 encoding helper
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const QUICK_PLAYS = [
    { label: "The Goat", prompt: "Michael Jordan, collage grid, chicago red background, halftone shadows, thick vector outlines, vintage bootleg typography" },
    { label: "Seattle Reign", prompt: "Shawn Kemp dunking, split panel layout, green and yellow palette, grunge texture, sonic waves background, 90s comic book style" },
    { label: "Modern King", prompt: "LeBron James, crown graphic, purple and gold, cel-shaded vector, gta loading screen box art style, bold composition" },
    { label: "Street Legend", prompt: "Allen Iverson, crossover dribble, urban concrete texture, graffiti elements, airbrush fade, high contrast vector collage" }
];

const STYLE_CHIPS = [
    { id: 'halftone', label: 'Halftone Heavy', suffix: ', heavy ben-day dot shading, comic book texture, pop art' },
    { id: 'gta', label: 'GTA Style', suffix: ', grand theft auto loading screen art style, cel shaded, vector illustration' },
    { id: 'bootleg', label: '90s Bootleg', suffix: ', vintage rap tee aesthetic, collage composition, distressed texture' },
    { id: 'clean', label: 'Clean Vector', suffix: ', thick black outlines, flat colors, sticker art, vector graphic' }
];

export const GenerationPanel: React.FC<GenerationPanelProps> = ({
    prompt,
    setPrompt,
    onGenerateImages,
    isLoadingImages,
    imageVariants,
    onSelectVariant,
    selectedVariant,
    onGenerateVideo,
    videoState,
    uploadedImage,
    setUploadedImage,
    error,
    onSaveProject,
    onOpenFittingRoom
}) => {
    const [isListening, setIsListening] = useState(false);
    const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [isExportingSvg, setIsExportingSvg] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const createBlob = (data: Float32Array): { data: string; mimeType: string } => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const startListening = async () => {
        if (isListening) return;
        playSound('click');
        setLiveStatus('connecting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setLiveStatus('active');
                        setIsListening(true);
                        playSound('success');
                        
                        mediaStreamSourceRef.current = audioContextRef.current!.createMediaStreamSource(stream);
                        scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current!.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const { text } = message.serverContent.inputTranscription;
                            setPrompt(prev => prev + text);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        stopListening();
                        setLiveStatus('error');
                        playSound('error');
                    },
                    onclose: () => {
                        stopListening();
                    },
                },
                config: {
                    inputAudioTranscription: {},
                },
            });
            sessionPromiseRef.current = sessionPromise;

        } catch (e) {
            console.error('Failed to start listening:', e);
            setLiveStatus('error');
            playSound('error');
        }
    };

    const stopListening = useCallback(() => {
        setIsListening(false);
        setLiveStatus('idle');
        playSound('click');

        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current?.disconnect();
        mediaStreamSourceRef.current = null;
        
        audioContextRef.current?.close();
        audioContextRef.current = null;
    }, []);

    const toggleListen = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt) return;
        playSound('click');
        setIsEnhancing(true);
        const enhanced = await enhancePrompt(prompt);
        setPrompt(enhanced);
        setIsEnhancing(false);
        playSound('success');
    };

    const appendStyle = (suffix: string) => {
        playSound('hover');
        setPrompt(prev => {
            if(prev.includes(suffix)) return prev;
            return prev + " " + suffix;
        });
    };

    const handleDownload = () => {
        if (!selectedVariant) return;
        playSound('click');
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${selectedVariant.base64}`;
        link.download = `PostaTees_${Date.now()}_Draft.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportSVG = async () => {
        if (!selectedVariant) return;
        setIsExportingSvg(true);
        playSound('click');
        try {
            const svgContent = await convertToSVG(selectedVariant.base64);
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `PostaTees_${Date.now()}_Vector.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            playSound('success');
        } catch (e) {
            console.error(e);
            alert("Failed to vectorize image.");
            playSound('error');
        } finally {
            setIsExportingSvg(false);
        }
    };

    const handleGenerateClick = () => {
        playSound('click');
        onGenerateImages();
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-surface-light-glass dark:bg-surface-glass border border-surface-light-border dark:border-surface-border rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl relative group/panel transition-all hover:border-brand-primary/30">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-2xl rounded-full pointer-events-none" />

                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        
                        <div className="w-full md:w-1/3 space-y-4">
                            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-brand-primary flex items-center gap-2">
                                <Icons.image className="w-5 h-5" /> Source Material
                            </h3>
                            <ImageUploader uploadedImage={uploadedImage} setUploadedImage={setUploadedImage} />
                            <StyleStealer onStyleExtracted={(style) => {
                                setPrompt(prev => prev + " " + style);
                                playSound('success');
                            }} />
                        </div>

                        <div className="w-full md:w-2/3 space-y-4 relative">
                            <div className="flex justify-between items-center">
                                <h3 className="font-display text-lg font-bold uppercase tracking-wide text-brand-primary flex items-center gap-2">
                                    <Icons.mic className="w-5 h-5" /> Play Calling (Prompt)
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="hidden md:flex gap-1">
                                        {STYLE_CHIPS.map(style => (
                                            <button 
                                                key={style.id}
                                                onClick={() => appendStyle(style.suffix)}
                                                onMouseEnter={() => playSound('hover')}
                                                className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-brand-primary hover:text-black transition-colors border border-black/5 dark:border-white/5 hover:border-brand-primary text-text-dark dark:text-white"
                                            >
                                                {style.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 pl-2 border-l border-black/10 dark:border-white/10">
                                        <div className={`h-2 w-2 rounded-full transition-colors duration-500 ${isListening ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-surface-border'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Enter Player Name & Team... (e.g., 'Anthony Edwards Timberwolves')"
                                    className="w-full h-56 p-6 pr-16 bg-white/50 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 transition-all resize-none font-sans text-xl leading-relaxed placeholder:text-black/40 dark:placeholder:text-white/20 text-text-dark dark:text-white shadow-inner"
                                    disabled={isLoadingImages}
                                />
                                
                                <HypeMeter prompt={prompt} />
                                
                                {prompt.length > 3 && !isLoadingImages && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <Tooltip content="PostaTees-ify Prompt">
                                            <button
                                                onClick={handleEnhancePrompt}
                                                disabled={isEnhancing}
                                                className="p-2 rounded-xl bg-gradient-to-br from-brand-primary to-yellow-600 text-black shadow-lg hover:scale-105 transition-transform border border-white/20"
                                            >
                                                {isEnhancing ? <Icons.loader className="w-4 h-4 animate-spin"/> : <Icons.sparkles className="w-4 h-4" />}
                                            </button>
                                        </Tooltip>
                                    </div>
                                )}

                                <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                    <Tooltip content="Save Project to Vault">
                                        <button
                                            onClick={() => { playSound('click'); onSaveProject(); }}
                                            disabled={!prompt}
                                            className="group flex items-center gap-2 p-3 pr-4 rounded-full bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-muted hover:text-brand-primary hover:border-brand-primary/50 transition-all hover:bg-white/10"
                                        >
                                            <Icons.save className="h-5 w-5" />
                                            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-xs font-bold uppercase text-brand-primary">Save</span>
                                        </button>
                                    </Tooltip>

                                    <Tooltip content={isListening ? "Cut Mic" : "Voice Dictation"}>
                                        <button 
                                            onClick={toggleListen}
                                            className={`p-3 rounded-full transition-all duration-300 border backdrop-blur-md ${
                                                isListening 
                                                ? 'bg-red-600/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                                                : 'bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-muted hover:text-text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {liveStatus === 'connecting' ? (
                                                <Icons.loader className="h-5 w-5 animate-spin" />
                                            ) : isListening ? (
                                                <Icons.micOff className="h-5 w-5" />
                                            ) : (
                                                <Icons.mic className="h-5 w-5" />
                                            )}
                                        </button>
                                    </Tooltip>
                                    
                                    <button 
                                        onClick={handleGenerateClick} 
                                        disabled={isLoadingImages || (!prompt && !uploadedImage)}
                                        className="flex items-center gap-2 py-3 px-8 rounded-full bg-brand-primary text-black font-display font-bold text-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(242,190,34,0.4)] hover:shadow-[0_0_30px_rgba(242,190,34,0.6)] hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {isLoadingImages ? (
                                            <Icons.loader className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Icons.sparkles className="h-5 w-5" />
                                        )}
                                        <span>CREATE MOCKUP</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs font-mono text-text-muted uppercase py-1 mr-1">Quick Plays:</span>
                                {QUICK_PLAYS.map((play, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => { setPrompt(play.prompt); playSound('click'); }}
                                        className="px-3 py-1 text-xs rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-brand-primary/50 hover:text-brand-primary transition-colors text-text-muted"
                                    >
                                        {play.label}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="p-4 bg-red-900/40 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-100 text-sm animate-[shake_0.5s_ease-in-out] shadow-lg">
                                    <Icons.close className="h-5 w-5 shrink-0 text-red-400" />
                                    <span className="font-medium">{error}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className={`lg:col-span-${selectedVariant ? '8' : '12'} transition-all duration-500`}>
                     {isLoadingImages ? (
                        <div className="h-96 rounded-3xl border border-surface-light-border dark:border-surface-border bg-surface-light-glass dark:bg-surface-glass flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-primary/10 to-transparent animate-[shimmer_1.5s_infinite]" />
                            <Icons.basketball className="h-16 w-16 animate-bounce text-brand-primary mb-6 relative z-10" style={{ animationDuration: '0.8s' }} />
                            <p className="font-display text-2xl text-text-dark dark:text-white relative z-10 tracking-wide">CONSTRUCTING GRID...</p>
                            <p className="font-mono text-brand-primary/80 text-sm mt-2">Applying GTA Box Art Layout & Vectors</p>
                        </div>
                    ) : imageVariants.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-text-dark dark:text-white flex items-center gap-2">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 text-brand-primary border border-brand-primary/20 text-sm">03</span>
                                    Select Your Drop
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={onSaveProject}
                                        className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-brand-primary/20 rounded-lg text-xs font-bold uppercase tracking-wider text-text-dark dark:text-white hover:text-brand-primary transition-colors border border-black/10 dark:border-white/10 hover:border-brand-primary/50"
                                    >
                                        <Icons.save className="w-4 h-4" />
                                        <span>Stash</span>
                                    </button>

                                    {selectedVariant && (
                                        <>
                                        <Tooltip content="Refine Design (Chat)">
                                            <button
                                                onClick={() => setShowChat(!showChat)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${showChat ? 'bg-brand-primary text-black border-brand-primary' : 'bg-black/10 dark:bg-white/10 text-text-dark dark:text-white border-black/10 dark:border-white/10 hover:bg-black/20 dark:hover:bg-white/20'}`}
                                            >
                                                <Icons.chat className="w-4 h-4" /> Edit
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Virtual Fitting Room">
                                            <button 
                                                onClick={onOpenFittingRoom}
                                                className="flex items-center gap-2 px-4 py-2 bg-brand-accent/20 hover:bg-brand-accent rounded-lg text-xs font-bold uppercase tracking-wider text-brand-accent hover:text-black transition-colors border border-brand-accent/50"
                                            >
                                                <Icons.shirt className="w-4 h-4" /> Try On
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Download as PNG">
                                            <button 
                                                onClick={handleDownload}
                                                className="flex items-center gap-2 px-4 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-wider text-text-dark dark:text-white transition-colors border border-black/10 dark:border-white/10"
                                            >
                                                <Icons.download className="w-4 h-4" /> PNG
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Export as Scalable Vector Graphics (SVG)">
                                            <button 
                                                onClick={handleExportSVG}
                                                disabled={isExportingSvg}
                                                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors border border-brand-primary disabled:opacity-50 disabled:cursor-wait shadow-[0_0_15px_rgba(242,190,34,0.3)]"
                                            >
                                                {isExportingSvg ? <Icons.loader className="w-4 h-4 animate-spin"/> : <Icons.vector className="w-4 h-4" />}
                                                SVG
                                            </button>
                                        </Tooltip>
                                        </>
                                    )}
                                </div>
                            </div>
                            <ImageGrid 
                                variants={imageVariants} 
                                onSelect={(v) => { playSound('click'); onSelectVariant(v); }}
                                selectedId={selectedVariant?.id}
                            />
                        </div>
                    ) : (
                         <div className="h-64 rounded-3xl border-2 border-dashed border-black/10 dark:border-white/10 bg-surface-light-glass/20 dark:bg-surface-glass/20 flex flex-col items-center justify-center text-center p-8 hover:border-brand-primary/30 transition-colors group">
                            <div className="p-4 rounded-full bg-black/5 dark:bg-white/5 mb-4 group-hover:scale-110 transition-transform">
                                <Icons.image className="h-8 w-8 text-text-muted group-hover:text-brand-primary" />
                            </div>
                            <p className="text-text-muted font-medium">Vector Collage Mockups will appear here.</p>
                            <p className="text-xs text-text-muted/70 mt-2">Strict PostaTees Style Enforced.</p>
                        </div>
                    )}
                </div>

                {selectedVariant && (
                    <div className="lg:col-span-4 animate-[fadeIn_0.5s_ease-out]">
                        <div className="sticky top-24 space-y-4">
                             {showChat ? (
                                <RefinementChat 
                                    selectedBase64={selectedVariant.base64}
                                    onRefined={(newBase64) => {
                                        playSound('success');
                                        const link = document.createElement('a');
                                        link.href = `data:image/png;base64,${newBase64}`;
                                        link.download = `PostaTees_Refined_${Date.now()}.png`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                />
                             ) : (
                                <>
                                    <MarketingGenerator selectedBase64={selectedVariant.base64} />
                                    
                                    <h3 className="font-display text-xl font-bold uppercase tracking-wide text-text-dark dark:text-white flex items-center gap-2 mt-4">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-accent text-black text-sm border border-brand-accent">04</span>
                                        Animate (Veo)
                                    </h3>
                                   <VideoGenerator 
                                        selectedVariant={selectedVariant}
                                        videoState={videoState}
                                        onGenerate={onGenerateVideo}
                                   />
                               </>
                             )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
