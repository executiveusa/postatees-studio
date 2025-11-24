
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import type { ChatMessage } from '../types';
import { refineDesign } from '../services/geminiService';

interface RefinementChatProps {
    selectedBase64: string;
    onRefined: (newBase64: string) => void;
}

export const RefinementChat: React.FC<RefinementChatProps> = ({ selectedBase64, onRefined }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            text: 'I\'m the Art Director for this drop. How should we tweak this design? (e.g. "Make the jersey red", "Add lightning bolts")',
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsProcessing(true);

        try {
            // Add a temporary loading message
            const loadingId = 'loading-' + Date.now();
            setMessages(prev => [...prev, { id: loadingId, role: 'assistant', text: 'Refining your design...', timestamp: Date.now() }]);

            const newImageBase64 = await refineDesign(selectedBase64, userMsg.text);
            
            onRefined(newImageBase64);
            
            setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
                id: 'success-' + Date.now(),
                role: 'assistant',
                text: 'Done. I\'ve updated the design. How does it look?',
                timestamp: Date.now()
            }));
        } catch (error) {
            setMessages(prev => prev.filter(m => !m.id.startsWith('loading')).concat({
                id: 'error-' + Date.now(),
                role: 'assistant',
                text: 'My bad, I couldn\'t make that edit. Try phrasing it differently.',
                timestamp: Date.now()
            }));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-brand-bg/30 border border-surface-border rounded-lg flex flex-col h-[400px] overflow-hidden backdrop-blur-md shadow-xl">
            <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">Director's Cut Mode</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[80%] rounded-2xl px-4 py-2 text-sm
                            ${msg.role === 'user' 
                                ? 'bg-brand-primary text-black font-bold rounded-tr-none' 
                                : 'bg-white/10 text-white border border-white/5 rounded-tl-none'}
                        `}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 rounded-2xl px-4 py-2 flex gap-1 items-center">
                            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-black/20 border-t border-white/10">
                <div className="relative flex items-center">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type changes (e.g. 'Change font to gothic')..."
                        className="w-full bg-black/50 border border-white/20 rounded-full py-2 pl-4 pr-10 text-sm text-white placeholder:text-white/30 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all"
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isProcessing}
                        className="absolute right-1 p-1.5 bg-brand-primary rounded-full text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icons.send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
