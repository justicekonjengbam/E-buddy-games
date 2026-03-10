import React, { useState, useEffect } from 'react';

const WORDS = ['cat', 'dog', 'sun', 'pig', 'hat', 'red', 'blue', 'run', 'hop', 'jump', 'play', 'fun', 'happy'];

const TypeSprint = ({ onBack }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [currentWord, setCurrentWord] = useState(WORDS[Math.floor(Math.random() * WORDS.length)]);
    const [typedLetters, setTypedLetters] = useState('');
    const [positionY, setPositionY] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, over
    const [feedback, setFeedback] = useState(null); // 'correct' or 'missed'

    // Game timer
    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timerId = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timerId);
        } else if (timeLeft === 0) {
            setGameState('over');
        }
    }, [timeLeft, gameState]);

    // Word falling animation loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const fallSpeed = window.innerHeight > 800 ? 0.3 : 0.5; // adjust for screen size
        const fallInterval = setInterval(() => {
            setPositionY(prev => {
                if (prev > 80) { // Bottom reached
                    setFeedback('missed');
                    setTimeout(() => setFeedback(null), 300);
                    nextWord();
                    return 0;
                }
                return prev + fallSpeed;
            });
        }, 50);

        return () => clearInterval(fallInterval);
    }, [gameState]);

    // Keyboard input handler
    useEffect(() => {
        if (gameState !== 'playing') return;

        const handleKeyDown = (e) => {
            // Ignore meta keys to allow shortcuts
            if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;

            const key = e.key.toLowerCase();
            // Only process alphabet keys
            if (!/^[a-z]$/.test(key)) return;

            const expectedLetter = currentWord[typedLetters.length];

            if (key === expectedLetter) {
                const newTyped = typedLetters + key;
                setTypedLetters(newTyped);

                // Check if word complete
                if (newTyped === currentWord) {
                    setScore(s => s + currentWord.length * 10);
                    setFeedback('correct');
                    setTimeout(() => setFeedback(null), 300);
                    nextWord();
                }
            } else {
                // Wrong letter - add little shake feedback (optional)
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, currentWord, typedLetters]);

    const nextWord = () => {
        setCurrentWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
        setTypedLetters('');
        setPositionY(0);
    };

    if (gameState === 'over') {
        return (
            <div className="glass-panel animate-pop" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px' }}>
                <h2 style={{ fontSize: '3rem', color: 'var(--color-primary)' }}>⏰ Time's Up!</h2>
                <p style={{ fontSize: '2rem', margin: '2rem 0' }}>
                    You typed so well and earned <strong style={{ color: 'var(--color-accent)', fontSize: '3rem' }}>{score}</strong> stars! ⭐
                </p>
                <button className="interactive-btn" onClick={onBack} style={{ backgroundColor: 'var(--color-secondary)' }}>
                    🔙 Back to Menu
                </button>
            </div>
        );
    }

    return (
        <div
            className="glass-panel animate-pop"
            style={{
                padding: '2rem',
                width: '90vw',
                height: '80vh',
                maxWidth: '1000px',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <button
                onClick={onBack}
                style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', zIndex: 10 }}
            >
                🔙
            </button>

            <div style={{ position: 'absolute', top: '20px', right: '40px', display: 'flex', gap: '2rem', zIndex: 10 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                    ⭐ {score}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: timeLeft <= 10 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    ⏱️ {timeLeft}s
                </div>
            </div>

            <h2 style={{ position: 'absolute', top: '20px', width: '100%', textAlign: 'center', fontSize: '2rem', color: 'var(--color-secondary)', zIndex: 5, pointerEvents: 'none' }}>
                ⌨️ Type the word!
            </h2>

            {/* Play Area */}
            <div style={{ position: 'relative', width: '100%', height: '100%', marginTop: '60px' }}>

                <div
                    style={{
                        position: 'absolute',
                        top: `${positionY}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '6rem',
                        fontWeight: '900',
                        display: 'flex',
                        gap: '4px',
                        fontFamily: 'monospace',
                        filter: feedback === 'correct' ? 'drop-shadow(0 0 20px var(--color-success))' : 'none',
                        transition: 'filter 0.3s, transform 0.1s' // smooth transition
                    }}
                >
                    {currentWord.split('').map((char, index) => {
                        const isTyped = index < typedLetters.length;
                        return (
                            <span
                                key={index}
                                style={{
                                    color: isTyped ? 'var(--color-success)' : 'var(--color-text)',
                                    transform: isTyped ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'color 0.1s, transform 0.1s'
                                }}
                            >
                                {char}
                            </span>
                        );
                    })}
                </div>

                {/* Type instruction indicator for primary kids */}
                <div style={{ position: 'absolute', bottom: '40px', width: '100%', textAlign: 'center', fontSize: '1.5rem', opacity: 0.5 }}>
                    Just press the keys on your keyboard!
                </div>
            </div>
        </div>
    );
};

export default TypeSprint;
