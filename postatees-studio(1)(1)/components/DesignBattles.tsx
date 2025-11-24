
import React from 'react';
import { Icons } from './Icons';

export const DesignBattles = () => {
    return (
        <div className="mt-12 border-t border-white/10 pt-8">
             <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-3xl text-white uppercase">Daily Battles</h2>
                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">LIVE</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface-glass border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-brand-primary">Theme: 90s Bulls</span>
                            <span className="text-[10px] text-text-muted">Top 1%</span>
                        </div>
                        <div className="aspect-square bg-black/50 relative group">
                            {/* Placeholder for battle entry */}
                             <div className="absolute inset-0 flex items-center justify-center text-white/20 font-display text-4xl">?</div>
                             <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="flex flex-col items-center text-green-400 hover:scale-110 transition-transform">
                                     <Icons.fire className="w-8 h-8" />
                                     <span className="text-xs font-bold">COP (245)</span>
                                 </button>
                                 <button className="flex flex-col items-center text-red-400 hover:scale-110 transition-transform">
                                     <Icons.close className="w-8 h-8" />
                                     <span className="text-xs font-bold">DROP (12)</span>
                                 </button>
                             </div>
                        </div>
                        <div className="p-3 flex gap-2 items-center">
                             <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                             <span className="text-xs text-white">User_{i}99</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
