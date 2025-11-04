import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: any[];
  color?: string;
  height?: number;
  showGrid?: boolean;
}

export function AnimatedLineChart({ 
  data, 
  color = '#23F0C7', 
  height = 300, 
  showGrid = true 
}: LineChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#2A2A35" 
              opacity={0.3} 
            />
          )}
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A22',
              border: '1px solid #F5B300',
              borderRadius: '12px',
              boxShadow: '0 0 20px rgba(245, 179, 0, 0.3)',
            }}
            labelStyle={{ color: '#F5B300' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ 
              r: 6, 
              stroke: color, 
              strokeWidth: 2,
              fill: color,
              filter: 'drop-shadow(0 0 6px currentColor)'
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}