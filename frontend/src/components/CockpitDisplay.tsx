import React from 'react';
import { FlightData, UIState, UIComponentConfig } from '../types';
import { Instrument } from './Instrument';

interface CockpitDisplayProps {
  flightData: FlightData;
  uiState: UIState;
}

export const CockpitDisplay: React.FC<CockpitDisplayProps> = ({ flightData, uiState }) => {
  // Sort components by order
  const sortedComponents = [...uiState.components].sort((a, b) => a.order - b.order);

  const primaryComponents = sortedComponents.filter(c => c.zone === 'primary');
  const secondaryComponents = sortedComponents.filter(c => c.zone === 'secondary');

  const getValue = (id: string) => {
    return flightData[id as keyof FlightData];
  };

  const isDark = uiState.theme === 'dark';

  return (
    <div className={`flex flex-col h-full w-full p-6 gap-6 transition-colors duration-500 ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* Primary Zone (Safety Critical) */}
      <div className={`flex-1 rounded-xl border-2 border-dashed p-4 transition-all duration-300 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-300 bg-white/50'}`}>
        <h3 className="text-xs uppercase tracking-widest opacity-50 mb-4 font-bold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          Primary Flight Display (Core)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {primaryComponents.map((comp) => (
            <div key={comp.id} className="transition-all duration-500" style={{ order: comp.order }}>
              <Instrument 
                config={comp} 
                value={getValue(comp.id)} 
                theme={uiState.theme}
              />
            </div>
          ))}
          {primaryComponents.length === 0 && (
            <div className="col-span-full text-center py-10 opacity-30 italic">No Primary Instruments</div>
          )}
        </div>
      </div>

      {/* Secondary Zone (Auxiliary) */}
      <div className={`flex-1 rounded-xl border-2 border-dashed p-4 transition-all duration-300 ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-white/30'}`}>
        <h3 className="text-xs uppercase tracking-widest opacity-50 mb-4 font-bold flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
           Auxiliary Display
        </h3>
        <div className="flex flex-wrap gap-4">
          {secondaryComponents.map((comp) => (
            <div key={comp.id} className="transition-all duration-500" style={{ order: comp.order }}>
              <Instrument 
                config={comp} 
                value={getValue(comp.id)} 
                theme={uiState.theme}
              />
            </div>
          ))}
          {secondaryComponents.length === 0 && (
            <div className="w-full text-center py-10 opacity-30 italic">No Auxiliary Instruments</div>
          )}
        </div>
      </div>

    </div>
  );
};