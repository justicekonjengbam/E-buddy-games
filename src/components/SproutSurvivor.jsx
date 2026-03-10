import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const POT_WIDTH = 120;
const POT_HEIGHT = 100;
const ITEM_PHYSICS_SIZE = 40;
const ITEM_VISUAL_SIZE = 60;
const BASE_FALL_SPEED = 3.0; // Slower for kids

const ITEM_TYPES = {
    SUNLIGHT: { id: 'sun', symbol: '☀️', color: '#ffd54f', type: 'resource', points: 15, msg: '+Sun!' },
    WATER: { id: 'h2o', symbol: '💧', color: '#4fc3f7', type: 'resource', points: 15, msg: '+Water!' },
    CO2: { id: 'co2', symbol: '☁️', color: '#b0bec5', type: 'resource', points: 10, msg: '+CO2!' },
    PEST: { id: 'pest', symbol: '🐛', color: '#8d6e63', type: 'hazard', damage: 20, msg: '-HP!' },
    POLLUTION: { id: 'smog', symbol: '🌫️', color: '#546e7a', type: 'hazard', damage: 15, msg: 'Danger!' }
};

const SproutSurvivor = ({ onBack }) => {
    const [gameState, setGameState] = useState('start');
    const [health, setHealth] = useState(100);
    const [growthLevel, setGrowthLevel] = useState(0); // 0 to 100
    const [resources, setResources] = useState({ sun: 0, h2o: 0, co2: 0 });
    const [potX, setPotX] = useState(GAME_WIDTH / 2 - POT_WIDTH / 2);
    const [items, setItems] = useState([]);
    const [particles, setParticles] = useState([]);

    const potXRef = useRef(GAME_WIDTH / 2 - POT_WIDTH / 2);
    const keysRef = useRef({});
    const gameLoopRef = useRef();
    const spawnTimerRef = useRef(60);
    const lastTimeRef = useRef(0);

    const triggerGrow = () => {
        setGrowthLevel(prev => Math.min(100, prev + 5));
    };

    const triggerShake = () => {
        const el = document.getElementById('game-container');
        if (el) {
            el.style.animation = 'shake 0.3s ease-in-out';
            setTimeout(() => el.style.animation = '', 300);
        }
    };

    const addParticle = (x, y, text, color) => {
        setParticles(prev => [...prev, { id: Math.random(), x, y, text, color, age: 0 }]);
    };

    const handlePointer = (e) => {
        if (gameState !== 'playing') return;
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        if (clientX === undefined) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const scale = rect.width / GAME_WIDTH;
        const x = (clientX - rect.left) / scale;
        potXRef.current = Math.min(GAME_WIDTH - POT_WIDTH, Math.max(0, x - POT_WIDTH / 2));
    };

    const startGame = () => {
        setGameState('playing');
        setHealth(100);
        setGrowthLevel(0);
        setResources({ sun: 0, h2o: 0, co2: 0 });
        setItems([]);
        setParticles([]);
    };

    useEffect(() => {
        const handleKeys = (e) => {
            if (e.type === 'keydown') keysRef.current[e.code] = true;
            if (e.type === 'keyup') keysRef.current[e.code] = false;
        };
        window.addEventListener('keydown', handleKeys);
        window.addEventListener('keyup', handleKeys);
        return () => { window.removeEventListener('keydown', handleKeys); window.removeEventListener('keyup', handleKeys); };
    }, []);

    // Robust Ref-based loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const loop = (time) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const delta = time - lastTimeRef.current;
            lastTimeRef.current = time;
            const dt = Math.min(3, delta / 16.666);

            // 1. Move Pot
            if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
                potXRef.current = Math.max(0, potXRef.current - 9 * dt);
            }
            if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
                potXRef.current = Math.min(GAME_WIDTH - POT_WIDTH, potXRef.current + 9 * dt);
            }

            // 2. Physics & Collision
            setItems(prev => {
                let newItems = prev
                    .map(item => ({ ...item, y: item.y + item.speed * dt, rotation: item.rotation + item.rotSpeed * dt }))
                    .filter(item => item.y < GAME_HEIGHT + 100);

                const potLeft = potXRef.current - 10;
                const potRight = potXRef.current + POT_WIDTH + 10;
                const potTop = GAME_HEIGHT - POT_HEIGHT - 60;

                newItems = newItems.filter(item => {
                    const itemXCenter = item.x + ITEM_VISUAL_SIZE / 2;
                    const itemBottom = item.y + ITEM_PHYSICS_SIZE;

                    if (itemBottom > potTop && itemXCenter > potLeft && itemXCenter < potRight) {
                        if (item.data.type === 'resource') {
                            setResources(r => ({ ...r, [item.data.id]: Math.min(100, r[item.data.id] + item.data.points) }));
                            triggerGrow();
                            addParticle(itemXCenter, potTop, item.data.msg, '#4caf50');
                        } else {
                            setHealth(h => {
                                const next = Math.max(0, h - item.data.damage);
                                if (next <= 0) setGameState('over');
                                return next;
                            });
                            triggerShake();
                            addParticle(itemXCenter, potTop, item.data.msg, '#f44336');
                        }
                        return false;
                    }
                    return true;
                });
                return newItems;
            });

            // 3. Spawning
            spawnTimerRef.current -= 1 * dt;
            if (spawnTimerRef.current <= 0) {
                spawnTimerRef.current = Math.max(25, 60 - growthLevel / 2);
                const isGood = Math.random() < (growthLevel > 50 ? 0.6 : 0.85);
                const types = isGood ? ['SUNLIGHT', 'WATER', 'CO2'] : ['PEST', 'POLLUTION'];
                const type = ITEM_TYPES[types[Math.floor(Math.random() * types.length)]];

                setItems(prev => [...prev, {
                    id: Math.random(),
                    x: Math.random() * (GAME_WIDTH - ITEM_VISUAL_SIZE),
                    y: -ITEM_VISUAL_SIZE,
                    speed: BASE_FALL_SPEED + Math.random() * 2 + (growthLevel / 30),
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 5,
                    data: type
                }]);
            }

            // 4. Update Particles & Game State Updates
            setParticles(prev => prev.map(p => ({ ...p, y: p.y - 2 * dt, age: p.age + 1 * dt })).filter(p => p.age < 60));
            setPotX(potXRef.current);

            if (growthLevel >= 100) setGameState('win');

            gameLoopRef.current = requestAnimationFrame(loop);
        };

        lastTimeRef.current = performance.now();
        gameLoopRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [gameState, growthLevel]);

    return (
        <div
            id="game-container"
            className="glass-panel animate-pop"
            style={{
                position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT,
                overflow: 'hidden', backgroundColor: '#81c784', border: '8px solid #2e7d32', margin: 'auto'
            }}
        >
            <button onClick={onBack} className="interactive-btn" style={{ position: 'absolute', top: '15px', left: '15px', padding: '8px 15px', fontSize: '0.9rem', zIndex: 60, backgroundColor: '#333' }}>🔙 Menu</button>

            {/* Visual Sky/Sun Effect */}
            <div style={{ position: 'absolute', top: 0, width: '100%', height: '40%', background: 'linear-gradient(to bottom, #4fc3f7, #81c784)', opacity: 0.6 }} />

            {/* HUD */}
            <div style={{ position: 'absolute', top: '15px', right: '15px', width: '200px', zIndex: 10 }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '15px', color: 'white' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>HEALTH</div>
                    <div style={{ width: '100%', height: '15px', backgroundColor: '#333', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${health}%`, height: '100%', backgroundColor: health > 30 ? '#ef5350' : '#d32f2f', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>PHOTOSYNTHESIS: {growthLevel}%</div>
                    <div style={{ width: '100%', height: '15px', backgroundColor: '#333', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${growthLevel}%`, height: '100%', backgroundColor: '#ffd54f', transition: 'width 0.3s' }} />
                    </div>
                </div>
            </div>

            {/* Falling Items */}
            {items.map(item => (
                <div key={item.id} style={{
                    position: 'absolute', left: item.x, top: item.y, fontSize: '3rem',
                    transform: `rotate(${item.rotation}deg)`, pointerEvents: 'none'
                }}>{item.data.symbol}</div>
            ))}

            {/* Particles */}
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute', left: p.x, top: p.y, color: p.color, fontWeight: '900',
                    fontSize: '1.2rem', opacity: 1 - (p.age / 60), pointerEvents: 'none', zIndex: 30
                }}>{p.text}</div>
            ))}

            {/* Plant Pot */}
            <div style={{ position: 'absolute', left: potX, bottom: 40, width: POT_WIDTH, textAlign: 'center' }}>
                <div style={{ fontSize: `${5 + (growthLevel / 20)}rem`, transition: 'font-size 0.5s', transform: 'translateY(30px)' }}>
                    {growthLevel < 25 ? '🌱' : growthLevel < 60 ? '🌿' : growthLevel < 100 ? '🌻' : '🌴'}
                </div>
                <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.3))' }}>🏺</div>
            </div>

            {/* Full Screen Overlays */}
            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <h1 style={{ color: '#2e7d32', textAlign: 'center' }}>🌱 Sprout Survivor</h1>
                    <p style={{ fontSize: '1.4rem', textAlign: 'center', maxWidth: '500px', margin: '1rem 0' }}>Move with <b>A/D</b> or <b>Arrows</b>.<br />Catch Sunlight, Water, and CO2.<br />Avoid Pests and Pollution!</p>
                    <button className="interactive-btn" onClick={startGame} style={{ fontSize: '2rem', backgroundColor: '#2e7d32' }}>Save the Plant</button>
                    <p style={{ marginTop: '1rem', opacity: 0.6 }}>(Touch users: Drag or Tap sides to move)</p>
                </div>
            )}

            {gameState === 'over' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 100 }}>
                    <h1 style={{ color: '#ef5350' }}>PLANT WITHERED</h1>
                    <p style={{ fontSize: '2rem', margin: '1rem 0' }}>The ecosystem was too harsh...</p>
                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#2e7d32' }}>Try Again</button>
                </div>
            )}

            {gameState === 'win' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(76, 175, 80, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 100 }}>
                    <h1 style={{ color: '#ffd54f' }}>🏆 ECO MASTER!</h1>
                    <p style={{ fontSize: '2rem', margin: '1rem 0' }}>You successfully grew the plant!</p>
                    <button className="interactive-btn" onClick={() => onBack()} style={{ backgroundColor: 'white', color: '#2e7d32' }}>Back to Menu</button>
                </div>
            )}

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
            `}</style>
        </div>
    );
};

export default SproutSurvivor;
