import React, { useState, useEffect } from 'react';

const ResponsiveWrapper = ({ children, targetWidth = 800, targetHeight = 600 }) => {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const scaleX = window.innerWidth / targetWidth;
            const scaleY = window.innerHeight / targetHeight;

            // To fit the screen perfectly, take the smaller of the two scales (letterboxing)
            // But we allow slight upscaling on very large screens (up to 1.5x)
            let newScale = Math.min(scaleX, scaleY);
            // If the screen is smaller than 800x600, it scales down.
            // Let's cap maximum upscale slightly so it doesn't get ridiculously huge on 4k monitors
            newScale = Math.min(newScale, 1.5);

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
            height: '100vh',
            backgroundColor: '#121212', // Letterbox color
            overflow: 'hidden',
            touchAction: 'none' // Prevent pull-to-refresh and zooming on mobile
        }}>
            <div style={{
                width: targetWidth,
                height: targetHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                position: 'relative',
                boxShadow: '0 0 50px rgba(0,0,0,0.5)' // Give the "screen" some depth
            }}>
                {children}
            </div>
        </div>
    );
};

export default ResponsiveWrapper;
