
import React from 'react';
import { Icons } from './Icons';
import { Tooltip } from './Tooltip';

interface LandingPageProps {
    onEnter: () => void;
    isDark: boolean;
    toggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, isDark, toggleTheme }) => {
    return (
        <div className="fixed inset-0 z-50 bg-brand-light-bg dark:bg-[#050505] flex items-center justify-center overflow-hidden transition-colors duration-500">
            
            {/* Theme Toggle (Absolute Top Right) */}
            <div className="absolute top-6 right-6 z-50">
                <Tooltip content={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                    <button 
                        onClick={toggleTheme}
                        className="p-3 rounded-full bg-white/10 dark:bg-black/30 backdrop-blur-md border border-black/10 dark:border-white/10 text-text-dark dark:text-white hover:scale-110 transition-transform shadow-lg"
                    >
                        {isDark ? <Icons.sun className="h-6 w-6" /> : <Icons.moon className="h-6 w-6" />}
                    </button>
                </Tooltip>
            </div>

            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                {/* Gradient: Dark Mode vs Light Mode */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-full transition-opacity duration-500 ${isDark ? 'opacity-60' : 'opacity-30'} bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-primary/20 via-transparent to-transparent`} />
                
                {/* Noise Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] brightness-200 mix-blend-overlay" />
                
                {/* Basketball Court Lines Effect */}
                <div className="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-t from-brand-primary/5 to-transparent" />
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] border-2 rounded-t-full transition-colors duration-500 ${isDark ? 'border-brand-primary/10' : 'border-black/5'}`} />
            </div>

            <div className="relative z-10 text-center px-6 max-w-4xl mx-auto space-y-8">
                
                <div className="space-y-2 pt-12">
                    <h1 className="font-display text-6xl md:text-9xl font-bold tracking-tighter leading-[0.9] uppercase transition-colors duration-500 text-text-dark dark:text-white">
                        Posta<span className="text-brand-primary">Tees</span><br/>Studio
                    </h1>
                    <p className="font-sans text-xl md:text-2xl max-w-2xl mx-auto font-light tracking-wide transition-colors duration-500 text-text-muted dark:text-gray-400">
                        The AI Atelier for <span className="font-medium text-text-dark dark:text-white">Next-Gen Streetwear</span>.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-6 pt-8">
                    <button 
                        onClick={onEnter}
                        className="group relative px-12 py-5 bg-brand-primary text-black font-display font-bold text-2xl tracking-wide uppercase rounded-none hover:bg-white transition-all duration-300 shadow-[0_0_40px_rgba(242,190,34,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                           Enter The Paint <Icons.arrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Slanted cut effect */}
                        <div className="absolute -inset-1 bg-white/20 skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                    
                    <p className="text-xs uppercase tracking-widest opacity-60 transition-colors duration-500 text-text-muted">
                        Designed for Creators
                    </p>
                </div>
            </div>

            {/* Footer Elements */}
            <div className="absolute bottom-8 left-8 text-xs font-mono hidden md:block transition-colors duration-500 text-text-muted/50 dark:text-white/20">
                LAT: 47.6061° N <br/> LON: 122.3328° W
            </div>
            <div className="absolute bottom-8 right-8 flex gap-4 transition-colors duration-500 text-text-muted/50 dark:text-white/20">
                 <Icons.basketball className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
        </div>
    );
};
