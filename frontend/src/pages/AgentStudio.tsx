import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Sparkles, 
  Settings, 
  TrendingUp, 
  Shield, 
  Zap, 
  Brain,
  Activity,
  DollarSign,
  BarChart3,
  MessageSquare,
  Send,
  Mic,
  MicOff,
  RefreshCw,
  User,
  Bot,
  Lightbulb,
  Target,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Page } from '../App';
import { useAIAgent, AIMessage, AIAction } from '../hooks/useAIAgent';
import { useRealData } from '../hooks/useRealData';
import { useStrategies } from '../hooks/useStrategies';
import { useVaultOnchain } from '../hooks/useVaultOnchain';
import React from 'react';

interface AgentStudioProps {
  onNavigate: (page: Page) => void;
}

export function AgentStudio({ onNavigate }: AgentStudioProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // AI Agent Hook
  const {
    messages,
    isTyping,
    loading,
    error,
    context,
    sendMessage,
    executeAction,
    clearConversation,
    updateUserProfile
  } = useAIAgent();

  // Data hooks for context
  const { marketData, lastUpdated } = useRealData();
  const { strategies } = useStrategies();
  const { balanceBNB, shares } = useVaultOnchain();

  // Calculate market summary
  const marketSummary = React.useMemo(() => {
    const totalTVL = strategies.reduce((sum, s) => sum + (s.tvl || 0), 0);
    const avgAPY = strategies.length > 0 
      ? strategies.reduce((sum, s) => sum + s.apy, 0) / strategies.length 
      : 0;
    const healthyCount = strategies.filter(s => s.isHealthy).length;
    const topStrategy = strategies.sort((a, b) => b.apy - a.apy)[0];

    return {
      bnbPrice: marketData?.bnb_price_usd || 326.12,
      totalTVL,
      avgAPY,
      healthyCount,
      totalStrategies: strategies.length,
      topStrategy
    };
  }, [marketData, strategies]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionClick = (action: AIAction) => {
    if (action.type === 'execute_strategy') {
      onNavigate('execute');
    } else if (action.type === 'compare_strategies') {
      onNavigate('strategies');
    } else if (action.type === 'view_details') {
      onNavigate('proof');
    } else {
      executeAction(action);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-dark-900" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Agent Studio</h1>
                <p className="text-gray-400">Your intelligent DeFi assistant with real-time market analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                icon={Settings}
                onClick={() => setShowSettings(!showSettings)}
              >
                Settings
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={RefreshCw}
                onClick={clearConversation}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* AI Status Bar */}
          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-dark-600/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-green-400 font-medium">AI Online</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">
                  Analyzing {strategies.length} strategies
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">
                  Last update: {lastUpdated?.toLocaleTimeString() || 'Never'}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Context: {context.userProfile.experience} • Risk: {context.userProfile.riskTolerance}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[700px] flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type !== 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-full flex items-center justify-center flex-shrink-0">
                        {message.type === 'ai' ? (
                          <Brain className="w-4 h-4 text-dark-900" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-dark-900" />
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`p-4 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-gold-500 text-dark-900 ml-auto'
                            : message.type === 'system'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-dark-700/50 text-white'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Action Buttons */}
                        {message.actions && message.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {message.actions.map((action) => (
                              <Button
                                key={action.id}
                                size="sm"
                                variant="secondary"
                                onClick={() => handleActionClick(action)}
                                className="text-xs"
                              >
                                {action.icon && <span className="mr-1">{action.icon}</span>}
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className={`text-xs text-gray-400 mt-1 ${
                        message.type === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>

                    {message.type === 'user' && (
                      <div className="w-8 h-8 bg-dark-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-full flex items-center justify-center">
                      <Brain className="w-4 h-4 text-dark-900" />
                    </div>
                    <div className="bg-dark-700/50 text-white p-4 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span className="text-sm text-gray-400">AION is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-dark-600 p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask AION about strategies, market analysis, or DeFi guidance..."
                      className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none"
                      rows={2}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={isListening ? MicOff : Mic}
                      onClick={() => setIsListening(!isListening)}
                      className={isListening ? 'text-red-400' : ''}
                    />
                    <Button
                      size="sm"
                      icon={Send}
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || loading}
                      glow
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Context Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Market Context */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-semibold text-white">Market Context</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">BNB Price</span>
                  <span className="text-white font-semibold">${marketSummary.bnbPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total TVL</span>
                  <span className="text-white font-semibold">${(marketSummary.totalTVL / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg APY</span>
                  <span className="text-green-400 font-semibold">{marketSummary.avgAPY.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Healthy Protocols</span>
                  <span className="text-white font-semibold">{marketSummary.healthyCount}/{marketSummary.totalStrategies}</span>
                </div>
                {marketSummary.topStrategy && (
                  <div className="pt-3 border-t border-dark-600">
                    <p className="text-sm text-gray-400 mb-1">Top Strategy</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{marketSummary.topStrategy.icon}</span>
                      <div>
                        <p className="text-white font-medium text-sm">{marketSummary.topStrategy.name}</p>
                        <p className="text-green-400 text-xs">{marketSummary.topStrategy.apy.toFixed(2)}% APY</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Portfolio Status */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-semibold text-white">Portfolio Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Vault Balance</span>
                  <span className="text-white font-semibold">{balanceBNB?.toFixed(4) || '0'} BNB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Shares</span>
                  <span className="text-white font-semibold">{shares || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">USD Value</span>
                  <span className="text-white font-semibold">
                    ${((balanceBNB || 0) * marketSummary.bnbPrice).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <div className="flex items-center gap-1">
                    {(balanceBNB || 0) > 0 ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm">Active</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-sm">Ready</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* AI Suggestions */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-semibold text-white">AI Suggestions</h3>
              </div>
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  size="sm"
                  variant="ghost"
                  icon={Target}
                  onClick={() => sendMessage("What's the best strategy for my risk profile?")}
                >
                  Optimize Strategy
                </Button>
                <Button 
                  className="w-full justify-start" 
                  size="sm"
                  variant="ghost"
                  icon={BarChart3}
                  onClick={() => sendMessage("Analyze current market conditions")}
                >
                  Market Analysis
                </Button>
                <Button 
                  className="w-full justify-start" 
                  size="sm"
                  variant="ghost"
                  icon={Shield}
                  onClick={() => sendMessage("How can I reduce my portfolio risk?")}
                >
                  Risk Assessment
                </Button>
                <Button 
                  className="w-full justify-start" 
                  size="sm"
                  variant="ghost"
                  icon={TrendingUp}
                  onClick={() => sendMessage("Show me yield opportunities")}
                >
                  Yield Opportunities
                </Button>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="sm"
                  icon={Zap}
                  onClick={() => onNavigate('execute')}
                >
                  Execute Strategy
                </Button>
                <Button 
                  className="w-full" 
                  size="sm"
                  variant="secondary"
                  onClick={() => onNavigate('strategies')}
                >
                  Compare All
                </Button>
                <Button 
                  className="w-full" 
                  size="sm"
                  variant="ghost"
                  onClick={() => onNavigate('proof')}
                >
                  View Proof
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}