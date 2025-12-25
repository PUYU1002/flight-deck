import React, { useRef, useEffect, useState, useMemo } from 'react';
import { FlightData, UIState, UIComponentConfig } from '../types';
import { Instrument } from './Instrument';
import { calculateLayout, ComponentLayout } from '../utils/layoutEngine';

interface CockpitDisplayProps {
  flightData: FlightData;
  uiState: UIState;
}

export const CockpitDisplay: React.FC<CockpitDisplayProps> = ({ flightData, uiState }) => {
  // Sort components by order and filter by zone
  // 使用 JSON.stringify 确保任何属性变化（包括 scale）都能触发重新计算
  const { primaryComponents, secondaryComponents } = useMemo(() => {
    const sortedComponents = [...uiState.components].sort((a, b) => a.order - b.order);
    return {
      primaryComponents: sortedComponents.filter(c => c.zone === 'primary' && c.visible),
      secondaryComponents: sortedComponents.filter(c => c.zone === 'secondary' && c.visible),
    };
  }, [JSON.stringify(uiState.components.map(c => ({
    id: c.id,
    scale: c.scale,
    order: c.order,
    zone: c.zone,
    visible: c.visible
  })))]);

  // Refs for container measurements
  const primaryZoneRef = useRef<HTMLDivElement>(null);
  const secondaryZoneRef = useRef<HTMLDivElement>(null);

  // State for layouts
  const [primaryLayouts, setPrimaryLayouts] = useState<ComponentLayout[]>([]);
  const [secondaryLayouts, setSecondaryLayouts] = useState<ComponentLayout[]>([]);

  // Calculate layouts when components or container size changes
  useEffect(() => {
    const updateLayouts = () => {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        let computedPrimaryLayouts: ComponentLayout[] = [];

        if (primaryZoneRef.current) {
          const rect = primaryZoneRef.current.getBoundingClientRect();
          const contentWidth = rect.width - 32; // 减去 padding (p-4 = 16px * 2)
          const contentHeight = rect.height - 80; // 减去 header 和 padding
          if (contentWidth > 0 && contentHeight > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 重新计算 Primary Zone 布局', {
                containerSize: `${contentWidth} × ${contentHeight}`,
                components: primaryComponents.map(c => ({
                  id: c.id,
                  scale: c.scale || 1,
                  order: c.order,
                })),
              });
            }
            computedPrimaryLayouts = calculateLayout(
              primaryComponents,
              contentWidth,
              contentHeight,
              'grid'
            );
            setPrimaryLayouts(computedPrimaryLayouts);
          }
        }

        if (secondaryZoneRef.current) {
          const rect = secondaryZoneRef.current.getBoundingClientRect();
          const contentWidth = rect.width - 32;
          const contentHeight = rect.height - 80;
          if (contentWidth > 0 && contentHeight > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 重新计算 Secondary Zone 布局', {
                containerSize: `${contentWidth} × ${contentHeight}`,
                components: secondaryComponents.map(c => ({
                  id: c.id,
                  scale: c.scale || 1,
                  order: c.order,
                })),
              });
            }
            // 使用 grid 布局，使间距与 Primary Zone 一致
            const layouts = calculateLayout(
              secondaryComponents,
              contentWidth,
              contentHeight,
              'grid',
              computedPrimaryLayouts
            );
            setSecondaryLayouts(layouts);
          }
        }
      });
    };

    // 立即更新一次
    updateLayouts();

    // 监听窗口大小变化
    window.addEventListener('resize', updateLayouts);
    return () => window.removeEventListener('resize', updateLayouts);
  }, [primaryComponents, secondaryComponents]);

  const getValue = (id: string): string | number => {
    const value = flightData[id as keyof FlightData];
    // 处理 undefined 值，返回默认值
    if (value === undefined) {
      return 0;
    }
    return value;
  };

  const getLayout = (componentId: string, zone: 'primary' | 'secondary'): ComponentLayout | undefined => {
    const layouts = zone === 'primary' ? primaryLayouts : secondaryLayouts;
    return layouts.find(l => l.id === componentId);
  };

  const isDark = uiState.theme === 'dark';

  return (
    <div className={`flex flex-col h-full w-full p-6 gap-6 transition-colors duration-500 ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>

      {/* Primary Zone (Safety Critical) */}
      <div
        ref={primaryZoneRef}
        className={`flex-1 rounded-xl border-2 border-dashed p-4 transition-all duration-300 relative overflow-hidden ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-300 bg-white/50'}`}
      >
        <h3 className="text-xs uppercase tracking-widest opacity-50 mb-4 font-bold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          Primary Flight Display (Core)
        </h3>
        <div className="relative w-full h-[calc(100%-3rem)]">
          {primaryComponents.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center py-10 opacity-30 italic">
              No Primary Instruments
            </div>
          ) : (
            primaryComponents.map((comp) => {
              const layout = getLayout(comp.id, 'primary');
              if (!layout) return null;

              return (
                <div
                  key={comp.id}
                  className="absolute transition-all duration-500 ease-in-out"
                  style={{
                    left: `${layout.x}px`,
                    top: `${layout.y}px`,
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                  }}
                >
                  <Instrument
                    config={comp}
                    value={getValue(comp.id)}
                    theme={uiState.theme}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Secondary Zone (Auxiliary) */}
      <div
        ref={secondaryZoneRef}
        className={`flex-1 rounded-xl border-2 border-dashed p-4 transition-all duration-300 relative overflow-hidden ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-white/30'}`}
      >
        <h3 className="text-xs uppercase tracking-widest opacity-50 mb-4 font-bold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Auxiliary Display
        </h3>
        <div className="relative w-full h-[calc(100%-3rem)]">
          {secondaryComponents.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center py-10 opacity-30 italic">
              No Auxiliary Instruments
            </div>
          ) : (
            secondaryComponents.map((comp) => {
              const layout = getLayout(comp.id, 'secondary');
              if (!layout) return null;

              return (
                <div
                  key={comp.id}
                  className="absolute transition-all duration-500 ease-in-out"
                  style={{
                    left: `${layout.x}px`,
                    top: `${layout.y}px`,
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                  }}
                >
                  <Instrument
                    config={comp}
                    value={getValue(comp.id)}
                    theme={uiState.theme}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};