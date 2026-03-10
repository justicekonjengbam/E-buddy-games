import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRAVITY = 0.4; // Softer gravity
const JUMP_STRENGTH = -8; // Softer jump
const INITIAL_PIPE_SPEED = 3;
const MAX_PIPE_SPEED = 6;
const SPEED_INCREMENT = 0.1;
const PIPE_WIDTH = 100; // Wider pipes
const HOLE_HEIGHT = 280; // MASSIVE gaps for primary schoolers
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Bird visually is 50, but logically physics collision is 30 (very forgiving!)
const BIRD_VISUAL_SIZE = 60;
const BIRD_PHYSICS_SIZE = 30;

const generateEquation = () => {
    const isAddition = Math.random() > 0.5;
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;

    if (isAddition) {
        const offset = (Math.random() > 0.5 ? 1 : 2) * (Math.random() > 0.5 ? 1 : -1);
        return { text: `${num1} + ${num2}`, answer: num1 + num2, falseAnswer: num1 + num2 + offset };
    } else {
        const max = Math.max(num1, num2);
        const min = Math.min(num1, num2);
        const ans = max - min;
        let falseAns = ans + (Math.random() > 0.5 ? 1 : 2) * (Math.random() > 0.5 ? 1 : -1);
        if (falseAns < 0) falseAns = ans + 2;
        if (falseAns === ans) falseAns += 1; // absolute fallback
        return { text: `${max} - ${min}`, answer: ans, falseAnswer: falseAns };
    }
};

const FlappyMath = ({ onBack }) => {
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState(0);
    const [birdPos, setBirdPos] = useState(GAME_HEIGHT / 2);
    const [pipePos, setPipePos] = useState(GAME_WIDTH);
    const [equation, setEquation] = useState(generateEquation());
    const [correctHole, setCorrectHole] = useState(Math.random() > 0.5 ? 'top' : 'bottom');
    const [currentSpeed, setCurrentSpeed] = useState(INITIAL_PIPE_SPEED);
    const [flash, setFlash] = useState(null); // 'green', 'red'

    const birdVelocityRef = useRef(0);
    const gameLoopRef = useRef();

    // Holes centers
    const topHoleY = GAME_HEIGHT * 0.3;
    const bottomHoleY = GAME_HEIGHT * 0.75; // pushed further down

    const triggerFlash = (color) => {
        setFlash(color);
        setTimeout(() => setFlash(null), 300);
    };

    const handleJump = useCallback((e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            if (gameState === 'playing') {
                birdVelocityRef.current = JUMP_STRENGTH;
            } else if (gameState === 'start' || gameState === 'over') {
                startGame();
            }
        } else if (e.code === 'Escape') {
            onBack();
        }
    }, [gameState, onBack]);

    // Click/Touch to Jump
    const handleTap = useCallback((e) => {
        // Don't jump if they clicked a button
        if (e.target.tagName.toLowerCase() === 'button') return;

        if (gameState === 'playing') {
            birdVelocityRef.current = JUMP_STRENGTH;
        } else if (gameState === 'start' || gameState === 'over') {
            startGame();
        }
    }, [gameState]);

    useEffect(() => {
        window.addEventListener('keydown', handleJump);
        window.addEventListener('mousedown', handleTap);
        window.addEventListener('touchstart', handleTap, { passive: false });
        return () => {
            window.removeEventListener('keydown', handleJump);
            window.removeEventListener('mousedown', handleTap);
            window.removeEventListener('touchstart', handleTap);
        };
    }, [handleJump, handleTap]);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setBirdPos(GAME_HEIGHT / 2);
        birdVelocityRef.current = -5; // Initial tiny hop
        setPipePos(GAME_WIDTH);
        setCurrentSpeed(INITIAL_PIPE_SPEED);
        setEquation(generateEquation());
        setCorrectHole(Math.random() > 0.5 ? 'top' : 'bottom');
    };

    const birdPosRef = useRef(GAME_HEIGHT / 2);
    const lastTimeRef = useRef(performance.now());

    const updateGame = useCallback((dt) => {
        if (gameState !== 'playing') return;

        // 1. Physics (scaled by dt)
        birdVelocityRef.current += GRAVITY * dt;
        const currentVelocity = birdVelocityRef.current;

        setBirdPos((pos) => {
            const newPos = pos + currentVelocity * dt;
            birdPosRef.current = newPos; // Keep ref in sync for collision

            // Floor/ceiling collision (using physics size)
            if (newPos > GAME_HEIGHT - BIRD_PHYSICS_SIZE || newPos < 0) {
                setGameState('over');
                triggerFlash('red');
                return pos;
            }
            return newPos;
        });

        // 2. Pipes & Collision
        setPipePos((pos) => {
            const newPos = pos - currentSpeed * dt;
            const currentBirdPos = birdPosRef.current;

            // Collision Logic
            // Bird X is fixed at 150. Center it for physics check.
            const birdCenterX = 150 + BIRD_VISUAL_SIZE / 2;
            const birdCenterY = currentBirdPos + BIRD_VISUAL_SIZE / 2;

            const birdRight = birdCenterX + BIRD_PHYSICS_SIZE / 2;
            const birdLeft = birdCenterX - BIRD_PHYSICS_SIZE / 2;
            const birdTop = birdCenterY - BIRD_PHYSICS_SIZE / 2;
            const birdBottom = birdCenterY + BIRD_PHYSICS_SIZE / 2;

            const pipeLeft = newPos;
            const pipeRight = newPos + PIPE_WIDTH;

            if (birdRight > pipeLeft && birdLeft < pipeRight) {

                // Check Safe Zones (Holes)
                const inTopHole = birdTop > topHoleY - HOLE_HEIGHT / 2 && birdBottom < topHoleY + HOLE_HEIGHT / 2;
                const inBottomHole = birdTop > bottomHoleY - HOLE_HEIGHT / 2 && birdBottom < bottomHoleY + HOLE_HEIGHT / 2;

                if (!inTopHole && !inBottomHole) {
                    setGameState('over');
                    triggerFlash('red');
                } else if (birdCenterX > pipeLeft + PIPE_WIDTH / 2) {
                    const isTopHole = inTopHole;
                    const expectedTop = correctHole === 'top';

                    if (isTopHole !== expectedTop && birdLeft > pipeLeft + 20) {
                        setGameState('over');
                        triggerFlash('red');
                    }
                }
            }

            // Pipe passed screen
            if (newPos < -PIPE_WIDTH) {
                setScore(s => s + 1);
                setCurrentSpeed(s => Math.min(s + SPEED_INCREMENT, MAX_PIPE_SPEED));
                setEquation(generateEquation());
                setCorrectHole(Math.random() > 0.5 ? 'top' : 'bottom');
                triggerFlash('green');
                return GAME_WIDTH + 100;
            }

            return newPos;
        });

    }, [gameState, correctHole, topHoleY, bottomHoleY, currentSpeed]);

    useEffect(() => {
        if (gameState === 'playing') {
            lastTimeRef.current = performance.now();
            const loop = (time) => {
                const dt = Math.min(3, (time - lastTimeRef.current) / 16.666);
                lastTimeRef.current = time;
                updateGame(dt);
                gameLoopRef.current = requestAnimationFrame(loop);
            };
            gameLoopRef.current = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [gameState, updateGame]);


    return (
        <div className="glass-panel" style={{ position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT, overflow: 'hidden', backgroundColor: '#4fc3f7', border: '4px solid white', margin: 'auto', userSelect: 'none' }}>

            {/* Flash Overlay */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none',
                backgroundColor: flash === 'red' ? 'rgba(244, 67, 54, 0.4)' : flash === 'green' ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
                transition: 'background-color 0.2s'
            }} />

            {/* Clouds (Static CSS decor) */}
            <div style={{ position: 'absolute', top: 50, left: 100, fontSize: '5rem', opacity: 0.5 }}>☁️</div>
            <div style={{ position: 'absolute', top: 150, right: 150, fontSize: '6rem', opacity: 0.3 }}>☁️</div>
            <div style={{ position: 'absolute', bottom: 100, left: 300, fontSize: '4rem', opacity: 0.4 }}>☁️</div>

            {/* UI Overlay */}
            <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 30, pointerEvents: 'none' }}>
                {/* The Equation Bubble */}
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '5px 30px', borderRadius: '30px',
                    border: '4px solid #0288d1', boxShadow: '0 6px 12px rgba(0,0,0,0.2)', marginBottom: '5px'
                }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#01579b', margin: 0, lineHeight: 1 }}>
                        {equation.text} = <span style={{ color: '#d32f2f' }}>?</span>
                    </div>
                </div>

                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', textShadow: '2px 2px 0px #01579b', backgroundColor: '#0288d1', padding: '5px 20px', borderRadius: '20px', border: '2px solid white' }}>
                    ⭐ SCORE: {score}
                </div>
            </div>

            {/* Back Button */}
            <button onClick={onBack} style={{ position: 'absolute', top: '15px', left: '15px', background: 'var(--color-glass-bg)', border: '2px solid white', borderRadius: '15px', padding: '10px 20px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 60, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                🔙 Menu (Esc)
            </button>

            {/* Bird */}
            <div style={{
                position: 'absolute', left: 150, top: birdPos, width: BIRD_VISUAL_SIZE, height: BIRD_VISUAL_SIZE,
                backgroundColor: '#ffeb3b', border: '3px solid #f57f17', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)', zIndex: 15,
                transform: `rotate(${Math.max(Math.min(birdVelocityRef.current * 4, 90), -90)}deg)`,
                transition: 'transform 0.1s'
            }}>
                <div style={{ transform: 'scaleX(-1)' }}>🐦</div>
                {/* Bird Wing (pure CSS fun) */}
                <div style={{
                    position: 'absolute', right: '0px', top: '20px', width: '30px', height: '15px',
                    backgroundColor: '#fbc02d', borderRadius: '50%', border: '2px solid #f57f17',
                    transformOrigin: 'left center',
                    animation: gameState === 'playing' ? 'flap 0.2s infinite alternate' : 'none'
                }} />
            </div>

            <style>{`
            @keyframes flap { 0% { transform: rotate(0deg); } 100% { transform: rotate(-40deg); } }
            .pipe-grad { background: linear-gradient(90deg, #66bb6a 0%, #4caf50 50%, #388e3c 100%); border: 4px solid #1b5e20; }
            .pipe-cap { background: linear-gradient(90deg, #81c784 0%, #4caf50 50%, #2e7d32 100%); border: 4px solid #1b5e20; height: 30px; width: ${PIPE_WIDTH + 10}px; left: -5px; position: absolute; }
        `}</style>


            {/* Pipes Complex */}
            {/* TOP PIPE BLOCK */}
            <div className="pipe-grad" style={{ position: 'absolute', left: pipePos, top: 0, width: PIPE_WIDTH, height: topHoleY - HOLE_HEIGHT / 2, zIndex: 10 }}>
                <div className="pipe-cap" style={{ bottom: -4, borderRadius: '5px' }} />
            </div>

            {/* MIDDLE PIPE BLOCK */}
            <div className="pipe-grad" style={{ position: 'absolute', left: pipePos, top: topHoleY + HOLE_HEIGHT / 2, width: PIPE_WIDTH, height: (bottomHoleY - HOLE_HEIGHT / 2) - (topHoleY + HOLE_HEIGHT / 2), zIndex: 10 }}>
                <div className="pipe-cap" style={{ top: -4, borderRadius: '5px' }} />
                <div className="pipe-cap" style={{ bottom: -4, borderRadius: '5px' }} />
            </div>

            {/* BOTTOM PIPE BLOCK */}
            <div className="pipe-grad" style={{ position: 'absolute', left: pipePos, top: bottomHoleY + HOLE_HEIGHT / 2, width: PIPE_WIDTH, height: GAME_HEIGHT - (bottomHoleY + HOLE_HEIGHT / 2), zIndex: 10 }}>
                <div className="pipe-cap" style={{ top: -4, borderRadius: '5px' }} />
            </div>

            {/* Bubble Answers in the Holes */}
            <div style={{
                position: 'absolute', left: pipePos + PIPE_WIDTH / 2, top: topHoleY, transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '50%', width: '100px', height: '100px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(255,255,255,0.2)',
                fontSize: '4rem', fontWeight: '900', color: 'white', textShadow: '2px 2px 0 #000', zIndex: 12
            }}>
                {correctHole === 'top' ? equation.answer : equation.falseAnswer}
            </div>
            <div style={{
                position: 'absolute', left: pipePos + PIPE_WIDTH / 2, top: bottomHoleY, transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '50%', width: '100px', height: '100px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(255,255,255,0.2)',
                fontSize: '4rem', fontWeight: '900', color: 'white', textShadow: '2px 2px 0 #000', zIndex: 12
            }}>
                {correctHole === 'bottom' ? equation.answer : equation.falseAnswer}
            </div>


            {/* Start Overlay */}
            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4.5rem', color: '#0288d1', textShadow: '3px 3px 0px #b3e5fc', margin: 0 }}>🐦 Flappy Math!</h1>

                    <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#e1f5fe', border: '4px solid #29b6f6', width: '500px' }}>
                            <h2 style={{ color: '#01579b', fontSize: '2rem', marginBottom: '10px' }}>How to Play:</h2>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>1. Solve the equation at the top.</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '10px' }}>2. Fly through the hole with the <span style={{ color: '#388e3c' }}>CORRECT ANSWER!</span></p>
                        </div>

                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', backgroundColor: '#fff9c4', padding: '10px 20px', borderRadius: '20px', border: '2px solid #fbc02d', color: '#f57f17' }}>
                            ⌨️ Press <strong style={{ color: '#333' }}>SPACE</strong> or <span>CLICK</span> to Fly!
                        </p>
                    </div>

                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#03a9f4', fontSize: '2rem', padding: '20px 60px', boxShadow: '0 8px 0 #0277bd' }}>PLAY NOW!</button>
                </div>
            )}

            {/* Game Over Overlay */}
            {gameState === 'over' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ color: '#ef5350', fontSize: '5rem', textShadow: '0 0 20px rgba(239,83,80,0.5)' }}>💥 CRASH!</h1>
                    <p style={{ fontSize: '2.5rem', margin: '1rem 0', fontWeight: 'bold' }}>You scored: <span style={{ color: '#ffca28' }}>{score}</span> ⭐</p>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '2rem' }}>
                        <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#29b6f6', fontSize: '1.5rem', boxShadow: '0 6px 0 #0277bd' }}>Try Again!</button>
                        <button className="interactive-btn" onClick={onBack} style={{ backgroundColor: '#e53935', fontSize: '1.5rem', boxShadow: '0 6px 0 #c62828' }}>Change Game</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlappyMath;
