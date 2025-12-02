import { FlightData, UIState, ComponentId } from './types';

export const INITIAL_FLIGHT_DATA: FlightData = {
  rpm: 6500,
  altitude: 35000,
  airspeed: 520,
  fuel: 75,
  phase: 'CRUISE',
};

export const COMPONENT_METADATA: Record<ComponentId, { min: number; max: number; label: string; defaultVis: 'text' | 'bar' | 'ring'; unit?: string }> = {
  rpm: { min: 0, max: 10000, label: 'Engine RPM', defaultVis: 'ring', unit: 'RPM' },
  altitude: { min: 0, max: 60000, label: 'Altitude (ft)', defaultVis: 'text', unit: 'ft' },
  airspeed: { min: 0, max: 1000, label: 'Airspeed (mph)', defaultVis: 'text', unit: 'mph' },
  fuel: { min: 0, max: 100, label: 'Fuel Level (%)', defaultVis: 'bar', unit: '%' },
  phase: { min: 0, max: 0, label: 'Flight Phase', defaultVis: 'text' },
};

export const INITIAL_UI_STATE: UIState = {
  theme: 'dark',
  components: [
    { id: 'altitude', label: 'Altitude (ft)', visible: true, zone: 'primary', order: 1, isCore: true, scale: 1, visualizationType: 'text' },
    { id: 'airspeed', label: 'Airspeed (mph)', visible: true, zone: 'primary', order: 2, isCore: true, scale: 1, visualizationType: 'text' },
    { id: 'rpm', label: 'Engine RPM', visible: true, zone: 'primary', order: 3, isCore: true, scale: 1, visualizationType: 'ring' },
    { id: 'phase', label: 'Flight Phase', visible: true, zone: 'primary', order: 4, isCore: true, scale: 1, visualizationType: 'text' },
    { id: 'fuel', label: 'Fuel Level (%)', visible: true, zone: 'secondary', order: 5, isCore: false, scale: 1, visualizationType: 'bar' },
  ],
};