
// Simple Web Audio API Synthesizer for UI Sounds
// Eliminates the need for external audio assets

const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
// Initialize lazily to handle autoplay policies
let ctx: AudioContext | null = null;

const getContext = () => {
    if (!ctx) {
        ctx = new AudioContextClass();
    }
    return ctx;
};

const createOscillator = (type: OscillatorType, freq: number, duration: number, volume: number = 0.1) => {
    const context = getContext();
    if (!context) return;

    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, context.currentTime);
    
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + duration);
};

export const playSound = (type: 'click' | 'hover' | 'success' | 'error' | 'glitch') => {
    const context = getContext();
    if (!context) return;

    if (context.state === 'suspended') {
        context.resume().catch(() => {});
    }

    switch (type) {
        case 'click':
            createOscillator('square', 400, 0.05, 0.05);
            break;
        case 'hover':
            createOscillator('sine', 100, 0.1, 0.02);
            break;
        case 'success':
            // Play a major chord
            setTimeout(() => createOscillator('triangle', 440, 0.5, 0.1), 0); // A4
            setTimeout(() => createOscillator('triangle', 554.37, 0.5, 0.1), 100); // C#5
            setTimeout(() => createOscillator('triangle', 659.25, 0.8, 0.1), 200); // E5
            break;
        case 'error':
            createOscillator('sawtooth', 150, 0.3, 0.2);
            setTimeout(() => createOscillator('sawtooth', 100, 0.3, 0.2), 100);
            break;
        case 'glitch':
             // Random noise burst simulation
             const bufferSize = context.sampleRate * 0.1; // 0.1 seconds
             const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
             const data = buffer.getChannelData(0);
             for (let i = 0; i < bufferSize; i++) {
                 data[i] = Math.random() * 2 - 1;
             }
             const noise = context.createBufferSource();
             noise.buffer = buffer;
             const gain = context.createGain();
             gain.gain.value = 0.1;
             noise.connect(gain);
             gain.connect(context.destination);
             noise.start();
             break;
    }
};
