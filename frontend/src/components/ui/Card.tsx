import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  glow?: boolean;
  hover?: boolean;
}

export function Card({ 
  children, 
  glass = true, 
  glow = false, 
  hover = true,
  className, 
  ...props 
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -5, scale: 1.02 } : undefined}
      className={cn(
        'rounded-2xl p-6 border transition-all duration-300',
        glass && 'bg-dark-800/80 backdrop-blur-sm border-dark-600/50',
        glow && 'shadow-lg hover:shadow-gold-500/20',
        'hover:border-gold-500/30',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}