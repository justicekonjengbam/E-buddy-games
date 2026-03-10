import React, { useState, useEffect } from 'react';

const ResponsiveWrapper = ({ children, targetWidth = 800, targetHeight = 600 }) => {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Simple scaling logic: fit the game into the available viewport
            const scaleX = vw / targetWidth;
            const scaleY = vh / targetHeight;
            const newScale = Math.min(scaleX, scaleY);

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
            width: '100vw',
            height: '100dvh', // Use dvh for mobile address bar stability
            backgroundColor: '#121212',
            overflow: 'hidden',
            touchAction: 'none'
        }}>
            <div style={{
                width: targetWidth,
                height: targetHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                position: 'relative',
                boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                transition: 'transform 0.1s ease-out', // Snappier transition
                flexShrink: 0
            }}>
                {children}
            </div>
        </div>
    );
};

export default ResponsiveWrapper;
