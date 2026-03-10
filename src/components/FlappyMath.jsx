import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const INITIAL_PIPE_SPEED = 3.5; // Slightly slower base speed
const MAX_PIPE_SPEED = 7;
const SPEED_INCREMENT = 0.2;
const GRAVITY = 0.45; // Adjusted physics
const JUMP_FORCE = -8.5;

const BIRD_PHYSICS_SIZE = 20;
const BIRD_VISUAL_SIZE = 50;
const PIPE_WIDTH = 80;
const HOLE_HEIGHT = 160;

const generateEquation = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const isAddition = Math.random() > 0.5;
    const answer = isAddition ? num1 + num2 : Math.max(num1, num2) - Math.min(num1, num2);
    const text = isAddition ? `${num1} + ${num2}` : `${Math.max(num1, num2)} - ${Math.min(num1, num2)}`;
    return { text, answer };
};

const FlappyMath = ({ onBack }) => {
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState(0);
    const [birdPos, setBirdPos] = useState(GAME_HEIGHT / 2);
    const [pipePos, setPipePos] = useState(GAME_WIDTH);
    const [equation, setEquation] = useState(generateEquation());
    const [correctHole, setCorrectHole] = useState('top');
    const [currentSpeed, setCurrentSpeed] = useState(INITIAL_PIPE_SPEED);
    const [flash, setFlash] = useState(null);

    const birdVelocityRef = useRef(0);
    const pipePosRef = useRef(GAME_WIDTH);
    const birdPosRef = useRef(GAME_HEIGHT / 2);
    const gameLoopRef = useRef();
    const lastTimeRef = useRef(0);

    // Constant Hole Y Positions
    const topHoleY = 150;
    const bottomHoleY = 450;

    const triggerFlash = (color) => {
        setFlash(color);
        setTimeout(() => setFlash(null), 300);
    };

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setBirdPos(GAME_HEIGHT / 2);
        birdPosRef.current = GAME_HEIGHT / 2;
        setPipePos(GAME_WIDTH);
        pipePosRef.current = GAME_WIDTH;
        birdVelocityRef.current = 0;
        setCurrentSpeed(INITIAL_PIPE_SPEED);
        setEquation(generateEquation());
        setCorrectHole(Math.random() > 0.5 ? 'top' : 'bottom');
    };

    const jump = useCallback(() => {
        if (gameState === 'playing') {
            birdVelocityRef.current = JUMP_FORCE;
        } else if (gameState === 'start' || gameState === 'over') {
            startGame();
        }
    }, [gameState]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') jump();
            if (e.code === 'Escape') onBack();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jump, onBack]);

    // Optimized Ref-based Game Loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const loop = (time) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const delta = time - lastTimeRef.current;
            lastTimeRef.current = time;

            // Normalize delta (16.66ms = 1.0)
            const dt = Math.min(3, delta / 16.666);

            // 1. Bird Physics
            birdVelocityRef.current += GRAVITY * dt;
            birdPosRef.current += birdVelocityRef.current * dt;

            // 2. Pipe Physics
            pipePosRef.current -= currentSpeed * dt;

            // 3. Collision Detection
            const birdCenterX = 150 + BIRD_VISUAL_SIZE / 2;
            const birdCenterY = birdPosRef.current + BIRD_VISUAL_SIZE / 2;
            const birdRight = birdCenterX + BIRD_PHYSICS_SIZE / 2;
            const birdLeft = birdCenterX - BIRD_PHYSICS_SIZE / 2;
            const birdTop = birdCenterY - BIRD_PHYSICS_SIZE / 2;
            const birdBottom = birdCenterY + BIRD_PHYSICS_SIZE / 2;

            if (birdPosRef.current > GAME_HEIGHT - BIRD_PHYSICS_SIZE || birdPosRef.current < 0) {
                endGame();
            }

            const pX = pipePosRef.current;
            if (birdRight > pX && birdLeft < pX + PIPE_WIDTH) {
                const inTopHole = birdTop > topHoleY - HOLE_HEIGHT / 2 && birdBottom < topHoleY + HOLE_HEIGHT / 2;
                const inBottomHole = birdTop > bottomHoleY - HOLE_HEIGHT / 2 && birdBottom < bottomHoleY + HOLE_HEIGHT / 2;

                if (!inTopHole && !inBottomHole) {
                    endGame();
                } else if (birdCenterX > pX + PIPE_WIDTH / 2) {
                    const expectedTop = correctHole === 'top';
                    if (inTopHole !== expectedTop && birdLeft > pX + 20) {
                        endGame();
                    }
                }
            }

            // 4. Pipe Reset
            if (pipePosRef.current < -PIPE_WIDTH) {
                pipePosRef.current = GAME_WIDTH + 100;
                setScore(s => s + 1);
                setCurrentSpeed(s => Math.min(s + SPEED_INCREMENT, MAX_PIPE_SPEED));
                setEquation(generateEquation());
                setCorrectHole(Math.random() > 0.5 ? 'top' : 'bottom');
                triggerFlash('green');
            }

            // Sync state for rendering
            setBirdPos(birdPosRef.current);
            setPipePos(pipePosRef.current);

            gameLoopRef.current = requestAnimationFrame(loop);
        };

        const endGame = () => {
            setGameState('over');
            triggerFlash('red');
            cancelAnimationFrame(gameLoopRef.current);
        };

        lastTimeRef.current = performance.now();
        gameLoopRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [gameState, currentSpeed, correctHole]);

    return (
        <div
            onClick={jump}
            className="glass-panel animate-pop"
            style={{
                position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT,
                overflow: 'hidden', backgroundColor: '#e0f2f1', border: '6px solid #009688', margin: 'auto'
            }}
        >
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="interactive-btn" style={{ position: 'absolute', top: '15px', left: '15px', padding: '10px 20px', fontSize: '1rem', zIndex: 60, backgroundColor: '#555' }}>🔙 Menu</button>

            <div style={{ position: 'absolute', top: '15px', right: '15px', textAlign: 'right', zIndex: 10 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#00796b', textShadow: '2px 2px 0 #fff' }}>Score: {score}</div>
                <div style={{ fontSize: '1.2rem', color: '#004d40', fontWeight: 'bold' }}>Speed: {currentSpeed.toFixed(1)}</div>
            </div>

            {flash && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: flash === 'red' ? 'rgba(244,67,54,0.3)' : 'rgba(76,175,80,0.3)', pointerEvents: 'none', zIndex: 40 }} />
            )}

            {/* Bird */}
            <div style={{
                position: 'absolute', left: 150, top: birdPos, width: BIRD_VISUAL_SIZE, height: BIRD_VISUAL_SIZE,
                fontSize: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `rotate(${Math.min(birdVelocityRef.current * 3, 90)}deg)`, transition: 'transform 0.1s linear'
            }}>🐦</div>

            {/* Pipes */}
            <div style={{ position: 'absolute', left: pipePos, width: PIPE_WIDTH, height: '100%' }}>
                <div style={{ position: 'absolute', top: 0, width: '100%', height: topHoleY - HOLE_HEIGHT / 2, backgroundColor: '#00796b', borderRadius: '0 0 10px 10px', border: '3px solid #004d40' }} />
                <div style={{ position: 'absolute', top: topHoleY + HOLE_HEIGHT / 2, width: '100%', height: bottomHoleY - topHoleY - HOLE_HEIGHT, backgroundColor: '#00796b', border: '3px solid #004d40' }} />
                <div style={{ position: 'absolute', top: bottomHoleY + HOLE_HEIGHT / 2, width: '100%', height: GAME_HEIGHT - (bottomHoleY + HOLE_HEIGHT / 2), backgroundColor: '#00796b', borderRadius: '10px 10px 0 0', border: '3px solid #004d40' }} />

                {/* Labels */}
                <div style={{ position: 'absolute', top: topHoleY, left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '10px', borderRadius: '10px', border: '3px solid #004d40', fontSize: '1.5rem', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>
                    {correctHole === 'top' ? equation.answer : equation.answer + (Math.random() > 0.5 ? 2 : -1)}
                </div>
                <div style={{ position: 'absolute', top: bottomHoleY, left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '10px', borderRadius: '10px', border: '3px solid #004d40', fontSize: '1.5rem', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>
                    {correctHole === 'bottom' ? equation.answer : equation.answer + (Math.random() > 0.5 ? 1 : -2)}
                </div>
            </div>

            {/* Target Display */}
            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '10px 40px', borderRadius: '40px', border: '4px solid #ff5722', zIndex: 10, textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: 0, color: '#ff5722' }}>FLY THROUGH:</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{equation.text}</div>
            </div>

            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4rem', color: '#00796b', marginBottom: '1rem' }}>🐦 Flappy Math</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>Solve the math and fly through<br />the correct hole!</p>
                    <button className="interactive-btn" onClick={startGame} style={{ fontSize: '2rem', backgroundColor: '#00796b' }}>Start Flying</button>
                    <p style={{ marginTop: '20px', color: '#666' }}>Click or Press Space to Jump</p>
                </div>
            )}

            {gameState === 'over' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ color: '#ff5252' }}>OOPS!</h1>
                    <p style={{ fontSize: '2rem', margin: '1rem 0' }}>Score: {score}</p>
                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#00796b' }}>Try Again</button>
                </div>
            )}
        </div>
    );
};

export default FlappyMath;
