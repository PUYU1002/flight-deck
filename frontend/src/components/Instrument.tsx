
import React from 'react';
import { UIComponentConfig, ComponentId } from '../types';
import { COMPONENT_METADATA } from '../constants';

interface InstrumentProps {
  config: UIComponentConfig;
  value: string | number;
  theme: 'dark' | 'light';
}

export const Instrument: React.FC<InstrumentProps> = ({ config, value, theme }) => {
  if (!config.visible) return null;

  const isDark = theme === 'dark';
  const meta = COMPONENT_METADATA[config.id as ComponentId];
  
  // Dynamic styles based on config
  const style: React.CSSProperties = {
    color: config.color || (isDark ? '#e2e8f0' : '#1e293b'),
    backgroundColor: config.bgColor || (isDark ? '#1e293b' : '#f1f5f9'),
    transform: `scale(${config.scale || 1})`,
    transformOrigin: 'top left',
    borderColor: config.isCore ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent',
  };

  const numValue = typeof value === 'number' ? value : 0;
  const max = meta?.max || 100;
  const min = meta?.min || 0;
  const percentage = Math.min(100, Math.max(0, ((numValue - min) / (max - min)) * 100));

  const renderVisuals = () => {
    switch (config.visualizationType) {
      case 'bar':
        return (
          <div className="w-full mt-2 h-4 bg-gray-500/20 rounded-full overflow-hidden relative">
            <div 
              className="h-full transition-all duration-500 ease-out"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: config.color || (isDark ? '#38bdf8' : '#0284c7')
              }}
            />
          </div>
        );
      case 'ring':
        // Simple SVG Gauge
        const radius = 36;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        return (
          <div className="absolute right-2 top-8 w-16 h-16 opacity-80">
            <svg className="transform -rotate-90 w-full h-full">
               <circle
                cx="32" cy="32" r={radius}
                stroke="currentColor" strokeWidth="4" fill="transparent"
                className="opacity-20"
               />
               <circle
                cx="32" cy="32" r={radius}
                stroke="currentColor" strokeWidth="4" fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-500 ease-out"
               />
            </svg>
          </div>
        );
      case 'text':
      default:
        return null;
    }
  };

  return (
    <div 
      className={`
        relative p-4 rounded-lg shadow-md border-l-4 transition-all duration-300 ease-in-out
        flex flex-col justify-between
        min-w-[160px] min-h-[110px]
      `}
      style={style}
    >
      <div 
         // Force text color inheritance but allow opacity
         className="text-xs uppercase tracking-wider font-semibold mb-1 z-10"
         style={{ opacity: 0.7 }}
      >
        {config.label || meta?.label || config.id}
      </div>
      
      <div className="flex items-end gap-1 z-10">
         <span className="text-3xl font-mono font-bold leading-none">
          {value}
         </span>
         {config.visualizationType === 'text' && meta?.unit && (
           <span className="text-sm font-mono opacity-60 mb-1">{meta.unit}</span>
         )}
      </div>

      {renderVisuals()}

      {config.isCore && (
        <div className="absolute top-2 right-2">
           <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
        </div>
      )}
    </div>
  );
};
