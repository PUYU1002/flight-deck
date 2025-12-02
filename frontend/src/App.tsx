import React, { useState, useEffect } from 'react';
import { CockpitDisplay } from './components/CockpitDisplay';
import { CommandInput } from './components/CommandInput';
import { INITIAL_FLIGHT_DATA, INITIAL_UI_STATE } from './constants';
import { FlightData, UIState } from './types';
import { processCommandWithAgent } from './services/geminiService';

const App: React.FC = () => {
  const [flightData, setFlightData] = useState<FlightData>(INITIAL_FLIGHT_DATA);
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // Simulate incoming flight data stream
  useEffect(() => {
    const interval = setInterval(() => {
      setFlightData(prev => ({
        ...prev,
        altitude: prev.altitude + (Math.random() > 0.5 ? 10 : -10),
        airspeed: prev.airspeed + (Math.random() > 0.5 ? 1 : -1),
        rpm: prev.rpm + (Math.random() > 0.5 ? 50 : -50),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = async (command: string) => {
    setIsProcessing(true);
    setLastMessage(null);
    setIsError(false);

    // Call the Gemini Agent Service (mimics the Python Backend Agent)
    const result = await processCommandWithAgent(command, uiState);

    if (result.success && result.newState) {
      setUiState(result.newState);
      setLastMessage(result.message || "Configuration updated successfully.");
    } else {
      setIsError(true);
      setLastMessage(result.message || "Failed to update configuration.");
    }

    setIsProcessing(false);
  };

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans ${uiState.theme === 'dark' ? 'dark' : ''}`}>

      {/* Header / Status Bar */}
      <header className={`px-6 py-3 flex justify-between items-center z-10 shadow-sm ${uiState.theme === 'dark' ? 'bg-slate-900 text-slate-400 border-b border-slate-800' : 'bg-white text-slate-500 border-b border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <h1 className="font-bold text-sm tracking-widest uppercase">Flight Deck OS <span className="text-xs opacity-50 ml-2">v0.1.2 (Demo)</span></h1>
        </div>
        <div className="text-xs font-mono">
          System Status: <span className="text-green-500">NOMINAL</span>
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 overflow-hidden relative">
        <CockpitDisplay flightData={flightData} uiState={uiState} />

        {/* Feedback Message Overlay */}
        {lastMessage && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full shadow-xl text-sm font-semibold transition-opacity duration-500 animate-bounce ${isError ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
            }`}>
            {lastMessage}
          </div>
        )}
      </main>

      {/* Input Area */}
      <CommandInput
        onCommand={handleCommand}
        isProcessing={isProcessing}
        theme={uiState.theme}
      />

      {/* Disclaimer for Thesis Presentation context */}
      <div className={`text-[10px] text-center py-1 ${uiState.theme === 'dark' ? 'bg-slate-950 text-slate-600' : 'bg-slate-200 text-slate-400'}`}>
        Thesis Demo: Python Backend Logic simulated via Client-Side Gemini Agent for portability.
      </div>
    </div>
  );
};

export default App;