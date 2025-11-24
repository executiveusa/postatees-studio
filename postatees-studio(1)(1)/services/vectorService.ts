
export const convertToSVG = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!(window as any).ImageTracer) {
            reject(new Error("Vectorization library (ImageTracer) not loaded."));
            return;
        }

        // Configured for "PostaTees" style: High detail, limited palette for screen printing
        const options = {
            ltr: 0.1,
            qtr: 0.1,
            pathomit: 8,
            colorsampling: 2, // Deterministic
            numberofcolors: 16,
            mincolorratio: 0.02,
            colorquantcycles: 3,
            scale: 1,
            simplifytolerance: 0,
            roundcoords: 1, 
            lcpr: 0,
            qcpr: 0,
            desc: false,
            viewbox: true,
            blurradius: 0,
            blurdelta: 10
        };

        try {
            (window as any).ImageTracer.imageToSVG(
                `data:image/png;base64,${base64Image}`,
                (svgstr: string) => {
                    resolve(svgstr);
                },
                options
            );
        } catch (e) {
            reject(e);
        }
    });
};
