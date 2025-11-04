import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, ExternalLink, CheckCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface WalletTroubleshooterProps {
  isVisible: boolean;
  onClose: () => void;
}

export function WalletTroubleshooter({ isVisible, onClose }: WalletTroubleshooterProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const troubleshootingSteps = [
    {
      title: 'Check MetaMask Installation',
      description: 'Make sure MetaMask is installed and enabled',
      action: () => {
        window.open('https://metamask.io/download/', '_blank');
      },
      actionText: 'Install MetaMask',
      check: () => typeof window !== 'undefined' && !!(window as any).ethereum
    },
    {
      title: 'Refresh the Page',
      description: 'Sometimes a simple refresh resolves connection issues',
      action: () => {
        window.location.reload();
      },
      actionText: 'Refresh Page',
      check: () => true
    },
    {
      title: 'Check Network Settings',
      description: 'Ensure you\'re connected to BSC Testnet or Mainnet',
      action: () => {
        // This will be handled by the NetworkSelector component
        console.log('Network check - use NetworkSelector');
      },
      actionText: 'Check Network',
      check: () => true
    },
    {
      title: 'Clear Browser Cache',
      description: 'Clear your browser cache and cookies for this site',
      action: () => {
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
      },
      actionText: 'Clear Cache',
      check: () => true
    },
    {
      title: 'Disable Other Wallets',
      description: 'Disable other wallet extensions that might conflict',
      action: () => {
        window.open('chrome://extensions/', '_blank');
      },
      actionText: 'Manage Extensions',
      check: () => true
    }
  ];

  const currentStepData = troubleshootingSteps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md"
          >
            <Card className="relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-xl font-semibold text-white">
                    Wallet Connection Issues?
                  </h2>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      Step {currentStep + 1} of {troubleshootingSteps.length}
                    </span>
                    <div className="flex gap-1">
                      {troubleshootingSteps.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentStep
                              ? 'bg-gold-500'
                              : index < currentStep
                              ? 'bg-green-500'
                              : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="bg-dark-700/50 rounded-xl p-4 mb-4">
                    <h3 className="font-medium text-white mb-2">
                      {currentStepData.title}
                    </h3>
                    <p className="text-sm text-gray-300 mb-4">
                      {currentStepData.description}
                    </p>

                    <div className="flex items-center gap-2">
                      {currentStepData.check() && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={currentStepData.action}
                        className="flex items-center gap-2"
                      >
                        {currentStepData.actionText}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    Previous
                  </Button>

                  {currentStep < troubleshootingSteps.length - 1 ? (
                    <Button
                      onClick={() => setCurrentStep(currentStep + 1)}
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      onClick={onClose}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Done
                    </Button>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-xs text-blue-200">
                    💡 <strong>Tip:</strong> Most connection issues are resolved by refreshing the page or checking your MetaMask settings.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for wallet troubleshooting
export function useWalletTroubleshooting() {
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  const openTroubleshooter = () => setShowTroubleshooter(true);
  const closeTroubleshooter = () => setShowTroubleshooter(false);

  return {
    showTroubleshooter,
    openTroubleshooter,
    closeTroubleshooter,
  };
}