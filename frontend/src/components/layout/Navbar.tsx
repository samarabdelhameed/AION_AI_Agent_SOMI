import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, Zap, Wallet, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Page } from '../../App';
import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState as __useLocalState } from 'react';
import { HeaderUserMenu } from './HeaderUserMenu';


const navigation = [
  { name: 'Dashboard', href: 'dashboard' as Page },
  { name: 'AI Agent', href: 'agent' as Page },
  { name: 'Execute', href: 'execute' as Page },
  { name: 'Strategies', href: 'strategies' as Page },
  { name: 'Analytics', href: 'proof' as Page },
];

const moreNavigation = [
  { name: 'Advanced', href: 'advanced' as Page },
  { name: 'Timeline', href: 'timeline' as Page },
  { name: 'Settings', href: 'settings' as Page },
  { name: 'Docs', href: 'docs' as Page },
];

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chainId = useChainId();
  const { address, isConnected } = useAccount();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  
  const getNetworkName = () => {
    switch (chainId) {
      case 56: return 'BNB Chain';
      case 97: return 'BSC Testnet';
      default: return 'Unknown';
    }
  };



  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 bg-dark-900/90 backdrop-blur-md border-b border-dark-700/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => onNavigate('landing')}
          >
            <div className="w-10 h-10 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-dark-900" />
            </div>
            <span className="text-xl font-bold text-white">AION</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <motion.button
                key={item.name}
                onClick={() => onNavigate(item.href)}
                className={cn(
                  "text-gray-300 hover:text-gold-500 transition-colors",
                  currentPage === item.href && "text-gold-500"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.name}
              </motion.button>
            ))}
            
            {/* More Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={cn(
                  "text-gray-300 hover:text-gold-500 transition-colors flex items-center gap-1",
                  moreNavigation.some(item => currentPage === item.href) && "text-gold-500"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                More
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "transition-transform",
                    moreDropdownOpen && "rotate-180"
                  )} 
                />
              </motion.button>
              
              {/* Dropdown Menu */}
              {moreDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-dark-800/95 backdrop-blur-sm border border-dark-600 rounded-xl py-2 z-50"
                >
                  {moreNavigation.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        onNavigate(item.href);
                        setMoreDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-gray-300 hover:text-gold-500 hover:bg-dark-700/50 transition-colors",
                        currentPage === item.href && "text-gold-500 bg-dark-700/30"
                      )}
                    >
                      {item.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Wallet & Network */}
          <div className="hidden md:flex items-center gap-4">
            {/* Network Selector */}
            <div className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 rounded-xl border border-dark-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-300">{getNetworkName()}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>

            {/* Wallet Button + menu */}
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus={{ smallScreen: "avatar", largeScreen: "full" }} />
            <HeaderUserMenu />
            {/* Optional: Passkey/AA quick action */}
            {/* <Button
              variant="secondary"
              onClick={async () => {
                try {
                  // @ts-ignore - get provider from window if available (e.g., Privy injected)
                  const provider = (window as any).ethereum || undefined;
                  if (!provider) return;
                  await depositGasless({
                    provider,
                    // Replace with real vault address per network
                    vaultAddress: '0x1234567890123456789012345678901234567890',
                    amount: '0.01',
                  });
                } catch (e) {
                  console.error(e);
                }
              }}
            >Gasless Demo</Button> */}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: mobileMenuOpen ? 1 : 0, 
          height: mobileMenuOpen ? 'auto' : 0 
        }}
        className="md:hidden bg-dark-800/95 backdrop-blur-sm border-t border-dark-700/50"
      >
        <div className="px-4 pt-2 pb-3 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                onNavigate(item.href);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "block w-full text-left px-3 py-2 text-gray-300 hover:text-gold-500",
                currentPage === item.href && "text-gold-500"
              )}
            >
              {item.name}
            </button>
          ))}
          
          {/* More Navigation Items */}
          <div className="border-t border-dark-700/50 mt-4 pt-4">
            {moreNavigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  onNavigate(item.href);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "block w-full text-left px-3 py-2 text-gray-300 hover:text-gold-500",
                  currentPage === item.href && "text-gold-500"
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="pt-4">
            <Button
              variant={isConnected ? 'secondary' : 'primary'}
              icon={Wallet}
              className="w-full mb-2"
              onClick={() => setWalletMenuOpen((v) => !v)}
            >
              {isConnected && address ? formatAddress(address) : 'Connect Wallet'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.nav>
  );
}