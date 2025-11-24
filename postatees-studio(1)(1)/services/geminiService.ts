
import { GoogleGenAI, Modality } from "@google/genai";
import type { AspectRatio } from '../types';

// POSTATEES BRAND GUARDRAILS
// Analyzed from: postatees.com & Reference Images
// Style: Grand Theft Auto Box Art x Vintage Bootleg Rap Tee x Comic Panels
const STYLE_PRIMER = `
MANDATORY ART DIRECTION [STRICT ENFORCEMENT]:
You are the Lead Illustrator for PostaTees. You are forbidden from generating generic portraits.
You MUST generate images in the "PostaTees Signature Collage" style.

STRICT LAYOUT RULES (THE "GTA" GRID):
1. COMPOSITION: The image MUST be a MULTI-PANEL COLLAGE or SPLIT-GRID layout.
   - Do NOT generate a single character standing in the middle.
   - DIVIDE the canvas into 3-5 geometric boxes/panels (like Grand Theft Auto box art).
   - Panel A: Close-up emotion/face.
   - Panel B: Full body action shot.
   - Panel C: Scenery or secondary angle.
   
2. VISUAL STYLE:
   - TYPE: Vector Illustration (Screen Print Ready).
   - OUTLINES: Thick, heavy black ink outlines.
   - SHADING: HALFTONE DOTS (Ben-Day dots) are MANDATORY for shadows.
   - COLOR: Flat, cel-shaded blocking. No soft airbrushing. High contrast.

3. CONTENT:
   - If the user requests a player/person, you must create this specific "Comic Book Cover" layout featuring them.
   - Backgrounds must be abstract cityscapes or team colors, but always inside the panels.

4. RESTRICTIONS:
   - NO Photorealism.
   - NO 3D Renders.
   - NO Single-subject portraits without the collage grid.
   - NO Soft gradients.

Your goal is to create a design that looks like a 1990s Bootleg Rap Tee that used stolen comic book art.
`;

export const enhancePrompt = async (input: string): Promise<string> => {
    if (!input) return "";
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are the Creative Director for PostaTees. Convert this user concept into a strict "GTA Box Art" layout prompt.
            
            User Concept: "${input}"
            
            Your Task: Rewrite this to ensure the output is a MULTI-PANEL COLLAGE.
            
            Structure the prompt like this:
            "A comic book style collage divided into panels. 
            Panel 1: Close up of [Subject]. 
            Panel 2: Action shot of [Subject]. 
            Panel 3: [Subject] in a different pose. 
            Style: Vector illustration, thick outlines, halftone shading, Grand Theft Auto loading screen style."
            
            Keep it under 50 words.
            `,
        });

        return response.text?.trim() || input;
    } catch (e) {
        console.error("Failed to enhance prompt", e);
        return input + " multi-panel collage, gta box art style, split grid layout, vector illustration, halftone shading"; 
    }
};

export const generateTeeDesigns = async (
    prompt: string,
    base64ImageData: string | null,
    mimeType: string | null
): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';
    
    const fullPrompt = `${STYLE_PRIMER}\n\nDESIGN REQUEST: ${prompt}\n\nREMEMBER: SPLIT THE IMAGE INTO PANELS/BOXES. DO NOT MAKE A SINGLE PORTRAIT.`;

    const parts: any[] = [{ text: fullPrompt }];

    if (base64ImageData && mimeType) {
        parts.unshift({
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        });
    }

    // Use Promise.allSettled to robustly handle parallel requests and safety filters
    const promises = Array(4).fill(0).map(() => 
        ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        })
    );

    const results = await Promise.allSettled(promises);
    const images: string[] = [];
    const errors: string[] = [];

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            const response = result.value;
            if (response.candidates && response.candidates[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        images.push(part.inlineData.data);
                    }
                }
            } else {
                // Handle cases where response exists but no content (likely blocked)
                const candidate = response.candidates?.[0];
                if (candidate?.finishReason) {
                    errors.push(`Blocked: ${candidate.finishReason}`);
                }
            }
        } else {
            // Request failed completely
            const reason = result.reason;
            const msg = reason instanceof Error ? reason.message : String(reason);
            errors.push(msg);
        }
    });

    if (images.length === 0) {
        const errorMsg = errors.join(' | ');
        console.warn("Generation errors:", errors);

        if (errorMsg.toLowerCase().includes('safety') || errorMsg.toLowerCase().includes('blocked')) {
            throw new Error("Safety filters triggered. The prompt might be too explicit or sensitive. Try simplifying the request or removing controversial terms.");
        } else if (errors.length > 0) {
            // Return the first meaningful error
            throw new Error(`Design generation failed: ${errors[0]}`);
        } else {
            throw new Error("The design engine returned no images. Try a simpler prompt.");
        }
    }

    return images;
};

export const refineDesign = async (
    base64Image: string,
    instruction: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';

    const fullInstruction = `
    EDIT INSTRUCTION: ${instruction}
    
    CRITICAL: You must PRESERVE the existing visual style exactly. 
    - Keep the "GTA Box Art" collage layout.
    - Keep the vector illustration style.
    - Keep the thick outlines and halftone shading.
    - Only change what was asked in the instruction.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: 'image/png',
                    },
                },
                {
                    text: fullInstruction,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const partsResponse = response.candidates?.[0]?.content?.parts;
    if (partsResponse) {
        for (const part of partsResponse) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
    }
    throw new Error("Refinement failed. Try a different instruction.");
};

export const generateTryOn = async (
    userImageBase64: string,
    designImageBase64: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';
    
    const parts = [
        {
            inlineData: {
                data: userImageBase64,
                mimeType: 'image/jpeg',
            },
        },
        {
            inlineData: {
                data: designImageBase64,
                mimeType: 'image/png',
            },
        },
        {
            text: "The first image is a person. The second image is a t-shirt design. Realistic composite: Put the design on the person's shirt. Follow the fabric folds and lighting exactly. Photorealistic output. Do not change the person's face.",
        },
    ];

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const partsResponse = response.candidates?.[0]?.content?.parts;
    if (partsResponse) {
        for (const part of partsResponse) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
    }
    throw new Error("Try-On generation failed.");
};

export const generateVideoFromImage = async (
    base64ImageData: string,
    prompt: string,
    aspectRatio: AspectRatio,
    onProgress: (progress: number) => void,
    onSuccess: (url: string) => void,
    onError: (error: Error) => void
): Promise<void> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `Cinematic motion: ${prompt}. Maintain the vector illustration style.`,
            image: {
                imageBytes: base64ImageData,
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio,
            }
        });

        const totalSteps = 10;
        let currentStep = 0;

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            currentStep++;
            onProgress(Math.min(95, (currentStep / totalSteps) * 100));
        }
        
        onProgress(100);

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            const videoUrl = URL.createObjectURL(blob);
            onSuccess(videoUrl);
        } else {
            throw new Error("Video generation completed but no download link was provided.");
        }
    } catch (e) {
        onError(e as Error);
    }
};

export const extractStyleFromImage = async (base64Image: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
                { text: "Analyze this t-shirt design. Extract the key visual style elements (e.g. 'halftone shading', 'heavy outlines', 'vintage wash', 'gothic font'). Return a comma-separated list of these style keywords. Do not describe the subject, only the artistic style." }
            ]
        }
    });
    return response.text?.trim() || "vintage, bootleg style";
};

export const generateTypography = async (text: string, style: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: `Generate a typography graphic. Text: "${text}". Style: ${style}. Isolated on a solid black background. High contrast vector style. White text.` }]
        },
        config: {
            responseModalities: [Modality.IMAGE]
        }
    });
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0].inlineData) {
        return parts[0].inlineData.data;
    }
    throw new Error("Failed to generate typography");
};
