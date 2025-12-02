
export interface FlightData {
  rpm: number;
  altitude: number;
  airspeed: number;
  fuel: number;
  phase: 'TAXING' | 'TAKEOFF' | 'CRUISE' | 'LANDING';
}

export type Zone = 'primary' | 'secondary'; // Primary = Top (Safe), Secondary = Bottom
export type ComponentId = 'rpm' | 'altitude' | 'airspeed' | 'phase' | 'fuel';
export type VisualizationType = 'text' | 'bar' | 'ring';

export interface UIComponentConfig {
  id: ComponentId;
  label: string;
  visible: boolean;
  zone: Zone;
  order: number;
  color?: string; // Hex or tailwind class override
  bgColor?: string;
  scale?: number; // 1 = normal, 1.5 = large
  isCore: boolean; // Constraint: Core cannot be hidden
  visualizationType?: VisualizationType;
}

export interface UIState {
  theme: 'dark' | 'light';
  components: UIComponentConfig[];
}

export interface AgentResponse {
  success: boolean;
  message?: string; // Error message or confirmation
  updatedConfig?: Partial<UIState>; // The agent returns the changes to be merged
}
