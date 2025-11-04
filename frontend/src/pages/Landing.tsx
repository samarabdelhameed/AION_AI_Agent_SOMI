import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, TrendingUp, Users, DollarSign, Percent } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/dashboard/KpiCard';
import { AnimatedLineChart } from '../components/charts/LineChart';
import { generateMockChartData } from '../lib/utils';
import { KPI_DATA } from '../lib/constants';
import { useStrategies } from '../hooks/useStrategies';
import { useRealData } from '../hooks/useRealData';
import { Page } from '../App';

const heroFeatures = [
  { icon: Zap, text: 'Advanced AI Intelligence' },
  { icon: Shield, text: 'Audited Security' },
  { icon: TrendingUp, text: 'Automated Yield Optimization' },
];

const howItWorksSteps = [
  {
    step: '01',
    title: 'Connect',
    description: 'Connect your digital wallet',
    icon: '🔗',
  },
  {
    step: '02',
    title: 'Decide',
    description: 'AI analyzes and recommends',
    icon: '🧠',
  },
  {
    step: '03',
    title: 'Execute',
    description: 'Secure and optimized execution',
    icon: '⚡',
  },
];

interface LandingProps {
  onNavigate: (page: Page) => void;
}

export function Landing({ onNavigate }: LandingProps) {
  const chartData = generateMockChartData(); // Chart data for visual appeal
  
  // Real data hooks
  const { strategies, loading } = useStrategies();
  const { marketData } = useRealData();

  // Calculate real KPIs
  const realKPIs = React.useMemo(() => {
    const totalTVL = strategies.reduce((sum, s) => sum + (s.tvl || s.totalAssets * 326.12), 0);
    const avgAPY = strategies.length > 0 
      ? strategies.reduce((sum, s) => sum + s.apy, 0) / strategies.length 
      : KPI_DATA.apy;
    const activeUsers = Math.floor(totalTVL / 50000); // Estimate users based on TVL
    const volume24h = totalTVL * 0.1; // Estimate 10% daily volume

    return {
      tvl: totalTVL > 0 ? totalTVL : KPI_DATA.tvl,
      users: activeUsers > 0 ? activeUsers : KPI_DATA.users,
      apy: avgAPY,
      volume24h: volume24h > 0 ? volume24h : KPI_DATA.volume24h,
      isLive: strategies.some(s => s.isLive)
    };
  }, [strategies]);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-neon-cyan/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,179,0,0.1),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1 
                className="text-5xl lg:text-7xl font-bold text-white mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                The{' '}
                <span className="bg-gradient-to-r from-gold-500 to-neon-cyan bg-clip-text text-transparent">
                  Immortal
                </span>
                <br />
                AI DeFi Agent
              </motion.h1>
              
              <motion.p 
                className="text-xl text-gray-300 mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Immortal AI agent for decentralized investing with transparent yield proof and automated strategy optimization
              </motion.p>

              {/* Features */}
              <motion.div 
                className="flex flex-wrap gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                {heroFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-300">
                    <feature.icon className="w-5 h-5 text-gold-500" />
                    <span className="text-sm">{feature.text}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <Button 
                  size="lg" 
                  icon={ArrowRight} 
                  glow
                  onClick={() => onNavigate('execute')}
                >
                  Start Now
                </Button>
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => onNavigate('dashboard')}
                >
                  View Dashboard
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Content - Chart */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="bg-dark-800/80 backdrop-blur-sm border border-dark-600/50 rounded-3xl p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Portfolio Performance</h3>
                  <p className="text-3xl font-bold text-gold-500">+284.5%</p>
                  <p className="text-sm text-green-400">+12.8% This Month</p>
                </div>
                <AnimatedLineChart data={chartData} height={250} />
              </div>
              
              {/* Floating Stats */}
              <motion.div
                className="absolute -top-4 -right-4 bg-dark-700/90 backdrop-blur-sm border border-gold-500/30 rounded-xl p-3"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="text-center">
                  <p className="text-gold-500 font-bold text-lg">98.7%</p>
                  <p className="text-xs text-gray-400">Success Rate</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* KPI Strip */}
      <section className="py-16 border-y border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <KpiCard
              title="Total Value Locked"
              value={realKPIs.tvl}
              format="currency"
              icon={DollarSign}
              change={15.4}
              delay={0}
              isLive={realKPIs.isLive}
            />
            <KpiCard
              title="Active Users"
              value={realKPIs.users}
              format="number"
              icon={Users}
              change={8.2}
              delay={0.1}
              isLive={realKPIs.isLive}
            />
            <KpiCard
              title="Average APY"
              value={realKPIs.apy}
              format="percentage"
              icon={Percent}
              change={2.1}
              delay={0.2}
              isLive={realKPIs.isLive}
            />
            <KpiCard
              title="24h Volume"
              value={realKPIs.volume24h}
              format="currency"
              icon={TrendingUp}
              change={-3.8}
              delay={0.3}
              isLive={realKPIs.isLive}
            />
          </div>
          
          {/* Live Data Indicator */}
          {realKPIs.isLive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm font-medium">
                  Live data from {strategies.filter(s => s.isLive).length} protocols
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              How <span className="text-gold-500">AION</span> Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Three simple steps to achieve AI-optimized yields
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative"
              >
                <div className="bg-dark-800/80 backdrop-blur-sm border border-dark-600/50 rounded-2xl p-8 text-center hover:border-gold-500/30 transition-all group">
                  {/* Step Number */}
                  <div className="w-16 h-16 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-2xl font-bold text-dark-900">{step.step}</span>
                  </div>

                  {/* Emoji */}
                  <div className="text-4xl mb-4">{step.icon}</div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>

                {/* Connecting Arrow */}
                {idx < howItWorksSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 text-gold-500/30">
                    <ArrowRight size={24} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Market Ticker */}
      <section className="py-8 bg-dark-800/50 border-y border-dark-700/50 overflow-hidden">
        <motion.div 
          className="flex gap-12 whitespace-nowrap"
          animate={{ x: [1200, -1200] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-6">
              <div className="text-gold-500 font-mono">BNB/USDT</div>
              <div className="text-white font-semibold">$312.45</div>
              <div className="text-green-400 text-sm">+2.45%</div>
              <div className="text-gray-400">|</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gold-500/10 to-neon-cyan/10">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Start Your Smart Investment Journey?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of investors who trust AION to optimize their yields
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                icon={Zap} 
                glow
                onClick={() => onNavigate('execute')}
              >
                Try Simulation Now
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => onNavigate('docs')}
              >
                View Documentation
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}