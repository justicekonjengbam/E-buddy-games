import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const GRAVITY = 0.2;
const SLICE_TIME_LIMIT = 300;

// Grammar Dictionary
const DICTIONARY = [
    { word: 'DOG', type: 'NOUN' }, { word: 'CAT', type: 'NOUN' }, { word: 'CAR', type: 'NOUN' }, { word: 'TREE', type: 'NOUN' }, { word: 'SUN', type: 'NOUN' },
    { word: 'RUN', type: 'VERB' }, { word: 'JUMP', type: 'VERB' }, { word: 'FLY', type: 'VERB' }, { word: 'EAT', type: 'VERB' }, { word: 'SING', type: 'VERB' },
    { word: 'BLUE', type: 'ADJECTIVE' }, { word: 'FAST', type: 'ADJECTIVE' }, { word: 'HAPPY', type: 'ADJECTIVE' }, { word: 'BIG', type: 'ADJECTIVE' }, { word: 'LOUD', type: 'ADJECTIVE' }
];

const TARGET_TYPES = ['NOUN', 'VERB', 'ADJECTIVE'];

const generateRandomWord = (activeTargetType) => {
    // 40% chance to be the correct part of speech, otherwise random decoy
    const isTarget = Math.random() < 0.4;
    let selectedWord;

    if (isTarget) {
        const validWords = DICTIONARY.filter(w => w.type === activeTargetType);
        selectedWord = validWords[Math.floor(Math.random() * validWords.length)];
    } else {
        const decoys = DICTIONARY.filter(w => w.type !== activeTargetType);
        selectedWord = decoys[Math.floor(Math.random() * decoys.length)];
    }

    const xPositions = [100, 300, 500, 700];
    const startX = xPositions[Math.floor(Math.random() * xPositions.length)];
    const vx = (GAME_WIDTH / 2 - startX) * 0.01 + (Math.random() - 0.5) * 2;
    const vy = -12 - Math.random() * 4;

    return {
        id: Math.random(),
        text: selectedWord.word,
        wordType: selectedWord.type,
        isTarget: isTarget,
        x: startX,
        y: GAME_HEIGHT + 50,
        vx: vx,
        vy: vy,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 5,
        sliced: false,
        active: true
    };
};

const WordNinja = ({ onBack }) => {
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [targetType, setTargetType] = useState(TARGET_TYPES[0]);
    const [fruits, setFruits] = useState([]);
    const [particles, setParticles] = useState([]);

    // Mouse/Touch trailing
    const [isSlashing, setIsSlashing] = useState(false);
    const [slashTrail, setSlashTrail] = useState([]);

    const gameLoopRef = useRef();
    const spawnTimerRef = useRef(100);
    const canvasRef = useRef(null);

    const lineIntersectsRect = (x1, y1, x2, y2, rx, ry, rw, rh) => {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) return false;
        return true; // Forgiving bounding-box slash
    };

    const spawnParticles = (x, y, color) => {
        const newParticles = Array.from({ length: 15 }).map(() => ({
            id: Math.random(), x, y,
            vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 5,
            life: 1, color
        }));
        setParticles(prev => [...prev, ...newParticles]);
    };

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setLives(3);
        setFruits([]);
        setParticles([]);
        pickNewTarget();
    };

    const pickNewTarget = () => {
        setTargetType(TARGET_TYPES[Math.floor(Math.random() * TARGET_TYPES.length)]);
    };



    const lastTimeRef = useRef(performance.now());

    const updatePhysics = useCallback((dt) => {
        if (gameState !== 'playing') return;

        setFruits(prev => {
            let nextFruits = prev.map(f => {
                if (!f.active) return f;
                if (f.sliced) return { ...f, y: f.y + 10 * dt, rotation: f.rotation + f.rotSpeed * 2 * dt };

                const newVy = f.vy + GRAVITY * dt;
                return { ...f, x: f.x + f.vx * dt, y: f.y + newVy * dt, vy: newVy, rotation: f.rotation + f.rotSpeed * dt };
            });

            // Penalty for letting a correct grammar word drop
            nextFruits.forEach(f => {
                if (f.active && !f.sliced && f.y > GAME_HEIGHT + 100 && f.vy > 0) {
                    f.active = false;
                    if (f.isTarget) {
                        setLives(l => { const nl = l - 1; if (nl <= 0) setGameState('over'); return nl; });
                    }
                }
            });

            return nextFruits.filter(f => f.active && f.y < GAME_HEIGHT + 200);
        });

        setParticles(prev => prev.map(p => ({
            ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 0.5 * dt, life: p.life - 0.05 * dt
        })).filter(p => p.life > 0));

        spawnTimerRef.current -= 1 * dt;
        if (spawnTimerRef.current <= 0) {
            setFruits(prev => [...prev, generateRandomWord(targetType)]);
            spawnTimerRef.current = Math.max(30, 100 - score * 1.5); // Gets faster
        }

        const now = Date.now();
        setSlashTrail(prev => prev.filter(pt => now - pt.time < SLICE_TIME_LIMIT));

    }, [gameState, score, targetType]);

    useEffect(() => {
        if (gameState === 'playing') {
            lastTimeRef.current = performance.now();
            const loop = (time) => {
                const dt = Math.min(3, (time - lastTimeRef.current) / 16.666);
                lastTimeRef.current = time;
                updatePhysics(dt);
                gameLoopRef.current = requestAnimationFrame(loop);
            };
            gameLoopRef.current = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [gameState, updatePhysics]);


    // Unified Pointer Event Handlers (Mouse + Touch)
    const handlePointerDown = (e) => {
        if (gameState !== 'playing' || !canvasRef.current) return;
        setIsSlashing(true);
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
        if (clientX === undefined) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;

        setSlashTrail([{ x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY, time: Date.now() }]);
    };

    const handlePointerMove = (e) => {
        if (!isSlashing || gameState !== 'playing' || !canvasRef.current) return;

        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
        if (clientX === undefined) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        const newPoint = { x, y, time: Date.now() };

        setSlashTrail(prev => {
            const nextTrail = [...prev, newPoint];

            if (nextTrail.length > 1) {
                const p1 = nextTrail[nextTrail.length - 2];
                const p2 = nextTrail[nextTrail.length - 1];

                setFruits(currentFruits => currentFruits.map(fruit => {
                    if (!fruit.sliced && fruit.active) {
                        // Wide forgiving hitbox so it feels good
                        const hit = lineIntersectsRect(p1.x, p1.y, p2.x, p2.y, fruit.x - 60, fruit.y - 40, 120, 80);
                        if (hit) {
                            if (fruit.isTarget) {
                                setScore(s => {
                                    const ns = s + 10;
                                    if (ns % 50 === 0) pickNewTarget();
                                    return ns;
                                });
                                spawnParticles(fruit.x, fruit.y, '#4caf50');
                            } else {
                                setLives(l => { const nl = l - 1; if (nl <= 0) setGameState('over'); return nl; });
                                spawnParticles(fruit.x, fruit.y, '#f44336');
                            }
                            return { ...fruit, sliced: true, vy: 0 };
                        }
                    }
                    return fruit;
                }));
            }
            return nextTrail;
        });
    };

    const handlePointerUp = () => setIsSlashing(false);

    return (
        <div
            className="glass-panel"
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{ position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT, overflow: 'hidden', backgroundColor: '#e0f7fa', border: '4px solid #00acc1', margin: 'auto', userSelect: 'none', touchAction: 'none' }}
        >
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #e0f7fa 25%, #e0f7fa 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }} />

            <button onClick={onBack} style={{ position: 'absolute', top: '15px', left: '15px', background: 'var(--color-glass-bg)', border: '2px solid #00acc1', borderRadius: '15px', padding: '10px 20px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 60, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                🔙 Menu (Esc)
            </button>

            {/* Explicitly Educational Grammar UI */}
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10, pointerEvents: 'none', backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 30px', borderRadius: '30px', border: '3px solid #ff5722', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                <h2 style={{ margin: 0, color: '#00838f', fontSize: '1.5rem' }}>SLASH ONLY THE:</h2>
                <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#ff5722', textShadow: '2px 2px 0px #ffcc80' }}>
                    {targetType}S
                </div>
            </div>

            <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right', zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#00bcd4', textShadow: '2px 2px 0 #fff' }}>
                    Score: {score}
                </div>
                <div style={{ fontSize: '2rem' }}>
                    {Array.from({ length: Math.max(0, lives) }).map((_, i) => <span key={i}>❤️</span>)}
                    {Array.from({ length: 3 - Math.max(0, lives) }).map((_, i) => <span key={`e-${i}`} style={{ opacity: 0.3 }}>🖤</span>)}
                </div>
            </div>

            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute', left: p.x, top: p.y, width: 8, height: 8,
                    backgroundColor: p.color, borderRadius: '50%', opacity: p.life,
                    pointerEvents: 'none', zIndex: 5
                }} />
            ))}

            {fruits.map(fruit => (
                <div key={fruit.id} style={{
                    position: 'absolute', left: fruit.x, top: fruit.y,
                    transform: `translate(-50%, -50%) rotate(${fruit.rotation}deg)`,
                    pointerEvents: 'none', zIndex: 15
                }}>
                    {!fruit.sliced ? (
                        <div style={{
                            backgroundColor: '#fff', border: '4px solid #ff9800', borderRadius: '40px',
                            padding: '10px 20px', minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.8rem', fontWeight: '900', color: '#e65100', boxShadow: '0 8px 15px rgba(0,0,0,0.2)'
                        }}>
                            {fruit.text}
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            {/* Rough visual split logic */}
                            <div style={{ opacity: 0.7, transform: 'translate(-20px, -20px) rotate(-15deg)', backgroundColor: '#fff', border: '4px solid #ff9800', padding: '10px', fontSize: '1.5rem', fontWeight: '900', color: '#e65100' }}>
                                {fruit.text.substring(0, Math.ceil(fruit.text.length / 2))}
                            </div>
                            <div style={{ opacity: 0.7, transform: 'translate(20px, 20px) rotate(15deg)', backgroundColor: '#fff', border: '4px solid #ff9800', padding: '10px', fontSize: '1.5rem', fontWeight: '900', color: '#e65100', position: 'absolute', top: 0 }}>
                                {fruit.text.substring(Math.ceil(fruit.text.length / 2))}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                {slashTrail.length > 1 && (
                    <polyline
                        points={slashTrail.map(pt => `${pt.x},${pt.y}`).join(' ')}
                        fill="none" stroke="#26c6da" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px #00bcd4)' }}
                    />
                )}
            </svg>

            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333', zIndex: 50 }}>
                    <h1 style={{ fontSize: '5rem', color: '#ff5722', textShadow: '2px 2px 0 #fff', margin: 0, textAlign: 'center' }}>⚔️ Grammar Ninja</h1>
                    <div style={{ backgroundColor: '#fff3e0', border: '4px solid #ff9800', padding: '20px', borderRadius: '15px', maxWidth: '600px', textAlign: 'center', margin: '2rem 0' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Learn English Parts of Speech the Ninja way!</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d84315', marginTop: '10px' }}>Look at the target (e.g. "NOUNS"), then Swipe/Drag your finger to ONLY slash words that match!</p>
                        <hr style={{ margin: '15px 0', borderTop: '2px solid #ffcc80' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <span>🐶 NOUNS (Things)</span>
                            <span>🏃 VERBS (Actions)</span>
                            <span>🔵 ADJECTIVES (Descript)</span>
                        </div>
                    </div>

                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#ff5722', padding: '15px 50px', fontSize: '2rem' }}>DRAW BLADE</button>
                </div>
            )}

            {gameState === 'over' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ color: '#f44336', fontSize: '5rem', textShadow: '0 0 20px rgba(244,67,54,0.5)' }}>GAME OVER!</h1>
                    <p style={{ fontSize: '2.5rem', margin: '1rem 0', fontWeight: 'bold' }}>Final Score: <span style={{ color: '#ffeb3b' }}>{score}</span></p>
                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#4caf50' }}>Play Again</button>
                </div>
            )}
        </div>
    );
};

export default WordNinja;
