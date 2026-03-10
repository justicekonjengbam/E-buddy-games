import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const G_CONSTANT = 0.5; // Scaled for simulation 
const PLANET_MASS = 2000;
const PLANET_RADIUS = 60;
const PLANET_X = GAME_WIDTH / 2;
const PLANET_Y = GAME_HEIGHT / 2;

const OrbitGravity = ({ onBack }) => {
    const [gameState, setGameState] = useState('start');
    const [level, setLevel] = useState(1);

    // Launch parameters
    const [angle, setAngle] = useState(45); // degrees
    const [velocity, setVelocity] = useState(2.5); // lower initial velocity for easier orbit

    // Satellite state (x, y, vx, vy)
    const [satellite, setSatellite] = useState({ x: 100, y: 100, vx: 0, vy: 0 });
    const [trail, setTrail] = useState([]);

    const [orbitRotation, setOrbitRotation] = useState(0);
    const lastAngleRef = useRef(null);

    const gameLoopRef = useRef();

    const startPositions = {
        1: { x: 150, y: GAME_HEIGHT / 2 },
        2: { x: 150, y: 150 },
        3: { x: GAME_WIDTH - 150, y: GAME_HEIGHT - 150 }
    };

    const resetLevel = useCallback((lvl) => {
        const startPos = startPositions[lvl] || startPositions[1];
        setSatellite({ x: startPos.x, y: startPos.y, vx: 0, vy: 0 });
        setTrail([]);
        setOrbitRotation(0);
        lastAngleRef.current = null;
        setAngle(45);
        setVelocity(2.5);
    }, []);

    const startGame = () => {
        setGameState('setup');
        resetLevel(level);
    };

    const launchSatellite = () => {
        if (gameState !== 'setup') return;
        const radians = (angle * Math.PI) / 180;
        const vx = velocity * Math.cos(radians);
        const vy = -velocity * Math.sin(radians);
        setSatellite(prev => ({ ...prev, vx, vy }));
        setGameState('playing');
        setTrail([]);
        setOrbitRotation(0);
        lastAngleRef.current = Math.atan2(satellite.y - PLANET_Y, satellite.x - PLANET_X);
    };

    const updatePhysics = useCallback(() => {
        if (gameState !== 'playing') return;

        setSatellite(prev => {
            const dx = PLANET_X - prev.x;
            const dy = PLANET_Y - prev.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            // Crash
            if (dist < PLANET_RADIUS + 10) {
                setGameState('crash');
                return prev;
            }

            // Lost
            if (prev.x < -1000 || prev.x > GAME_WIDTH + 1000 || prev.y < -1000 || prev.y > GAME_HEIGHT + 1000) {
                setGameState('lost');
                return prev;
            }

            // Universal Law of Gravitation: F = G * (M * m) / r^2
            // Acceleration (a = F/m): a = G * M / r^2
            const force = (G_CONSTANT * PLANET_MASS) / distSq;

            const ax = force * (dx / dist);
            const ay = force * (dy / dist);

            const newVx = prev.vx + ax;
            const newVy = prev.vy + ay;
            const newX = prev.x + newVx;
            const newY = prev.y + newVy;

            setTrail(currTrail => {
                if (currTrail.length === 0 || Math.abs(currTrail[currTrail.length - 1].x - newX) > 5 || Math.abs(currTrail[currTrail.length - 1].y - newY) > 5) {
                    const nextTrail = [...currTrail, { x: newX, y: newY }];
                    if (nextTrail.length > 200) nextTrail.shift();
                    return nextTrail;
                }
                return currTrail;
            });

            // Track Rotation
            const currentAngle = Math.atan2(newY - PLANET_Y, newX - PLANET_X);
            if (lastAngleRef.current !== null) {
                let delta = currentAngle - lastAngleRef.current;
                if (delta > Math.PI) delta -= 2 * Math.PI;
                if (delta < -Math.PI) delta += 2 * Math.PI;

                setOrbitRotation(prev => {
                    const next = prev + delta;
                    if (Math.abs(next) >= 2 * Math.PI) {
                        setGameState('success');
                    }
                    return next;
                });
            }
            lastAngleRef.current = currentAngle;

            return { x: newX, y: newY, vx: newVx, vy: newVy, currentDist: dist };
        });
    }, [gameState]);

    const handleAngleChange = (e) => setAngle(Number(e.target.value));
    const handleVelocityChange = (e) => setVelocity(Number(e.target.value));

    useEffect(() => {
        if (gameState === 'playing') {
            gameLoopRef.current = requestAnimationFrame(function loop() {
                updatePhysics();
                gameLoopRef.current = requestAnimationFrame(loop);
            });
        }
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [gameState, updatePhysics]);

    const renderTrajectoryPrediction = () => {
        if (gameState !== 'setup') return null;
        let simX = satellite.x;
        let simY = satellite.y;
        let simVx = velocity * Math.cos((angle * Math.PI) / 180);
        let simVy = -velocity * Math.sin((angle * Math.PI) / 180);

        const dots = [];
        // Simulate forward 250 frames to predict the true gravity curve
        for (let i = 0; i < 250; i++) {
            const dx = PLANET_X - simX;
            const dy = PLANET_Y - simY;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            // Stop predicting if it will crash
            if (dist < PLANET_RADIUS) break;

            const force = (G_CONSTANT * PLANET_MASS) / distSq;
            const ax = force * (dx / dist);
            const ay = force * (dy / dist);

            simVx += ax;
            simVy += ay;
            simX += simVx;
            simY += simVy;

            // Draw a dot every 5th frame
            if (i % 5 === 0) {
                dots.push(<div key={`pred-${i}`} style={{ position: 'absolute', left: simX, top: simY, width: 4, height: 4, backgroundColor: 'rgba(225, 190, 231, 0.6)', borderRadius: '50%', pointerEvents: 'none', zIndex: 4 }} />);
            }
        }
        return dots;
    };

    return (
        <div className="glass-panel" style={{ position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT, overflow: 'hidden', backgroundColor: '#0f0c29', backgroundImage: 'radial-gradient(circle at center, #302b63, #0f0c29)', border: '4px solid #9c27b0', margin: 'auto', userSelect: 'none', touchAction: 'none' }}>

            <button onClick={onBack} style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '2px solid #ce93d8', borderRadius: '15px', padding: '10px 20px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 60 }}>
                🔙 Menu (Esc)
            </button>

            {/* Educational UI - Moved to bottom right to avoid starts */}
            <div style={{ position: 'absolute', bottom: '130px', right: '15px', width: '280px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.7)', padding: '15px', borderRadius: '15px', border: '2px solid #ce93d8', color: 'white', fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', fontWeight: '900', color: '#e1bee7', marginBottom: '5px', fontSize: '1.2rem' }}>Newton's Law of Gravitation</div>
                <div style={{ display: 'flex', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '10px', background: '#302b63', padding: '5px', borderRadius: '5px' }}>
                    F = G × (M × m) / r²
                </div>

                <div style={{ fontSize: '0.9rem' }}>
                    <div style={{ color: '#ce93d8' }}>M (Planet Mass) = 5.97 × 10²⁴ kg</div>
                    <div>m (Satellite Mass) = 1,000 kg</div>
                    <div style={{ color: '#4caf50' }}>Current Velocity (v) = {Math.round(Math.sqrt(satellite.vx * satellite.vx + satellite.vy * satellite.vy) * 100) / 100} km/s</div>
                    <div style={{ color: '#03a9f4' }}>Distance (r) = {satellite.currentDist ? Math.round(satellite.currentDist * 10) : '---'} km</div>
                </div>
            </div>

            {/* Star Background Engine */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
                {Array.from({ length: 50 }).map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                        width: Math.random() > 0.8 ? '3px' : '1px', height: Math.random() > 0.8 ? '3px' : '1px',
                        backgroundColor: 'white', borderRadius: '50%', animation: `twinkle ${2 + Math.random() * 3}s infinite alternate`
                    }} />
                ))}
            </div>

            <style>{`
                @keyframes twinkle { 0% { opacity: 0.2; } 100% { opacity: 1; } }
                @keyframes pulse-planet { 0% { box-shadow: 0 0 20px #8e24aa; } 100% { box-shadow: 0 0 40px #ab47bc, 0 0 80px rgba(171, 71, 188, 0.4); } }
                .orbit-slider { width: 100%; accent-color: #e1bee7; touch-action: none; }
            `}</style>

            {/* The Planet */}
            <div style={{
                position: 'absolute', left: PLANET_X, top: PLANET_Y, transform: 'translate(-50%, -50%)',
                width: PLANET_RADIUS * 2, height: PLANET_RADIUS * 2, borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #ce93d8, #6a1b9a)',
                boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.5)',
                animation: 'pulse-planet 3s infinite alternate', zIndex: 10
            }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '3rem' }}>🪐</div>
            </div>

            {/* Orbit Trail */}
            {trail.map((pt, i) => (
                <div key={i} style={{
                    position: 'absolute', left: pt.x, top: pt.y, width: 3, height: 3,
                    backgroundColor: `rgba(225, 190, 231, ${i / trail.length})`, borderRadius: '50%', zIndex: 5, pointerEvents: 'none'
                }} />
            ))}

            {renderTrajectoryPrediction()}

            {/* The Satellite */}
            <div style={{
                position: 'absolute', left: satellite.x, top: satellite.y, transform: 'translate(-50%, -50%)',
                width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%',
                boxShadow: '0 0 10px #fff', zIndex: 15, display: gameState === 'start' ? 'none' : 'block'
            }}>
                <div style={{ fontSize: '1.2rem', position: 'absolute', top: -10, left: -5 }}>🛰️</div>
            </div>


            {/* Control Panel (Setup Phase) */}
            {gameState === 'setup' && (
                <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.85)', border: '2px solid #ab47bc', borderRadius: '20px', padding: '15px 30px', width: '95%', maxWidth: '700px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 40, color: 'white', touchAction: 'none' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, paddingRight: '20px' }}>
                        <label style={{ fontWeight: 'bold', color: '#e1bee7' }}>θ Launch Angle: {angle}°</label>
                        <input type="range" min="0" max="360" value={angle} onChange={handleAngleChange} onTouchMove={handleAngleChange} className="orbit-slider" />
                    </div>

                    <button className="interactive-btn" onClick={launchSatellite} onTouchEnd={(e) => { e.preventDefault(); launchSatellite(); }} style={{ backgroundColor: '#ab47bc', color: 'white', padding: '15px 30px', fontSize: '1.5rem', boxShadow: '0 0 15px #8e24aa', flex: 0.5 }}>
                        🚀 LAUNCH
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, paddingLeft: '20px' }}>
                        <label style={{ fontWeight: 'bold', color: '#e1bee7' }}>v Velocity: {velocity} km/s</label>
                        <input type="range" min="0.1" max="10" step="0.1" value={velocity} onChange={handleVelocityChange} onTouchMove={handleVelocityChange} className="orbit-slider" />
                    </div>
                </div>
            )}

            {gameState === 'playing' && (
                <div style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(0,0,0,0.7)', border: '2px solid #ab47bc', borderRadius: '15px', padding: '10px 20px', color: 'white', zIndex: 40, textAlign: 'center', width: '250px' }}>
                    <h3 style={{ margin: 0, color: '#e1bee7' }}>Orbit Rotation: {Math.min(100, Math.round((Math.abs(orbitRotation) / (2 * Math.PI)) * 100))}%</h3>
                    <div style={{ width: '100%', height: '10px', backgroundColor: '#333', marginTop: '10px', borderRadius: '5px' }}>
                        <div style={{ width: `${Math.min(100, (Math.abs(orbitRotation) / (2 * Math.PI)) * 100)}%`, height: '100%', backgroundColor: '#ab47bc', transition: 'width 0.1s' }} />
                    </div>
                </div>
            )}

            {/* Overlays */}
            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4.5rem', color: '#e1bee7', textShadow: '0 0 20px #8e24aa', margin: 0, textAlign: 'center' }}>🪐 Kepler's Orbit</h1>
                    <p style={{ fontSize: '1.5rem', maxWidth: '600px', textAlign: 'center', margin: '2rem 0', lineHeight: '1.5' }}>
                        Launch your satellite into orbit! Use the purple prediction dots to guide your trajectory around the planet.
                    </p>
                    <div style={{ backgroundColor: 'rgba(171, 71, 188, 0.2)', border: '2px solid #ce93d8', padding: '15px', borderRadius: '10px', marginBottom: '2rem', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '1.2rem' }}><strong>Hint:</strong> Aim to make the purple dots circle the planet. If they point away, you'll get lost in space!</p>
                    </div>
                    <button className="interactive-btn" onClick={startGame} onTouchEnd={(e) => { e.preventDefault(); startGame(); }} style={{ backgroundColor: '#ab47bc', padding: '15px 50px', fontSize: '2rem' }}>INITIATE</button>
                </div>
            )}

            {gameState === 'crash' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(244, 67, 54, 0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4rem', textShadow: '0 0 20px #000' }}>💥 GRAVITY CRASH 💥</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Velocity was too low or angle directed straight into Mass gravity well.</p>
                    <button className="interactive-btn" onClick={startGame}>Recalculate (Try Again)</button>
                </div>
            )}

            {gameState === 'lost' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(33, 33, 33, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4rem', color: '#9e9e9e' }}>📡 ESCAPE VELOCITY HIT</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Velocity was too high. Satellite escaped the gravitational pull.</p>
                    <button className="interactive-btn" onClick={startGame}>Recalculate (Try Again)</button>
                </div>
            )}

            {gameState === 'success' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(76, 175, 80, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4rem', textShadow: '0 0 20px #2e7d32', textAlign: 'center' }}>✅ STABLE ORBIT ACHIEVED ✅</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Kepler's laws successfully applied.</p>
                    {level < 3 ? (
                        <button className="interactive-btn" onClick={() => { setLevel(l => l + 1); setGameState('setup'); resetLevel(level + 1); }}>Next Level</button>
                    ) : (
                        <div>
                            <p style={{ fontSize: '2rem', color: '#ffeb3b', fontWeight: 'bold' }}>All coordinates mapped!</p>
                            <button className="interactive-btn" onClick={() => { setLevel(1); setGameState('start'); }}>Play Again</button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default OrbitGravity;
