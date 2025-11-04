import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ConnectionStatusCompact } from './components/system/ConnectionStatus';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { AgentStudio } from './pages/AgentStudio';
import { ExecutePage } from './pages/ExecutePage';
import { StrategiesExplorer } from './pages/StrategiesExplorer';
import { ProofOfYield } from './pages/ProofOfYield';
import { ActivityTimeline } from './pages/ActivityTimeline';
import { Settings } from './pages/Settings';
import { AdvancedOperationsPage } from './pages/AdvancedOperationsPage';
import { LoadingProvider } from './contexts/LoadingContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Documentation } from './pages/Documentation';

export type Page = 'landing' | 'dashboard' | 'agent' | 'execute' | 'strategies' | 'proof' | 'timeline' | 'settings' | 'advanced' | 'docs';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'agent':
        return <AgentStudio onNavigate={setCurrentPage} />;
      case 'execute':
        return <ExecutePage onNavigate={setCurrentPage} />;
      case 'strategies':
        return <StrategiesExplorer onNavigate={setCurrentPage} />;
      case 'proof':
        return <ProofOfYield onNavigate={setCurrentPage} />;
      case 'timeline':
        return <ActivityTimeline onNavigate={setCurrentPage} />;
      case 'settings':
        return <Settings onNavigate={setCurrentPage} />;
      case 'advanced':
        return <AdvancedOperationsPage onNavigate={setCurrentPage} />;
      case 'docs':
        return <Documentation onNavigate={setCurrentPage} />;
      case 'landing':
      default:
        return <Landing onNavigate={setCurrentPage} />;
    }
  };

  return (
    <ErrorBoundary>
      <LoadingProvider>
        <div className="min-h-screen bg-dark-900">
          <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
          
          {/* Connection Status Indicator */}
          <ConnectionStatusCompact className="fixed top-20 right-4 z-50" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>

          <Footer onNavigate={setCurrentPage} />
        </div>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

export default App;