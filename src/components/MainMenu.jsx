import React from 'react';

const MainMenu = ({ onSelectGame }) => {
    return (
        <div style={{ width: 800, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
            <div className="glass-panel animate-pop" style={{ padding: '3rem', textAlign: 'center', width: '100%', maxWidth: '600px' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓 Fun Learning Hub! 🚀</h1>
                <p style={{ marginBottom: '2rem' }}>Choose your 2D adventure and start learning!</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <button
                        className="interactive-btn"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                        onClick={() => onSelectGame('math')}
                    >
                        🐦 Flappy Math ➕
                    </button>

                    <button
                        className="interactive-btn"
                        style={{ backgroundColor: 'var(--color-success)' }}
                        onClick={() => onSelectGame('sprout')}
                    >
                        🌱 Photosynthesis Survivor ☀️
                    </button>

                    <button
                        className="interactive-btn"
                        style={{ backgroundColor: '#ab47bc' }} // Purple for Dungeon
                        onClick={() => onSelectGame('dungeon')}
                    >
                        ⚔️ Dungeon Math Quest 🐉
                    </button>

                    <button
                        className="interactive-btn"
                        style={{ backgroundColor: '#212121' }} // Dark for Ninja
                        onClick={() => onSelectGame('ninja')}
                    >
                        ⚔️ Grammar Ninja 🍉
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
