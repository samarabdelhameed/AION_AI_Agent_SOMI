import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
}

export function DonutChart({ data, height = 300 }: DonutChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke={entry.color}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A22',
              border: '1px solid #F5B300',
              borderRadius: '12px',
              boxShadow: '0 0 20px rgba(245, 179, 0, 0.3)',
            }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Share']}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}