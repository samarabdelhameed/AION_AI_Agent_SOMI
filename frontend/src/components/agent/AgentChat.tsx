import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Page } from '../../App';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  actions?: Array<{ label: string; action: string; variant?: 'primary' | 'secondary' }>;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  'Best safe yield now',
  'Compare Venus/Beefy',
  'Rebalance suggestion',
  'Risk analysis',
];

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    type: 'agent',
    content: 'Hello! I\'m AION, your smart AI agent. Based on analysis of your current portfolio and market activity, I see you have 2.5 BNB in Venus Protocol earning 8.45% APY. Would you like me to analyze better opportunities?',
    actions: [
      { label: 'Analyze Opportunities', action: 'analyze', variant: 'primary' },
      { label: 'Show Details', action: 'details', variant: 'secondary' },
    ],
    timestamp: new Date(Date.now() - 5 * 60000),
  },
];

interface AgentChatProps {
  onNavigate: (page: Page) => void;
}

export function AgentChat({ onNavigate }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `Based on your request "${input}", I recommend switching to Beefy Finance to earn 12.8% APY instead of the current 8.45%. This will increase your profits by 4.35% with acceptable medium risk.`,
        actions: [
          { label: 'Simulate Transfer', action: 'simulate', variant: 'primary' },
          { label: 'Execute Now', action: 'execute', variant: 'secondary' },
          { label: 'More Details', action: 'explain', variant: 'secondary' },
        ],
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, agentMessage]);
      setIsTyping(false);
    }, 2000);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  const handleActionClick = (action: string) => {
    console.log('Action clicked:', action);
    if (action === 'simulate' || action === 'execute') {
      onNavigate('execute');
    } else if (action === 'analyze') {
      onNavigate('strategies');
    } else if (action === 'details') {
      onNavigate('proof');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <Card 
                  className={`${
                    message.type === 'user' 
                      ? 'bg-gold-500 text-dark-900' 
                      : 'bg-dark-700/80 text-white'
                  }`}
                  hover={false}
                >
                  {/* Avatar */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-dark-900/20' 
                        : 'bg-gradient-to-r from-gold-500 to-neon-cyan'
                    }`}>
                      {message.type === 'user' ? (
                        <div className="w-4 h-4 bg-dark-900 rounded-full" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-dark-900" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Action Buttons */}
                      {message.actions && (
                        <motion.div 
                          className="flex flex-wrap gap-2 mt-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {message.actions.map((action, idx) => (
                            <Button
                              key={idx}
                              size="sm"
                              variant={action.variant || 'secondary'}
                              onClick={() => handleActionClick(action.action)}
                              className="text-xs"
                            >
                              {action.label}
                            </Button>
                          ))}
                        </motion.div>
                      )}
                      
                      <p className="text-xs opacity-60 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <Card className="bg-dark-700/80 max-w-[200px]" hover={false}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-dark-900" />
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-gold-500 rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-dark-700/50">
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction(action)}
              className="px-3 py-1 bg-dark-700/50 hover:bg-dark-600/50 text-gold-500 text-sm rounded-full border border-gold-500/30 hover:border-gold-500/50 transition-all"
            >
              {action}
            </motion.button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask AION anything..."
              className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50"
            />
          </div>
          <Button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            icon={Send}
            glow
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}