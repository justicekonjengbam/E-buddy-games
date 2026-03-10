import React, { useState, useEffect, useRef } from 'react';

const generateEquation = () => {
    const isAddition = Math.random() > 0.5;
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;

    if (isAddition) {
        return { text: `${num1} + ${num2}`, answer: num1 + num2 };
    } else {
        // ensure no negative answers for primary kids
        const max = Math.max(num1, num2);
        const min = Math.min(num1, num2);
        return { text: `${max} - ${min}`, answer: max - min };
    }
};

const MathBlaster = ({ onBack }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [equation, setEquation] = useState(generateEquation());
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState(null); // 'correct' or 'wrong'
    const [gameState, setGameState] = useState('playing'); // 'playing', 'over'
    const inputRef = useRef(null);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timerId = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timerId);
        } else if (timeLeft === 0 && gameState === 'playing') {
            setGameState('over');
        }
    }, [timeLeft, gameState]);

    useEffect(() => {
        if (gameState === 'playing' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [gameState, equation]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (gameState !== 'playing') return;

        const parsed = parseInt(userAnswer, 10);
        if (parsed === equation.answer) {
            setScore(s => s + 10);
            setFeedback('correct');
            setEquation(generateEquation());
            setUserAnswer('');
            setTimeout(() => setFeedback(null), 500);
        } else {
            setFeedback('wrong');
            setUserAnswer('');
            setTimeout(() => setFeedback(null), 500);
        }
    };

    if (gameState === 'over') {
        return (
            <div className="glass-panel animate-pop" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px' }}>
                <h2 style={{ fontSize: '3rem', color: 'var(--color-primary)' }}>⏰ Time's Up!</h2>
                <p style={{ fontSize: '2rem', margin: '2rem 0' }}>
                    You earned <strong style={{ color: 'var(--color-accent)', fontSize: '3rem' }}>{score}</strong> stars! ⭐
                </p>
                <button className="interactive-btn" onClick={onBack} style={{ backgroundColor: 'var(--color-secondary)' }}>
                    🔙 Back to Menu
                </button>
            </div>
        );
    }

    return (
        <div className="glass-panel animate-pop" style={{ padding: '2rem', textAlign: 'center', width: '90%', maxWidth: '800px', position: 'relative' }}>
            <button
                onClick={onBack}
                style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}
            >
                🔙
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 2rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                    ⭐ Stars: {score}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: timeLeft <= 10 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    ⏱️ Time: {timeLeft}s
                </div>
            </div>

            <h2 style={{ fontSize: '2.5rem', color: 'var(--color-secondary)', marginBottom: '1rem' }}>Math Blaster! 🚀</h2>

            <div
                className={feedback === 'correct' ? 'animate-pop' : ''}
                style={{
                    fontSize: '5rem',
                    fontWeight: '900',
                    margin: '2rem 0',
                    color: feedback === 'correct' ? 'var(--color-success)' : feedback === 'wrong' ? 'var(--color-primary)' : 'var(--color-text)'
                }}
            >
                {equation.text} = ?
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    style={{
                        fontSize: '3rem',
                        padding: '1rem',
                        width: '200px',
                        textAlign: 'center',
                        borderRadius: '20px',
                        border: '4px solid var(--color-secondary)',
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        color: 'var(--color-text)',
                        outline: 'none',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    }}
                />
                <br />
                <button
                    type="submit"
                    className="interactive-btn"
                    style={{
                        marginTop: '2rem',
                        backgroundColor: 'var(--color-success)',
                        transform: userAnswer ? 'scale(1.05)' : 'scale(1)'
                    }}
                >
                    Check Answer ✔️
                </button>
            </form>
        </div>
    );
};

export default MathBlaster;
