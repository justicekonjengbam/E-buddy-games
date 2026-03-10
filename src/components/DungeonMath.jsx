import React, { useState, useEffect, useCallback, useRef } from 'react';

const MONSTERS = [
    { name: 'Sticky Slime', emoji: '💧', hp: 50, damage: 10, color: '#4caf50' },
    { name: 'Grumpy Goblin', emoji: '👺', hp: 80, damage: 15, color: '#ff9800' },
    { name: 'Fire Dragon', emoji: '🐲', hp: 150, damage: 25, color: '#f44336' }
];

const generateEquation = (level) => {
    const difficultyScaling = level * 5;
    const isAddition = Math.random() > 0.5;
    const num1 = Math.floor(Math.random() * (10 + difficultyScaling)) + 1;
    const num2 = Math.floor(Math.random() * (10 + difficultyScaling)) + 1;
    let answer, text;

    if (isAddition) {
        text = `${num1} + ${num2}`;
        answer = num1 + num2;
    } else {
        const max = Math.max(num1, num2);
        const min = Math.min(num1, num2);
        text = `${max} - ${min}`;
        answer = max - min;
    }

    // Generate 3 distractors
    const options = new Set([answer]);
    while (options.size < 4) {
        const offset = Math.floor(Math.random() * 10) - 5;
        const distractor = Math.max(0, answer + offset);
        if (distractor !== answer) options.add(distractor);
    }

    return {
        text,
        answer,
        options: Array.from(options).sort(() => Math.random() - 0.5)
    };
};

const DungeonMath = ({ onBack }) => {
    const [gameState, setGameState] = useState('start'); // 'start', 'battle', 'won', 'lost'
    const [level, setLevel] = useState(0);
    const [heroHP, setHeroHP] = useState(100);
    const [monsterHP, setMonsterHP] = useState(MONSTERS[0].hp);
    const [equation, setEquation] = useState(generateEquation(0));
    const [feedback, setFeedback] = useState(null); // 'hero-attack', 'monster-attack'
    const [message, setMessage] = useState('A monster appears!');

    const currentMonster = MONSTERS[level];

    const startBattle = () => {
        setGameState('battle');
        setHeroHP(100);
        setMonsterHP(MONSTERS[0].hp);
        setLevel(0);
        setEquation(generateEquation(0));
        setMessage(`A wild ${MONSTERS[0].name} blocks your path!`);
    };

    const handleAnswer = (selectedVal) => {
        if (gameState !== 'battle' || feedback) return;

        if (selectedVal === equation.answer) {
            // Hero hits!
            setFeedback('hero-attack');
            setMessage(`✨ CRITICAL HIT! Spell cast on ${currentMonster.name}!`);
            const damage = 35 + Math.floor(Math.random() * 10);

            setTimeout(() => {
                setMonsterHP(prev => {
                    const next = prev - damage;
                    if (next <= 0) {
                        handleMonsterDefeat();
                        return 0;
                    }
                    return next;
                });
                setFeedback(null);
                setEquation(generateEquation(level));
            }, 800);
        } else {
            // Monster hits!
            setFeedback('monster-attack');
            setMessage(`💥 OUCH! ${currentMonster.name} counters!`);

            setTimeout(() => {
                setHeroHP(prev => {
                    const next = prev - currentMonster.damage;
                    if (next <= 0) {
                        setGameState('lost');
                        return 0;
                    }
                    return next;
                });
                setFeedback(null);
            }, 800);
        }
    };

    const handleMonsterDefeat = () => {
        if (level < MONSTERS.length - 1) {
            setMessage(`Victory! ${currentMonster.name} was defeated!`);
            setTimeout(() => {
                const nextLevel = level + 1;
                setLevel(nextLevel);
                setMonsterHP(MONSTERS[nextLevel].hp);
                setMessage(`A stronger ${MONSTERS[nextLevel].name} appears!`);
                setEquation(generateEquation(nextLevel));
            }, 1200);
        } else {
            setGameState('won');
        }
    };

    if (!currentMonster) return null;

    return (
        <div className="glass-panel animate-pop" style={{
            position: 'relative', width: 800, height: 600, overflow: 'hidden',
            backgroundColor: '#0f0c29', color: 'white', margin: 'auto',
            border: '8px solid #4a4a8a', display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', zIndex: 10 }}>
                <button onClick={onBack} className="interactive-btn" style={{ fontSize: '1rem', padding: '10px 20px', backgroundColor: '#333' }}>🔙 Menu</button>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffd700', textShadow: '2px 2px 0 #000' }}>🏰 Dungeon Level {level + 1}</div>
            </div>

            {/* Battle Field */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'center', position: 'relative', paddingBottom: '20px' }}>
                {/* Hero */}
                <div style={{
                    textAlign: 'center',
                    transform: feedback === 'hero-attack' ? 'translateX(100px)' : (feedback === 'monster-attack' ? 'translateX(-20px) scale(0.9)' : 'none'),
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    <div style={{ fontSize: '7rem', filter: feedback === 'monster-attack' ? 'sepia(1) saturate(5) hue-rotate(-50deg)' : 'none' }}>🧙‍♂️</div>
                    <div style={{ marginTop: '10px', width: '150px', height: '20px', backgroundColor: '#333', borderRadius: '10px', border: '2px solid white', overflow: 'hidden' }}>
                        <div style={{ width: `${heroHP}%`, height: '100%', backgroundColor: '#4caf50', borderRadius: '8px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>HERO HP: {heroHP}</div>
                </div>

                {/* VS */}
                <div style={{ fontSize: '4rem', fontWeight: '900', fontStyle: 'italic', color: '#ff4081', opacity: feedback ? 0 : 1, transition: 'opacity 0.2s' }}>VS</div>

                {/* Monster */}
                <div style={{
                    textAlign: 'center',
                    transform: feedback === 'monster-attack' ? 'translateX(-100px)' : (feedback === 'hero-attack' ? 'translateX(20px) scale(0.9)' : 'none'),
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    <div style={{
                        fontSize: '7rem',
                        animation: 'float 2s infinite alternate',
                        filter: feedback === 'hero-attack' ? 'brightness(2) saturate(0)' : 'none'
                    }}>{currentMonster.emoji}</div>
                    <div style={{ marginTop: '10px', width: '150px', height: '20px', backgroundColor: '#333', borderRadius: '10px', border: '2px solid white', overflow: 'hidden' }}>
                        <div style={{ width: `${(monsterHP / currentMonster.hp) * 100}%`, height: '100%', backgroundColor: '#f44336', borderRadius: '8px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{currentMonster.name.toUpperCase()} HP: {monsterHP}</div>
                </div>
            </div>

            {/* Battle UI Area */}
            <div style={{
                height: '240px', backgroundColor: 'rgba(0,0,0,0.85)', borderTop: '4px solid #ab47bc',
                padding: '20px', textAlign: 'center', zIndex: 10, position: 'relative',
                display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#e1bee7', fontWeight: 'bold' }}>{message}</div>

                {gameState === 'battle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: '900', color: '#fff', marginBottom: '20px' }}>{equation.text} = ?</div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {equation.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(opt)}
                                    disabled={!!feedback}
                                    className="interactive-btn"
                                    style={{
                                        minWidth: '100px', padding: '10px 25px',
                                        fontSize: '1.8rem', backgroundColor: '#673ab7',
                                        border: '4px solid #ab47bc', borderRadius: '20px',
                                        animation: `orb-float ${2 + idx * 0.2}s infinite alternate`
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes float { from { transform: translateY(0); } to { transform: translateY(-20px); } }
                @keyframes orb-float { 
                    0% { transform: translateY(0); box-shadow: 0 0 10px rgba(171, 71, 188, 0.5); }
                    100% { transform: translateY(-10px); box-shadow: 0 0 30px rgba(171, 71, 188, 0.8); }
                }
            `}</style>

            {/* Game States Overlays */}
            {gameState === 'start' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <h1 style={{ fontSize: '4rem', color: '#ffd700', marginBottom: '1rem', textAlign: 'center' }}>⚔️ DUNGEON MATH QUEST</h1>
                    <p style={{ fontSize: '1.6rem', marginBottom: '2rem', textAlign: 'center', color: '#ce93d8' }}>Defeat monsters by choosing the correct Spell Orb!</p>
                    <button className="interactive-btn" onClick={startBattle} style={{ fontSize: '2.5rem', backgroundColor: '#e91e63' }}>ENTER DUNGEON</button>
                </div>
            )}

            {gameState === 'won' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(56, 142, 60, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <h1 style={{ fontSize: '5rem', color: '#ffd700' }}>🏆 VICTORY!</h1>
                    <p style={{ fontSize: '2rem', margin: '2rem 0' }}>The dungeon is safe once again!</p>
                    <button className="interactive-btn" onClick={onBack} style={{ backgroundColor: '#fff', color: '#000' }}>Back to Menu</button>
                </div>
            )}

            {gameState === 'lost' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(211, 47, 47, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <h1 style={{ fontSize: '5rem' }}>💀 DEFEATED</h1>
                    <p style={{ fontSize: '2rem', margin: '2rem 0' }}>The dungeon was too dark...</p>
                    <button className="interactive-btn" onClick={startBattle} style={{ backgroundColor: '#fff', color: '#000' }}>Retry Quest</button>
                </div>
            )}
        </div>
    );
};

export default DungeonMath;
