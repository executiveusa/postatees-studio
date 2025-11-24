
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { GenerationPanel } from './components/GenerationPanel';
import { ApiKeySelector } from './components/ApiKeySelector';
import { LandingPage } from './components/LandingPage';
import { ProjectVault } from './components/ProjectVault';
import { VirtualFittingRoom } from './components/VirtualFittingRoom';
import { CustomCursor } from './components/CustomCursor';
import { DesignBattles } from './components/DesignBattles';
import type { ImageVariant, AspectRatio, VideoGenerationState, SavedProject } from './types';
import { generateTeeDesigns, generateVideoFromImage } from './services/geminiService';
import { getAllProjects, saveProjectToDB, deleteProjectFromDB } from './services/storageService';

declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}

export default function App() {
    const [hasEntered, setHasEntered] = useState(false);
    const [prompt, setPrompt] = useState<string>('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [imageVariants, setImageVariants] = useState<ImageVariant[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<ImageVariant | null>(null);
    const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // Theme State
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
    const [videoState, setVideoState] = useState<VideoGenerationState>({
        status: 'idle',
        url: null,
        progress: 0,
        error: null,
    });

    // Persistence State
    const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
    const [isVaultOpen, setIsVaultOpen] = useState(false);
    const [isFittingRoomOpen, setIsFittingRoomOpen] = useState(false);
    
    useEffect(() => {
        // Initialize Theme
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
        
        setTheme(initialTheme);
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');

        const checkApiKey = async () => {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkApiKey();
        
        // Load projects from IndexedDB
        const loadProjects = async () => {
            try {
                const projects = await getAllProjects();
                setSavedProjects(projects);
            } catch (e) {
                console.error("Failed to load projects", e);
            }
        };
        loadProjects();
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const handleSaveProject = async () => {
        if (!prompt) return;
        
        const name = window.prompt("Name this drop:", prompt.substring(0, 20) + "...");
        if (!name) return;

        // Use crypto.randomUUID if available, else fallback to Date+Random
        const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newProject: SavedProject = {
            id: uniqueId,
            name,
            timestamp: Date.now(),
            prompt,
            uploadedImage,
            imageVariants,
            selectedVariantId: selectedVariant?.id || null
        };

        try {
            await saveProjectToDB(newProject);
            setSavedProjects(prev => [newProject, ...prev]);
            alert("Project stashed in the Vault.");
            setError(null);
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : "Unknown Database Error";
            setError(`Failed to save: ${message}`);
        }
    };

    const handleLoadProject = (project: SavedProject) => {
        setPrompt(project.prompt);
        setUploadedImage(project.uploadedImage);
        setImageVariants(project.imageVariants);
        const variant = project.imageVariants.find(v => v.id === project.selectedVariantId) || null;
        setSelectedVariant(variant);
        setVideoState({ status: 'idle', url: null, progress: 0, error: null });
        setError(null);
    };

    const handleDeleteProject = async (id: string) => {
        if(window.confirm("Are you sure you want to trash this project?")) {
            try {
                await deleteProjectFromDB(id);
                setSavedProjects(prev => prev.filter(p => p.id !== id));
            } catch (e) {
                console.error("Failed to delete", e);
                setError("Failed to delete project.");
            }
        }
    };

    const handleImageGeneration = useCallback(async () => {
        if (!prompt && !uploadedImage) {
            setError('Give me a play to run. Enter a prompt or upload a reference.');
            return;
        }
        setIsLoadingImages(true);
        setError(null);
        setImageVariants([]);
        setSelectedVariant(null);
        setVideoState({ status: 'idle', url: null, progress: 0, error: null });

        try {
            const base64ImageData = uploadedImage ? uploadedImage.split(',')[1] : null;
            const mimeType = uploadedImage ? uploadedImage.split(';')[0].split(':')[1] : null;

            const designs = await generateTeeDesigns(prompt, base64ImageData, mimeType);
            setImageVariants(designs.map((base64, index) => ({ id: `variant-${index}-${Date.now()}`, base64 })));
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Foul on the play. Failed to generate designs. Try again.';
            setError(errorMessage);
        } finally {
            setIsLoadingImages(false);
        }
    }, [prompt, uploadedImage]);

    const handleVideoGeneration = useCallback(async (aspectRatio: AspectRatio, videoPrompt: string) => {
        if (!selectedVariant) {
            setVideoState({ status: 'error', url: null, progress: 0, error: 'Select a design first to animate.' });
            return;
        }
        
        if (!apiKeySelected) {
            try {
                await window.aistudio?.openSelectKey();
                setApiKeySelected(true);
            } catch (e) {
                 setVideoState({ status: 'error', url: null, progress: 0, error: 'API Key required for the highlights reel.' });
                 return;
            }
        }
        
        setVideoState({ status: 'generating', url: null, progress: 0, error: null });

        try {
            const base64ImageData = selectedVariant.base64;
            await generateVideoFromImage(
                base64ImageData,
                videoPrompt,
                aspectRatio,
                (progress) => setVideoState(prev => ({ ...prev, progress })),
                (url) => setVideoState({ status: 'success', url, progress: 100, error: null }),
                (e) => {
                    const errorMessage = e instanceof Error ? e.message : 'Unknown error.';
                    if (errorMessage.includes("Requested entity was not found.")) {
                        setApiKeySelected(false);
                        setVideoState({ status: 'error', url: null, progress: 0, error: 'Invalid Key. Please re-select.' });
                    } else {
                        setVideoState({ status: 'error', url: null, progress: 0, error: `Animation failed: ${errorMessage}` });
                    }
                }
            );
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error.';
            setVideoState({ status: 'error', url: null, progress: 0, error: `Animation failed: ${errorMessage}` });
        }
    }, [selectedVariant, apiKeySelected]);

    const handleSelectVariant = (variant: ImageVariant) => {
        setSelectedVariant(variant);
        if (selectedVariant?.id !== variant.id) {
            setVideoState({ status: 'idle', url: null, progress: 0, error: null });
        }
    };

    if (!hasEntered) {
        return <LandingPage onEnter={() => setHasEntered(true)} isDark={theme === 'dark'} toggleTheme={toggleTheme} />;
    }

    return (
        <div className="min-h-screen bg-brand-light-bg dark:bg-brand-bg relative overflow-x-hidden transition-colors duration-300">
            <CustomCursor />
            
            {/* Nano Banana Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-primary/10 blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/10 blur-[150px] animate-pulse-slow" style={{animationDelay: '2s'}} />
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-yellow-600/5 blur-[100px]" />
                
                {/* Noise Texture Overlay - Less intense in light mode */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <Header onOpenVault={() => setIsVaultOpen(true)} isDark={theme === 'dark'} toggleTheme={toggleTheme} />
            
            <main className="container mx-auto px-4 py-8 relative z-10">
                {!apiKeySelected && (
                    <div className="mb-8 animate-[fadeIn_0.5s_ease-out]">
                        <ApiKeySelector onKeySelected={() => setApiKeySelected(true)} />
                    </div>
                )}

                <div className="w-full max-w-7xl mx-auto">
                    <GenerationPanel
                        prompt={prompt}
                        setPrompt={setPrompt}
                        onGenerateImages={handleImageGeneration}
                        isLoadingImages={isLoadingImages}
                        imageVariants={imageVariants}
                        onSelectVariant={handleSelectVariant}
                        selectedVariant={selectedVariant}
                        onGenerateVideo={handleVideoGeneration}
                        videoState={videoState}
                        setUploadedImage={setUploadedImage}
                        uploadedImage={uploadedImage}
                        error={error}
                        onSaveProject={handleSaveProject}
                        onOpenFittingRoom={() => setIsFittingRoomOpen(true)}
                    />
                    
                    <DesignBattles />
                </div>
            </main>

            <ProjectVault 
                isOpen={isVaultOpen}
                onClose={() => setIsVaultOpen(false)}
                projects={savedProjects}
                onLoad={handleLoadProject}
                onDelete={handleDeleteProject}
            />

            <VirtualFittingRoom 
                isOpen={isFittingRoomOpen}
                onClose={() => setIsFittingRoomOpen(false)}
                selectedDesignBase64={selectedVariant?.base64 || null}
            />
        </div>
    );
}
