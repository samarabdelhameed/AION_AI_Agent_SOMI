import React from 'react';
import { Page } from '../App';

interface DocumentationProps {
  onNavigate: (page: Page) => void;
}

const Documentation: React.FC<DocumentationProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-dark-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">AION Documentation</h1>
          <p className="text-xl text-gray-400">
            Complete technical documentation for AION - The Immortal AI DeFi Agent
          </p>
        </div>
        
        <div className="mt-12 bg-dark-800/30 border border-dark-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome to AION</h2>
          <p className="text-gray-300">
            AION is an immortal AI agent for decentralized finance optimization on BNB Chain.
          </p>
        </div>
      </div>
    </div>
  );
};

export { Documentation };