import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const POT_WIDTH = 120;
const POT_HEIGHT = 80;
const ITEM_PHYSICS_SIZE = 30;
const ITEM_VISUAL_SIZE = 50;
const BASE_FALL_SPEED = 3;

const ITEM_TYPES = {
    SUNLIGHT: { id: 'sun', icon: '☀️', type: 'resource', points: 10, msg: '+Sunlight', bg: '#fff9c4', border: '#fbc02d' },
    WATER: { id: 'h2o', icon: '💧', type: 'resource', points: 10, msg: '+H₂O', bg: '#e1f5fe', border: '#03a9f4' },
    CO2: { id: 'co2', icon: '🫧', type: 'resource', points: 10, msg: '+CO₂', bg: '#f5f5f5', border: '#9e9e9e' },
    PEST: { id: 'pest', icon: '🐛', type: 'hazard', damage: 20, msg: 'Pest Damage!', bg: '#ffcdd2', border: '#f44336' },
    POLLUTION: { id: 'toxin', icon: '💨', type: 'hazard', damage: 20, msg: 'Toxin!', bg: '#e1bee7', border: '#9c27b0' }
};

const SproutSurvivor = ({ onBack }) => {
    const [gameState, setGameState] = useState('start');
    const [health, setHealth] = useState(100);

    // Photosynthesis counters
    const [resources, setResources] = useState({ sun: 0, h2o: 0, co2: 0 });

    const [potX, setPotX] = useState(GAME_WIDTH / 2 - POT_WIDTH / 2);
    const [items, setItems] = useState([]);
    const [particles, setParticles] = useState([]);
    const [flash, setFlash] = useState(null);
    const [shake, setShake] = useState(false);

    const gameLoopRef = useRef();
    const spawnTimerRef = useRef(0);
    const keysRef = useRef({});
    const potXRef = useRef(GAME_WIDTH / 2 - POT_WIDTH / 2);

    // Growth level is derived from minimum of all 3 required resources (requires balance)
    const growthLevel = Math.min(100, Math.floor((resources.sun + resources.h2o + resources.co2) / 3));

    const addParticle = (x, y, text, color) => {
        setParticles(p => [...p, { id: Math.random(), x, y, text, color, age: 0 }]);
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setFlash('red');
        setTimeout(() => setFlash(null), 300);
    };

    const triggerGrow = () => {
        setFlash('green');
        setTimeout(() => setFlash(null), 300);
    };

    const startGame = () => {
        setGameState('playing');
        setResources({ sun: 0, h2o: 0, co2: 0 });
        setHealth(100);
        setPotX(GAME_WIDTH / 2 - POT_WIDTH / 2);
        potXRef.current = GAME_WIDTH / 2 - POT_WIDTH / 2;
        setItems([]);
        setParticles([]);
        keysRef.current = {};
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onBack();
            keysRef.current[e.code] = true;
        };
        const handleKeyUp = (e) => keysRef.current[e.code] = false;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onBack]);

    // Unified Mouse & Touch handler
    const handlePointerMove = useCallback((e) => {
        if (gameState !== 'playing') return;
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        if (clientX === undefined) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = clientX - rect.left;

        // Calculate original game scale vs responsive wrapper
        const scaleX = GAME_WIDTH / rect.width;
        const gameX = x * scaleX;

        let newX = gameX - POT_WIDTH / 2;
        if (newX < 0) newX = 0;
        if (newX > GAME_WIDTH - POT_WIDTH) newX = GAME_WIDTH - POT_WIDTH;
        potXRef.current = newX;
    }, [gameState]);


    const lastTimeRef = useRef(performance.now());

    const updateGame = useCallback((dt) => {
        if (gameState !== 'playing') return;

        // 1. Move Pot Keyboard (scaled by dt)
        let currentPotX = potXRef.current;
        if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
            currentPotX = Math.max(0, currentPotX - 8 * dt);
        }
        if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
            currentPotX = Math.min(GAME_WIDTH - POT_WIDTH, currentPotX + 8 * dt);
        }
        potXRef.current = currentPotX;
        setPotX(currentPotX);

        // 2. Move Items & Check Collisions (scaled by dt)
        setItems(prev => {
            let newItems = prev
                .map(item => ({ ...item, y: item.y + item.speed * dt, rotation: item.rotation + item.rotSpeed * dt }))
                .filter(item => item.y < GAME_HEIGHT + 100);

            let collected = { sun: 0, h2o: 0, co2: 0 };
            let tookDamage = 0;

            const potLeft = currentPotX - 10;
            const potRight = currentPotX + POT_WIDTH + 10;
            const potTop = GAME_HEIGHT - POT_HEIGHT - 60;

            newItems = newItems.filter(item => {
                const itemXCenter = item.x + ITEM_VISUAL_SIZE / 2;
                const itemBottom = item.y + ITEM_PHYSICS_SIZE;

                if (itemBottom > potTop && itemXCenter > potLeft && itemXCenter < potRight) {
                    if (item.data.type === 'resource') {
                        collected[item.data.id] += item.data.points;
                        triggerGrow();
                        addParticle(itemXCenter, potTop - 20, item.data.msg, '#4caf50');
                    } else if (item.data.type === 'hazard') {
                        tookDamage += item.data.damage;
                        triggerShake();
                        addParticle(itemXCenter, potTop - 20, item.data.msg, '#f44336');
                    }
                    return false;
                }
                return true;
            });

            if (collected.sun > 0 || collected.h2o > 0 || collected.co2 > 0) {
                setResources(r => ({
                    sun: Math.min(100, r.sun + collected.sun),
                    h2o: Math.min(100, r.h2o + collected.h2o),
                    co2: Math.min(100, r.co2 + collected.co2),
                }));
            }

            if (tookDamage > 0) {
                setHealth(h => {
                    const newHealth = Math.max(0, h - tookDamage);
                    if (newHealth === 0) setGameState('over');
                    return newHealth;
                });
            }
            return newItems;
        });

        // 3. Update Particles
        setParticles(prev => prev.map(p => ({ ...p, y: p.y - 2 * dt, age: p.age + 1 * dt })).filter(p => p.age < 60));

        // 4. Spawning (scaled by dt)
        spawnTimerRef.current -= 1 * dt;
        if (spawnTimerRef.current <= 0) {
            const spawnRate = Math.max(25, 60 - (growthLevel / 2));
            spawnTimerRef.current = spawnRate;

            let randomKey;
            const goodChance = growthLevel < 20 ? 0.9 : (0.5 + (growthLevel / 200));

            if (Math.random() < goodChance) {
                const resKeys = ['SUNLIGHT', 'WATER', 'CO2'];
                randomKey = resKeys[Math.floor(Math.random() * resKeys.length)];
            } else {
                const hazKeys = ['PEST', 'POLLUTION'];
                randomKey = hazKeys[Math.floor(Math.random() * hazKeys.length)];
            }

            setItems(prev => [...prev, {
                id: Math.random(),
                x: Math.random() * (GAME_WIDTH - ITEM_VISUAL_SIZE),
                y: -ITEM_VISUAL_SIZE,
                speed: BASE_FALL_SPEED + Math.random() * 2 + (growthLevel / 25),
                rotation: 0,
                rotSpeed: (Math.random() - 0.5) * 5,
                data: ITEM_TYPES[randomKey]
            }]);
        }

    }, [gameState, growthLevel]);

    // Win condition check
    useEffect(() => {
        if (gameState === 'playing' && growthLevel >= 100) {
            setGameState('win');
        }
    }, [gameState, growthLevel]);

    useEffect(() => {
        if (gameState === 'playing') {
            lastTimeRef.current = performance.now();
            const loop = (time) => {
                const dt = Math.min(3, (time - lastTimeRef.current) / 16.666); // Cap dt to avoid teleporting
                lastTimeRef.current = time;
                updateGame(dt);
                gameLoopRef.current = requestAnimationFrame(loop);
            };
            gameLoopRef.current = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [gameState, updateGame]);

    const renderPlant = () => {
        let plantVisual = '🌱';
        let plantSize = '3rem';
        let yOffset = -20;
        let bounce = false;

        if (growthLevel > 20) { plantVisual = '🌿'; plantSize = '4rem'; yOffset = -30; }
        if (growthLevel > 50) { plantVisual = '🪴'; plantSize = '5rem'; yOffset = -40; }
        if (growthLevel > 80) { plantVisual = '🌺'; plantSize = '6rem'; yOffset = -50; bounce = true; }

        return (
            <div style={{
                position: 'absolute', top: yOffset, left: '50%', transform: 'translateX(-50%)',
                fontSize: plantSize, transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: health < 50 ? 'grayscale(0.6) sepia(0.5)' : 'drop-shadow(0 0 10px rgba(76, 175, 80, 0.5))',
                animation: bounce ? 'pop-in 1s infinite alternate' : 'none',
                zIndex: 20
            }}>
                {plantVisual}
            </div>
        );
    }

    return (
        <div className={`glass-panel ${shake ? 'shake-animation' : ''}`}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            style={{
                position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT,
                overflow: 'hidden', backgroundColor: '#e8f5e9', border: '4px solid white',
                margin: 'auto', cursor: gameState === 'playing' ? 'none' : 'default',
                transition: 'background-color 0.2s', touchAction: 'none'
            }}>

            <style>{`
            @keyframes shake-anim {
                0% { transform: translate(1px, 1px) rotate(0deg); }
                10% { transform: translate(-1px, -2px) rotate(-1deg); }
                20% { transform: translate(-3px, 0px) rotate(1deg); }
                30% { transform: translate(3px, 2px) rotate(0deg); }
                40% { transform: translate(1px, -1px) rotate(1deg); }
                50% { transform: translate(-1px, 2px) rotate(-1deg); }
                60% { transform: translate(-3px, 1px) rotate(0deg); }
                70% { transform: translate(3px, 1px) rotate(-1deg); }
                80% { transform: translate(-1px, -1px) rotate(1deg); }
                90% { transform: translate(1px, 2px) rotate(0deg); }
                100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            .shake-animation { animation: shake-anim 0.3s; }
            .formula-text { font-family: 'Courier New', monospace; font-weight: bold; font-size: 1.2rem; background: rgba(255,255,255,0.8); padding: 2px 8px; border-radius: 5px;}
         `}</style>

            {/* Flash Overlay */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none',
                backgroundColor: flash === 'red' ? 'rgba(244, 67, 54, 0.4)' : flash === 'green' ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
                transition: 'background-color 0.2s'
            }} />

            <button onClick={onBack} style={{ position: 'absolute', top: '15px', left: '15px', background: 'var(--color-glass-bg)', border: '2px solid white', borderRadius: '15px', padding: '10px 20px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 60, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                🔙 Menu (Esc)
            </button>

            {/* explicitly educational UI overlay */}
            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '300px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(255,255,255,0.9)', padding: '15px', borderRadius: '15px', border: '3px solid #66bb6a', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', fontWeight: '900', color: '#2e7d32', marginBottom: '5px' }}>Photosynthesis Formula:</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="formula-text">6CO₂</span> + <span className="formula-text">6H₂O</span> + <span className="formula-text">☀️</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <span title="Carbon Dioxide">☁️ CO₂: {resources.co2}%</span>
                    <span title="Water">💧 H₂O: {resources.h2o}%</span>
                    <span title="Sunlight">☀️ Sun: {resources.sun}%</span>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <div style={{ fontWeight: '900', fontSize: '1rem', color: '#c62828', marginBottom: '2px' }}>❤️ Plant Health (Avoid 🐛/💨)</div>
                    <div style={{ width: '100%', height: '12px', backgroundColor: '#ffcdd2', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${health}%`, height: '100%', backgroundColor: '#ef5350', transition: 'width 0.2s' }} />
                    </div>
                </div>
            </div>

            {/* Particles */}
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute', left: p.x, top: p.y, color: p.color,
                    fontWeight: '900', fontSize: '1.5rem', textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff',
                    opacity: 1 - (p.age / 60), zIndex: 25, pointerEvents: 'none'
                }}>
                    {p.text}
                </div>
            ))}

            {/* Items */}
            {items.map(item => (
                <div key={item.id} style={{
                    position: 'absolute', left: item.x, top: item.y, width: ITEM_VISUAL_SIZE, height: ITEM_VISUAL_SIZE,
                    fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
                    transform: `rotate(${item.rotation}deg)`, filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.2))',
                    backgroundColor: item.data.bg, border: `3px solid ${item.data.border}`, borderRadius: '50%'
                }}>
                    {item.data.icon}
                </div>
            ))}

            {/* Pot */}
            <div style={{ position: 'absolute', left: potX, bottom: 0, width: POT_WIDTH, height: POT_HEIGHT, zIndex: 15, pointerEvents: 'none' }}>
                {renderPlant()}
                <div style={{
                    position: 'absolute', bottom: 0, width: '100%', height: '100%',
                    backgroundColor: '#d84315', borderTopLeftRadius: '10px', borderTopRightRadius: '10px',
                    borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', border: '6px solid #bf360c',
                    boxShadow: 'inset 0 15px 0 rgba(255,255,255,0.2), 0 10px 20px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ width: '90%', height: '10px', backgroundColor: '#3e2723', position: 'absolute', top: -5, borderRadius: '50%' }}></div>
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: '1.5rem', letterSpacing: '2px' }}>P O T</div>
                </div>
            </div>

            {/* Start Overlay */}
            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333', zIndex: 50 }}>
                    <h1 style={{ fontSize: '3.5rem', color: '#2e7d32', textShadow: '2px 2px 0px #c8e6c9', marginBottom: '1rem', textAlign: 'center' }}>🌱 Photosynthesis Survivor</h1>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="glass-panel" style={{ padding: '15px', textAlign: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '4px solid #4caf50', maxWidth: '300px' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#2e7d32', marginBottom: '5px' }}>Needs for Growth</h3>
                            <div style={{ fontSize: '2.5rem' }}>☀️ 💧 🫧</div>
                            <p style={{ fontWeight: 'bold', marginTop: '10px' }}>Collect Light, H₂O, and CO₂ to create Glucose & Oxygen!</p>
                        </div>
                    </div>

                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', backgroundColor: '#fff9c4', padding: '10px 20px', borderRadius: '20px', border: '2px solid #fbc02d' }}>
                        👆 Drag your finger/mouse to move the pot!
                    </p>

                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#4caf50', fontSize: '2rem', padding: '20px 60px' }}>PLAY NOW!</button>
                </div>
            )}

            {/* Over/Win Overlays */}
            {gameState === 'over' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ color: '#ef5350', fontSize: '5rem', textShadow: '0 0 20px rgba(239,83,80,0.5)' }}>🥀 Plant Withered!</h1>
                    <p style={{ fontSize: '2.5rem', margin: '2rem 0', fontWeight: 'bold' }}>Growth reach: {growthLevel}%</p>
                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#4caf50' }}>Try Again!</button>
                </div>
            )}

            {gameState === 'win' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4rem', color: '#ffb300', textShadow: '4px 4px 0px #ffe082', animation: 'pop-in 1s ease', textAlign: 'center' }}>🌺 PHOTOSYNTHESIS COMPLETE 🌺</h1>
                    <p style={{ fontSize: '2rem', margin: '2rem 0', fontWeight: 'bold', color: '#4caf50' }}>You successfully produced Glucose & Oxygen!</p>
                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: '#ffb300', color: 'white', fontSize: '1.5rem' }}>Play Again ☀️</button>
                </div>
            )}
        </div>
    );
};

export default SproutSurvivor;
