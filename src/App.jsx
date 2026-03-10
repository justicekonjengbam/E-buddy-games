import { useState } from 'react';
import MainMenu from './components/MainMenu';
import FlappyMath from './components/FlappyMath';
import SproutSurvivor from './components/SproutSurvivor';
import OrbitGravity from './components/OrbitGravity';
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
      case 'orbit':
        return <OrbitGravity onBack={() => setCurrentView('menu')} />;
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
