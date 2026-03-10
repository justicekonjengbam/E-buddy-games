import { useState } from 'react';
import MainMenu from './components/MainMenu';
import FlappyMath from './components/FlappyMath';
import SproutSurvivor from './components/SproutSurvivor';
import DungeonMath from './components/DungeonMath';
import WordNinja from './components/WordNinja';
import ResponsiveWrapper from './components/ResponsiveWrapper';
import './index.css'; // Make sure global css is imported

function App() {
  const [currentView, setCurrentView] = useState('menu');

  const renderView = () => {
    switch (currentView) {
      case 'math':
        return <FlappyMath onBack={() => setCurrentView('menu')} />;
      case 'sprout':
        return <SproutSurvivor onBack={() => setCurrentView('menu')} />;
      case 'dungeon':
        return <DungeonMath onBack={() => setCurrentView('menu')} />;
      case 'ninja':
        return <WordNinja onBack={() => setCurrentView('menu')} />;
      case 'menu':
      default:
        return <MainMenu onSelectGame={setCurrentView} />;
    }
  };

  return (
    <main className="app-container">
      <ResponsiveWrapper>
        {renderView()}
      </ResponsiveWrapper>
    </main>
  );
}

export default App;
