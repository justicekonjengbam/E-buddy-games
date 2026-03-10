import React, { useState, useEffect } from 'react';

const ResponsiveWrapper = ({ children, targetWidth = 800, targetHeight = 600 }) => {
    const [scale, setScale] = useState(1);
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const portrait = vh > vw;
            setIsPortrait(portrait);

            let newScale;
            if (portrait) {
                // If portrait, we rotate 90deg, so the "width" of the game (800) fits the "height" of the screen (vh)
                // and the "height" of the game (600) fits the "width" of the screen (vw)
                const scaleX = vh / targetWidth;
                const scaleY = vw / targetHeight;
                newScale = Math.min(scaleX, scaleY);
            } else {
                const scaleX = vw / targetWidth;
                const scaleY = vh / targetHeight;
                newScale = Math.min(scaleX, scaleY);
            }

            setScale(newScale);
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call

        return () => window.removeEventListener('resize', handleResize);
    }, [targetWidth, targetHeight]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100dvw',
            height: '100dvh',
            backgroundColor: '#121212',
            overflow: 'hidden',
            touchAction: 'none'
        }}>
            <div style={{
                width: targetWidth,
                height: targetHeight,
                transform: `translate(-50%, -50%) scale(${scale}) ${isPortrait ? 'rotate(90deg)' : ''}`,
                transformOrigin: 'center center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                transition: 'transform 0.3s ease-out'
            }}>
                {children}
            </div>
        </div>
    );
};

export default ResponsiveWrapper;
