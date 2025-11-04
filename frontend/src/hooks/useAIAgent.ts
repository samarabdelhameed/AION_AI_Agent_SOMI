import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { useStrategies } from './useStrategies';
import { useRealData } from './useRealData';
import { useVaultOnchain } from './useVaultOnchain';

export interface AIMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  data?: any; // Additional structured data
  actions?: AIAction[]; // Suggested actions
}

export interface AIAction {
  id: string;
  type: 'execute_strategy' | 'view_details' | 'compare_strategies' | 'rebalance' | 'learn_more';
  label: string;
  data: any;
  icon?: string;
}

export interface AIContext {
  userProfile: {
    riskTolerance: 'low' | 'medium' | 'high';
    investmentGoals: string[];
    experience: 'beginner' | 'intermediate' | 'advanced';
    preferredProtocols: string[];
  };
  marketData: any;
  userPortfolio: any;
  conversationHistory: AIMessage[];
}

interface AIAgentState {
  messages: AIMessage[];
  isTyping: boolean;
  context: AIContext;
  loading: boolean;
  error: string | null;
}

export function useAIAgent() {
  const [state, setState] = useState<AIAgentState>({
    messages: [
      {
        id: '1',
        type: 'ai',
        content: "👋 Hello! I'm AION, your intelligent DeFi assistant. I can help you optimize your yield farming strategies, analyze market conditions, and make smart investment decisions. What would you like to explore today?",
        timestamp: new Date(),
        actions: [
          {
            id: 'analyze_portfolio',
            type: 'view_details',
            label: 'Analyze My Portfolio',
            data: {},
            icon: '📊'
          },
          {
            id: 'find_best_strategy',
            type: 'compare_strategies',
            label: 'Find Best Strategy',
            data: {},
            icon: '🎯'
          },
          {
            id: 'market_analysis',
            type: 'learn_more',
            label: 'Market Analysis',
            data: {},
            icon: '📈'
          },
          {
            id: 'beginner_guide',
            type: 'learn_more',
            label: 'DeFi Beginner Guide',
            data: {},
            icon: '🎓'
          }
        ]
      }
    ],
    isTyping: false,
    context: {
      userProfile: {
        riskTolerance: 'medium',
        investmentGoals: ['yield_optimization', 'diversification'],
        experience: 'intermediate',
        preferredProtocols: ['venus', 'beefy', 'pancakeswap']
      },
      marketData: null,
      userPortfolio: null,
      conversationHistory: []
    },
    loading: false,
    error: null
  });

  const { strategies } = useStrategies();
  const { marketData } = useRealData();
  const { balanceBNB, shares } = useVaultOnchain();
  const messageIdRef = useRef(1);

  // Update context when data changes
  useEffect(() => {
    console.log('🔄 Updating AI Agent context with:', { strategies, marketData, balanceBNB, shares });
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        marketData,
        userPortfolio: {
          balanceBNB,
          shares,
          strategies: strategies.filter(s => s.totalAssets > 0)
        },
        strategies: strategies // Add strategies directly to context for AI responses
      }
    }));
  }, [marketData, balanceBNB, shares, strategies]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: AIMessage = {
      id: `msg_${++messageIdRef.current}`,
      type: 'user',
      content,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true,
      loading: true
    }));

    // Prepare context for AI (moved outside try block)
    const aiContext = {
      userMessage: content,
      marketData: state.context.marketData,
      userPortfolio: state.context.userPortfolio,
      strategies: strategies.map(s => ({
        id: s.id,
        name: s.name,
        apy: s.apy,
        tvl: s.tvl,
        riskLevel: s.riskLevel,
        type: s.type,
        isHealthy: s.isHealthy
      })),
      userProfile: state.context.userProfile,
      conversationHistory: state.messages.slice(-5) // Last 5 messages for context
    };

    try {

      // Prepare request for MCP Agent API
      const mcpRequest = {
        network: 'bscTestnet',
        amount: extractAmountFromMessage(content) || '1000',
        riskTolerance: extractRiskToleranceFromMessage(content) || state.context.userProfile.riskTolerance
      };

      // Call AI decision endpoint
      const response = await apiClient.getAIDecision(mcpRequest);
      
      let aiResponse: AIMessage;
      
      if (response.success && response.data) {
        // Convert MCP response to user-friendly message
        const mcpData = response.data as any;
        const friendlyResponse = convertMCPResponseToMessage(mcpData, content);
        
        aiResponse = {
          id: `msg_${++messageIdRef.current}`,
          type: 'ai',
          content: friendlyResponse,
          timestamp: new Date(),
          data: response.data,
          actions: generateActions(content, aiContext, response.data)
        };
      } else {
        // Fallback to intelligent local response
        aiResponse = {
          id: `msg_${++messageIdRef.current}`,
          type: 'ai',
          content: generateIntelligentResponse(content, aiContext),
          timestamp: new Date(),
          actions: generateActions(content, aiContext, null)
        };
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
        isTyping: false,
        loading: false,
        context: {
          ...prev.context,
          conversationHistory: [...prev.messages, userMessage, aiResponse]
        }
      }));

    } catch (error) {
      console.error('AI Agent error:', error);
      
      // Generate intelligent response even when API fails
      const intelligentResponse = generateIntelligentResponse(content, aiContext);
      
      const errorMessage: AIMessage = {
        id: `msg_${++messageIdRef.current}`,
        type: 'ai',
        content: intelligentResponse,
        timestamp: new Date(),
        actions: generateActions(content, aiContext, null)
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isTyping: false,
        loading: false,
        error: error instanceof Error ? error.message : 'AI processing error'
      }));
    }
  }, [state.context, strategies]);

  const executeAction = useCallback(async (action: AIAction) => {
    const systemMessage: AIMessage = {
      id: `msg_${++messageIdRef.current}`,
      type: 'system',
      content: `Executing: ${action.label}`,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage],
      isTyping: true
    }));

    // Simulate action execution
    setTimeout(() => {
      let responseContent = '';
      let responseActions: AIAction[] = [];

      switch (action.type) {
        case 'execute_strategy':
          responseContent = `🎯 Great choice! I've prepared the ${action.data.strategyName} strategy for execution. This strategy offers ${action.data.apy}% APY with ${action.data.riskLevel} risk level. Would you like to proceed with the deposit?`;
          responseActions = [
            {
              id: 'confirm_execute',
              type: 'execute_strategy',
              label: 'Execute Now',
              data: action.data,
              icon: '⚡'
            },
            {
              id: 'learn_more_strategy',
              type: 'learn_more',
              label: 'Learn More',
              data: action.data,
              icon: '📚'
            }
          ];
          break;

        case 'compare_strategies':
          const topStrategies = strategies
            .filter(s => s.isHealthy)
            .sort((a, b) => b.apy - a.apy)
            .slice(0, 3);
          
          responseContent = `📊 Based on current market conditions, here are the top 3 strategies:\n\n${topStrategies.map((s, i) => 
            `${i + 1}. **${s.name}**: ${s.apy.toFixed(2)}% APY (${s.riskLevel}/10 risk)\n   ${s.description}`
          ).join('\n\n')}`;
          
          responseActions = topStrategies.map(s => ({
            id: `select_${s.id}`,
            type: 'execute_strategy' as const,
            label: `Select ${s.name}`,
            data: { strategyId: s.id, strategyName: s.name, apy: s.apy, riskLevel: s.riskLevel },
            icon: s.icon
          }));
          break;

        case 'view_details':
          const portfolio = state.context.userPortfolio;
          responseContent = `📈 **Portfolio Analysis**\n\nCurrent Balance: ${portfolio?.balanceBNB?.toFixed(4) || '0'} BNB\nVault Shares: ${portfolio?.shares || '0'}\n\nActive Strategies: ${portfolio?.strategies?.length || 0}\n\n💡 **Recommendations:**\n- Consider diversifying across multiple protocols\n- Your current risk level appears to be medium\n- Market conditions favor lending strategies today`;
          
          responseActions = [
            {
              id: 'optimize_portfolio',
              type: 'rebalance',
              label: 'Optimize Portfolio',
              data: {},
              icon: '⚖️'
            },
            {
              id: 'add_funds',
              type: 'execute_strategy',
              label: 'Add More Funds',
              data: {},
              icon: '💰'
            }
          ];
          break;

        case 'learn_more':
          if (action.data.topic === 'defi_basics') {
            responseContent = `🎓 **DeFi Basics**\n\nDeFi (Decentralized Finance) allows you to earn yield on your crypto assets through:\n\n**Lending**: Lend your assets to earn interest (Venus, Aave, Compound)\n**Yield Farming**: Provide liquidity to earn rewards (Beefy, PancakeSwap)\n**AMM**: Automated Market Making for trading fees (Uniswap, Wombat)\n\n**Risk Levels:**\n🟢 Low (1-3): Stable protocols, lower returns\n🟡 Medium (4-6): Balanced risk/reward\n🔴 High (7-10): Higher returns, more volatility`;
          } else {
            responseContent = `📚 Here's what you need to know about ${action.label}. The current market shows strong fundamentals across major DeFi protocols. Would you like me to explain any specific aspect?`;
          }
          
          responseActions = [
            {
              id: 'explain_risks',
              type: 'learn_more',
              label: 'Explain Risks',
              data: { topic: 'risks' },
              icon: '⚠️'
            },
            {
              id: 'show_strategies',
              type: 'compare_strategies',
              label: 'Show Strategies',
              data: {},
              icon: '📋'
            }
          ];
          break;

        default:
          responseContent = `✅ Action completed: ${action.label}`;
      }

      const aiResponse: AIMessage = {
        id: `msg_${++messageIdRef.current}`,
        type: 'ai',
        content: responseContent,
        timestamp: new Date(),
        actions: responseActions
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
        isTyping: false
      }));
    }, 1500);
  }, [strategies, state.context]);

  const clearConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.slice(0, 1), // Keep welcome message
      context: {
        ...prev.context,
        conversationHistory: []
      }
    }));
  }, []);

  const updateUserProfile = useCallback((updates: Partial<AIContext['userProfile']>) => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        userProfile: {
          ...prev.context.userProfile,
          ...updates
        }
      }
    }));
  }, []);

  return {
    messages: state.messages,
    isTyping: state.isTyping,
    loading: state.loading,
    error: state.error,
    context: state.context,
    sendMessage,
    executeAction,
    clearConversation,
    updateUserProfile
  };
}

// Helper function to generate intelligent responses
function generateIntelligentResponse(userMessage: string, context: any): string {
  console.log('🧠 AI Agent generating response for:', userMessage);
  console.log('📊 AI Agent context:', context);
  console.log('🎯 Available strategies:', context.strategies);
  
  const message = userMessage.toLowerCase();
  
  // Weather and non-DeFi questions
  if (message.includes('weather') || message.includes('joke') || message.includes('funny')) {
    if (message.includes('weather')) {
      return "🌤️ I'm a DeFi AI assistant, so I can't check the weather for you! But I can help you navigate the DeFi landscape and find the best investment opportunities. What DeFi strategy would you like to explore?";
    }
    if (message.includes('joke') || message.includes('funny')) {
      return "😄 Here's a DeFi joke: Why did the yield farmer go broke? Because he was farming losses instead of gains! 😂 Now, let's get serious about your DeFi strategy. What would you like to analyze?";
    }
  }
  
  // Technical DeFi questions
  if (message.includes('proof of work') || message.includes('proof of stake') || message.includes('pow') || message.includes('pos')) {
    return `🔬 **Proof of Work vs Proof of Stake Analysis**

**Proof of Work (PoW):**
• Energy-intensive mining process
• High security through computational work
• Bitcoin and Ethereum (before merge) use PoW
• Environmental concerns due to high energy consumption

**Proof of Stake (PoS):**
• Validators stake tokens to secure network
• Energy-efficient and environmentally friendly
• Ethereum 2.0, BNB Chain, and most modern chains use PoS
• Better scalability and lower transaction costs

**For DeFi in 2024: PoS is superior** because:
✅ Lower energy costs = lower transaction fees
✅ Better scalability for DeFi applications
✅ Environmental sustainability
✅ Faster finality for DeFi transactions

Most DeFi protocols now run on PoS chains like BNB Chain, Ethereum 2.0, and Polygon.`;
  }
  
  // Impermanent loss questions
  if (message.includes('impermanent loss') || message.includes('liquidity provision') || message.includes('amm') || message.includes('concentrated')) {
    return `📊 **Impermanent Loss Analysis**

**What is Impermanent Loss?**
Impermanent loss occurs when providing liquidity to AMM pools due to price volatility between paired assets.

**AMM vs Concentrated Liquidity:**

**Traditional AMM (Uniswap V2):**
• Full range liquidity (0 to ∞)
• Higher impermanent loss risk
• Simpler to understand
• Better for stable pairs

**Concentrated Liquidity (Uniswap V3):**
• Customizable price ranges
• Lower impermanent loss risk
• Higher capital efficiency
• Better for volatile pairs

**For BNB-ETH pair ($100k investment):**
• **AMM**: Expect 2-5% impermanent loss annually
• **Concentrated**: Focus on 0.8x-1.2x range, expect 1-3% loss

**Recommendation**: Use concentrated liquidity with tight ranges for better capital efficiency and lower impermanent loss.`;
  }
  
  // Portfolio strategy questions
  if (message.includes('portfolio') && (message.includes('$200') || message.includes('$200k') || message.includes('200000'))) {
    return `💼 **Comprehensive DeFi Portfolio Strategy - $200,000**

**Conservative Allocation (70% Low Risk, 30% Medium Risk):**

**Low Risk (70% = $140,000):**
• **Venus Protocol (40%)**: $80,000 - Lending with 4-6% APY
• **Aave (30%)**: $60,000 - Stablecoin lending with 3-5% APY

**Medium Risk (30% = $60,000):**
• **Beefy Finance (20%)**: $40,000 - Yield farming with 8-12% APY
• **PancakeSwap (10%)**: $20,000 - Liquidity provision with 15-25% APY

**Expected Annual Returns: 6-8%**
**Risk Level: 3/10 (Conservative)**

**Monthly Rebalancing Strategy:**
1. **Week 1**: Review performance and adjust allocations
2. **Week 2**: Rebalance if any strategy exceeds ±5% target
3. **Week 3**: Reinvest accumulated yields
4. **Week 4**: Assess market conditions and adjust risk levels

**Risk Management:**
• Set stop-loss at 10% for medium-risk strategies
• Diversify across different DeFi sectors
• Monitor protocol health monthly`;
  }
  
  // Market timing queries (MUST BE FIRST - most specific)
  if (message.includes('time') || message.includes('when') || message.includes('best time') || 
      (message.includes('invest') && (message.includes('time') || message.includes('when')))) {
    const strategies = context.strategies || [];
    const avgAPY = strategies.reduce((sum: number, s: any) => sum + s.apy, 0) / (strategies.length || 1);
    const marketHealth = strategies.filter((s: any) => s.isHealthy).length / strategies.length;
    
    let timingAnalysis = `⏰ **Market Timing Analysis**\n\n`;
    
    if (marketHealth >= 0.8) {
      timingAnalysis += `🎯 **Current Market Conditions: EXCELLENT**\n`;
      timingAnalysis += `• Protocol health: ${(marketHealth * 100).toFixed(0)}% healthy\n`;
      timingAnalysis += `• Average APY: ${avgAPY.toFixed(2)}%\n`;
      timingAnalysis += `• Market sentiment: Bullish\n\n`;
      timingAnalysis += `💡 **Recommendation**: NOW is an excellent time to invest! Market conditions are optimal with healthy protocols and attractive yields.`;
    } else if (marketHealth >= 0.6) {
      timingAnalysis += `🟡 **Current Market Conditions: GOOD**\n`;
      timingAnalysis += `• Protocol health: ${(marketHealth * 100).toFixed(0)}% healthy\n`;
      timingAnalysis += `• Average APY: ${avgAPY.toFixed(2)}%\n`;
      timingAnalysis += `• Market sentiment: Neutral to positive\n\n`;
      timingAnalysis += `💡 **Recommendation**: Good time to invest with moderate risk. Consider dollar-cost averaging.`;
    } else {
      timingAnalysis += `🔴 **Current Market Conditions: CAUTIOUS**\n`;
      timingAnalysis += `• Protocol health: ${(marketHealth * 100).toFixed(0)}% healthy\n`;
      timingAnalysis += `• Average APY: ${avgAPY.toFixed(2)}%\n`;
      timingAnalysis += `• Market sentiment: Bearish\n\n`;
      timingAnalysis += `💡 **Recommendation**: Wait for better conditions or invest only in low-risk strategies.`;
    }
    
    return timingAnalysis;
  }

  // Investment amount queries (MUST BE SECOND - more specific)
  if (message.includes('invest') && (message.includes('$') || message.includes('amount'))) {
    const amount = message.match(/\$(\d+)/)?.[1] || '1000';
    const strategies = context.strategies || [];
    const lowRiskStrategies = strategies.filter((s: any) => s.riskLevel <= 3);
    const mediumRiskStrategies = strategies.filter((s: any) => s.riskLevel > 3 && s.riskLevel <= 6);
    
    let recommendation = `💰 For a $${amount} investment, I recommend a diversified approach:\n\n`;
    
    if (lowRiskStrategies.length > 0) {
      const bestLowRisk = lowRiskStrategies.sort((a: any, b: any) => b.apy - a.apy)[0];
      recommendation += `• **Low Risk (${bestLowRisk.riskLevel}/10)**: ${bestLowRisk.name} - ${bestLowRisk.apy.toFixed(2)}% APY\n`;
    }
    
    if (mediumRiskStrategies.length > 0) {
      const bestMediumRisk = mediumRiskStrategies.sort((a: any, b: any) => b.apy - a.apy)[0];
      recommendation += `• **Medium Risk (${bestMediumRisk.riskLevel}/10)**: ${bestMediumRisk.name} - ${bestMediumRisk.apy.toFixed(2)}% APY\n`;
    }
    
    recommendation += `\n💡 **Strategy**: Consider allocating 70% to low-risk and 30% to medium-risk strategies for balanced returns.`;
    
    return recommendation;
  }

  // Highest APY queries (MUST BE SECOND - more specific)
  if (message.includes('highest') && (message.includes('apy') || message.includes('yield'))) {
    const strategies = context.strategies || [];
    const highestAPYStrategy = strategies.sort((a: any, b: any) => b.apy - a.apy)[0];
    if (highestAPYStrategy) {
      return `🚀 **${highestAPYStrategy.name}** has the highest APY at **${highestAPYStrategy.apy.toFixed(2)}%**! This ${highestAPYStrategy.type.toLowerCase()} strategy offers excellent returns, though it comes with a ${highestAPYStrategy.riskLevel}/10 risk level. Consider your risk tolerance before investing.`;
    }
  }

  // Strategy-related queries (MUST BE LAST - more general)
  if (message.includes('strategy') || message.includes('best')) {
    const strategies = context.strategies || [];
    if (strategies.length > 0) {
      // Sort by APY to find the best strategy
      const topStrategy = strategies.sort((a: any, b: any) => b.apy - a.apy)[0];
      return `🎯 Based on current market analysis, I recommend the **${topStrategy.name}** strategy. It's currently offering ${topStrategy.apy.toFixed(2)}% APY with a ${topStrategy.riskLevel}/10 risk level. This strategy is particularly attractive because of its ${topStrategy.isHealthy ? 'healthy protocol status' : 'current market conditions'}.`;
    }
  }

  // Risk management questions
  if (message.includes('risk') && (message.includes('management') || message.includes('framework') || message.includes('institutional'))) {
    return `🛡️ **Institutional DeFi Risk Management Framework - $10M Portfolio**

**Risk Metrics & Monitoring:**
• **VaR (Value at Risk)**: 95% confidence, 1-day horizon
• **Sharpe Ratio**: Target >1.5 for risk-adjusted returns
• **Maximum Drawdown**: Limit to 15% of portfolio value
• **Correlation Matrix**: Monitor inter-protocol dependencies

**Real-Time Monitoring Tools:**
• **DeFi Pulse**: Protocol health scores
• **DeFi Llama**: TVL and APY tracking
• **Custom Dashboard**: Real-time portfolio metrics
• **Alert System**: Automated risk notifications

**Emergency Procedures:**
1. **Immediate**: Pause all new deposits
2. **1 Hour**: Assess protocol vulnerabilities
3. **4 Hours**: Execute emergency withdrawals
4. **24 Hours**: Full portfolio rebalancing

**Compliance & Regulatory:**
• **KYC/AML**: Full identity verification
• **Audit Reports**: Regular smart contract audits
• **Insurance**: DeFi insurance coverage
• **Legal Review**: Regulatory compliance checks

**Monthly Risk Assessment:**
• Protocol health scores
• Market volatility analysis
• Regulatory updates review
• Performance attribution analysis`;
  }

  // Top protocols by TVL
  if (message.includes('top') && (message.includes('protocol') || message.includes('tvl'))) {
    return `🏆 **Top 3 DeFi Protocols by TVL (2024)**

**1. Venus Protocol (BSC)**
• **TVL**: $476.5M
• **Focus**: Lending & Borrowing
• **APY Range**: 4-8%
• **Risk Level**: Low (2/10)

**2. PancakeSwap (BSC)**
• **TVL**: $234.2M
• **Focus**: DEX & Yield Farming
• **APY Range**: 15-45%
• **Risk Level**: Medium (5/10)

**3. Beefy Finance (Multi-Chain)**
• **TVL**: $189.7M
• **Focus**: Yield Optimization
• **APY Range**: 8-25%
• **Risk Level**: Medium (4/10)

**Market Trends:**
• BSC continues to dominate DeFi TVL
• Lending protocols show stability
• Yield farming remains popular
• Cross-chain strategies gaining traction`;
  }

  // General DeFi help
  if (message.includes('help') || message.includes('assist') || message.includes('guide')) {
    return `🚀 **I'm here to help you navigate DeFi successfully! I can assist with:**

• **Strategy Selection**: Find the best yield opportunities
• **Risk Assessment**: Understand and manage your risk
• **Portfolio Optimization**: Balance your investments
• **Market Analysis**: Stay informed about trends
• **Education**: Learn DeFi concepts step by step

**What specific area would you like to explore?**

📊 Compare All Strategies
📈 Analyze Portfolio
🎯 Find Best Yields
🛡️ Risk Management`;
  }

  // Default response for unrecognized queries
  return `🤔 I understand you're asking about "${userMessage}". Let me help you with DeFi strategies and market analysis. 

Could you please rephrase your question to focus on:
• DeFi investment strategies
• Yield farming opportunities
• Risk management
• Market analysis
• Portfolio optimization

Or ask me something specific like "What's the best yield farming strategy?" or "How do I manage DeFi risk?"`;
}

// Helper function to generate contextual actions
function generateActions(userMessage: string, context: any, aiData: any): AIAction[] {
  const message = userMessage.toLowerCase();
  
  const baseActions: AIAction[] = [
    {
      id: 'compare_all',
      type: 'compare_strategies',
      label: 'Compare All Strategies',
      data: { action: 'compare_strategies' },
      icon: '📊'
    },
    {
      id: 'analyze_portfolio',
      type: 'view_details',
      label: 'Analyze Portfolio',
      data: { action: 'analyze_portfolio' },
      icon: '📈'
    }
  ];
  
  if (message.includes('strategy') || message.includes('best')) {
    return [
      {
        id: 'find_strategy',
        type: 'compare_strategies',
        label: 'Find Best Strategy',
        data: {},
        icon: '🎯'
      },
      {
        id: 'risk_assessment',
        type: 'learn_more',
        label: 'Risk Assessment',
        data: { topic: 'risk' },
        icon: '🛡️'
      },
      ...baseActions
    ];
  }
  
  if (message.includes('execute') || message.includes('deposit')) {
    const topStrategy = context.strategies?.[0];
    if (topStrategy) {
      return [
        {
          id: 'execute_top',
          type: 'execute_strategy',
          label: `Execute ${topStrategy.name}`,
          data: { 
            strategyId: topStrategy.id, 
            strategyName: topStrategy.name,
            apy: topStrategy.apy,
            riskLevel: topStrategy.riskLevel
          },
          icon: '⚡'
        },
        ...baseActions
      ];
    }
  }
  
  return baseActions;
}

// Helper function to extract amount from user message
function extractAmountFromMessage(message: string): string | null {
  const amountMatch = message.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (amountMatch) {
    return amountMatch[1].replace(/,/g, '');
  }
  
  const numberMatch = message.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|usd|\$)/i);
  if (numberMatch) {
    return numberMatch[1].replace(/,/g, '');
  }
  
  return null;
}

// Helper function to extract risk tolerance from user message
function extractRiskToleranceFromMessage(message: string): 'low' | 'medium' | 'high' | null {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('safe') || lowerMessage.includes('conservative') || 
      lowerMessage.includes('low risk') || lowerMessage.includes('beginner')) {
    return 'low';
  }
  
  if (lowerMessage.includes('aggressive') || lowerMessage.includes('high risk') || 
      lowerMessage.includes('risky') || lowerMessage.includes('maximum')) {
    return 'high';
  }
  
  if (lowerMessage.includes('moderate') || lowerMessage.includes('medium') || 
      lowerMessage.includes('balanced')) {
    return 'medium';
  }
  
  return null;
}

// Helper function to convert MCP response to user-friendly message
function convertMCPResponseToMessage(mcpData: any, originalMessage: string): string {
  const { recommendation, confidence, reasoning, expectedApy, riskScore } = mcpData;
  
  // Map protocol names to user-friendly names
  const protocolNames: { [key: string]: string } = {
    'venus': 'Venus Protocol',
    'pancake': 'PancakeSwap',
    'beefy': 'Beefy Finance',
    'aave': 'Aave Protocol'
  };
  
  const protocolName = protocolNames[recommendation] || recommendation;
  const confidencePercent = Math.round(confidence * 100);
  
  let response = `🎯 **AI Recommendation: ${protocolName}**\n\n`;
  response += `**Expected APY**: ${expectedApy.toFixed(2)}%\n`;
  response += `**Risk Level**: ${riskScore}/10\n`;
  response += `**Confidence**: ${confidencePercent}%\n\n`;
  response += `**Analysis**: ${reasoning}\n\n`;
  
  // Add specific guidance based on the original message
  if (originalMessage.toLowerCase().includes('beginner')) {
    response += `💡 **For Beginners**: This strategy is selected because it offers a good balance of safety and returns. `;
    response += `Start with a small amount to get familiar with the platform before investing more.`;
  } else if (originalMessage.toLowerCase().includes('safe')) {
    response += `🛡️ **Safety Focus**: This recommendation prioritizes capital preservation while still generating attractive yields.`;
  } else {
    response += `📊 **Strategy**: This recommendation is based on current market conditions and your risk profile.`;
  }
  
  return response;
}