import React from 'react';
import { motion } from 'framer-motion';
import { Github, Twitter, FileText, Shield, Book } from 'lucide-react';
import { Page } from '../../App';

const footerLinks = {
  Product: [
    { name: 'Dashboard', href: 'dashboard' as Page },
    { name: 'AI Agent', href: 'agent' as Page },
    { name: 'Strategies', href: 'strategies' as Page },
    { name: 'Analytics', href: 'proof' as Page },
  ],
  Developers: [
    { name: 'Documentation', href: 'docs' as Page },
    { name: 'API Reference', href: 'docs' as Page },
    { name: 'GitHub', href: 'docs' as Page },
    { name: 'Bug Reports', href: 'docs' as Page },
  ],
  Company: [
    { name: 'About Us', href: 'landing' as Page },
    { name: 'Terms of Service', href: 'docs' as Page },
    { name: 'Privacy Policy', href: 'docs' as Page },
    { name: 'Contact', href: 'docs' as Page },
  ],
};

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: 'docs' as Page },
  { name: 'GitHub', icon: Github, href: 'docs' as Page },
  { name: 'Docs', icon: Book, href: 'docs' as Page },
];

interface FooterProps {
  onNavigate: (page: Page) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-dark-900 border-t border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <motion.div 
              className="flex items-center gap-3 mb-4 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate('landing')}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-dark-900" />
              </div>
              <span className="text-xl font-bold text-white">AION</span>
            </motion.div>
            <p className="text-gray-400 mb-4">
              The Immortal AI DeFi Agent. Automated yield optimization with transparent proof of performance.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((item) => (
                <motion.button
                  key={item.name}
                  onClick={() => onNavigate(item.href)}
                  className="text-gray-400 hover:text-gold-500 transition-colors"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <item.icon size={20} />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <motion.button
                      onClick={() => onNavigate(link.href)}
                      className="text-gray-400 hover:text-gold-500 transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      {link.name}
                    </motion.button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-dark-700/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2025 AION Protocol. All rights reserved.
          </p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <button 
              onClick={() => onNavigate('docs')}
              className="text-gray-400 hover:text-gold-500 text-sm flex items-center gap-1"
            >
              <FileText size={14} />
              Terms
            </button>
            <button 
              onClick={() => onNavigate('docs')}
              className="text-gray-400 hover:text-gold-500 text-sm flex items-center gap-1"
            >
              <Shield size={14} />
              Privacy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}