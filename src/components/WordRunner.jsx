import React, { useState, useEffect, useCallback, useRef } from 'react';

const WORDS = ['cat', 'dog', 'run', 'jump', 'play', 'sun', 'hat', 'red', 'pig', 'hop', 'fly', 'car'];
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GROUND_HEIGHT = 100;
const PLAYER_SIZE = 50;
const ENEMY_WIDTH = 80;
const ENEMY_HEIGHT = 60;
const BASE_SPEED = 4;

const WordRunner = ({ onBack }) => {
    const [gameState, setGameState] = useState('start'); // start, playing, over
    const [score, setScore] = useState(0);
    const [gameSpeed, setGameSpeed] = useState(BASE_SPEED);

    // Player state
    const [playerY, setPlayerY] = useState(GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE);
    const [isJumping, setIsJumping] = useState(false);
    const jumpVelocity = useRef(0);

    // Enemies state (approaching words)
    const [enemies, setEnemies] = useState([]);

    // Typing state
    const [typedFocus, setTypedFocus] = useState(''); // What user has typed of the closest word

    const gameLoopRef = useRef();
    const spawnTimerRef = useRef(0);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setGameSpeed(BASE_SPEED);
        setEnemies([]);
        setTypedFocus('');
        setPlayerY(GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE);
        setIsJumping(false);
        jumpVelocity.current = 0;
    };

    // Keyboard Typing Handler
    const handleKeyDown = useCallback((e) => {
        if (gameState !== 'playing') return;

        // Ignore modifiers
        if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;

        const key = e.key.toLowerCase();
        if (!/^[a-z]$/.test(key)) return;

        // We only care about the closet enemy that is active
        let activeEnemyIndex = -1;
        let closestX = Infinity;

        enemies.forEach((enemy, idx) => {
            if (!enemy.cleared && enemy.x < closestX) {
                closestX = enemy.x;
                activeEnemyIndex = idx;
            }
        });

        if (activeEnemyIndex !== -1) {
            const targetWord = enemies[activeEnemyIndex].word;
            const expectedLetter = targetWord[typedFocus.length];

            if (key === expectedLetter) {
                const newTyped = typedFocus + key;

                if (newTyped === targetWord) {
                    // Word Completed! Smash the enemy and jump
                    setEnemies(prev => {
                        const newE = [...prev];
                        newE[activeEnemyIndex] = { ...newE[activeEnemyIndex], cleared: true };
                        return newE;
                    });
                    setTypedFocus('');
                    setScore(s => s + 10);

                    // Increase speed slightly
                    setGameSpeed(s => Math.min(s + 0.1, 10));

                    // Initiate a cool jump for clearing it
                    if (!isJumping) {
                        setIsJumping(true);
                        jumpVelocity.current = -12;
                    }

                } else {
                    setTypedFocus(newTyped);
                }
            } else {
                // Typing mistake - maybe shake the word, but we'll just ignore for now to keep it simple
            }
        }
    }, [gameState, enemies, typedFocus, isJumping]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);


    // Game Loop
    const updateGame = useCallback(() => {
        if (gameState !== 'playing') return;

        // 1. Player Physics (Jump and Gravity)
        if (isJumping) {
            setPlayerY(y => {
                const newY = y + jumpVelocity.current;
                jumpVelocity.current += 0.8; // Gravity

                const floorY = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE;
                if (newY >= floorY) {
                    setIsJumping(false);
                    jumpVelocity.current = 0;
                    return floorY;
                }
                return newY;
            });
        }

        // 2. Manage Enemies
        setEnemies(prev => {
            let newEnemies = prev
                .map(e => ({ ...e, x: e.x - gameSpeed })) // Move left
                .filter(e => e.x > -ENEMY_WIDTH); // Remove off-screen

            // Collision Check (only if not cleared)
            const playerLeft = 50;
            const playerRight = 50 + PLAYER_SIZE;
            const playerBottom = playerY + PLAYER_SIZE;

            newEnemies.forEach(e => {
                if (!e.cleared) {
                    const enemyLeft = e.x;
                    const enemyRight = e.x + ENEMY_WIDTH;
                    const enemyTop = GAME_HEIGHT - GROUND_HEIGHT - ENEMY_HEIGHT;

                    // Simple AABB collision
                    if (playerRight > enemyLeft && playerLeft < enemyRight && playerBottom > enemyTop) {
                        setGameState('over');
                    }
                }
            });

            return newEnemies;
        });

        // 3. Spawn logic
        spawnTimerRef.current -= 1;
        if (spawnTimerRef.current <= 0) {
            // Spawn distance based on speed
            spawnTimerRef.current = Math.floor(GAME_WIDTH / gameSpeed) + Math.random() * 50;

            const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
            setEnemies(prev => [...prev, {
                x: GAME_WIDTH,
                word: randomWord,
                cleared: false
            }]);
        }

    }, [gameState, isJumping, gameSpeed, playerY]);


    useEffect(() => {
        if (gameState === 'playing') {
            gameLoopRef.current = requestAnimationFrame(function loop() {
                updateGame();
                gameLoopRef.current = requestAnimationFrame(loop);
            });
        }
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [gameState, updateGame]);


    return (
        <div className="glass-panel" style={{ position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT, overflow: 'hidden', backgroundColor: '#e0f7fa', border: '4px solid white', margin: 'auto' }}>

            <button
                onClick={onBack}
                style={{ position: 'absolute', top: '10px', left: '10px', background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', zIndex: 20 }}
            >
                🔙
            </button>

            <div style={{ position: 'absolute', top: '10px', right: '20px', fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)', zIndex: 10 }}>
                ⭐ {score}
            </div>

            {/* Scenery - Clouds/Background could go here */}

            {/* Ground */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: GROUND_HEIGHT,
                backgroundColor: '#8d6e63',
                borderTop: '10px solid #aed581' // grass track
            }} />

            {/* Player Character */}
            <div style={{
                position: 'absolute',
                left: 50,
                top: playerY,
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
                backgroundColor: 'var(--color-accent)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                zIndex: 15
            }}>
                🏃
            </div>

            {/* Enemies */}
            {enemies.map((enemy, index) => {
                // Only the closest non-cleared enemy should show the typed focus
                const isTarget = !enemy.cleared && enemies.findIndex(e => !e.cleared) === index;

                return (
                    <div key={index} style={{
                        position: 'absolute',
                        left: enemy.x,
                        bottom: GROUND_HEIGHT,
                        width: ENEMY_WIDTH,
                        height: ENEMY_HEIGHT,
                        backgroundColor: enemy.cleared ? 'transparent' : '#ffb74d',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: enemy.cleared ? 'none' : '3px solid #f57c00',
                        transition: 'opacity 0.2s',
                        opacity: enemy.cleared ? 0 : 1,
                        zIndex: 10
                    }}>
                        {!enemy.cleared && (
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                {/* Highlight typed portion in green */}
                                <span style={{ color: isTarget ? 'green' : 'black' }}>
                                    {isTarget ? enemy.word.substring(0, typedFocus.length) : ''}
                                </span>
                                <span style={{ color: 'black' }}>
                                    {isTarget ? enemy.word.substring(typedFocus.length) : enemy.word}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}


            {/* Menus */}
            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 30 }}>
                    <h2>🏃 Word Runner!</h2>
                    <p>Type the words on the boxes to smash them and jump over!</p>
                    <button className="interactive-btn" onClick={startGame} style={{ marginTop: '2rem', backgroundColor: 'var(--color-secondary)' }}>Run Now</button>
                </div>
            )}

            {gameState === 'over' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 30 }}>
                    <h2>💥 Collision!</h2>
                    <p style={{ fontSize: '2rem', margin: '1rem 0' }}>Score: {score}</p>
                    <button className="interactive-btn" onClick={startGame} style={{ backgroundColor: 'var(--color-secondary)' }}>Try Again</button>
                </div>
            )}

        </div>
    );
};

export default WordRunner;
