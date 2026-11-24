export type FlightPhase =
  | 'PAD_READY'
  | 'COUNTDOWN'
  | 'IGNITION'
  | 'LIFTOFF'
  | 'TRANSONIC'
  | 'MAX_Q'
  | 'MECO'
  | 'STAGE_SEP'
  | 'STAGE_2_BURN'
  | 'ORBIT_INSERTION'
  | 'APOGEE_COAST'
  | 'BURNOUT'
  | 'CRITICAL_OVERHEAT'
  | 'EXPLOSION'
  | 'ABORTED';

export type CameraViewMode =
  | 'FOLLOW'
  | 'PAD_TRACK'
  | 'ENGINE_POV'
  | 'NOSE_POV'
  | 'FREE_ORBIT';

export interface RocketTelemetry {
  time: number; // seconds since ignition
  altitude: number; // meters
  velocity: number; // m/s
  acceleration: number; // m/s^2
  verticalSpeed: number; // m/s
  horizontalSpeed: number; // m/s
  mach: number;
  gForce: number;
  dynamicPressure: number; // Pascals (q = 0.5 * rho * v^2)
  maxQReached: boolean;
  maxQValue: number;
  apogee: number; // meters

  // Atmospheric physics
  ambientPressure: number; // bar
  airDensity: number; // kg/m^3
  ambientTemp: number; // Kelvin

  // Propulsion & Mass
  throttle: number; // 0.0 - 1.0
  thrust: number; // Newtons
  specificImpulse: number; // seconds (Isp)
  totalMass: number; // kg
  dryMass: number; // kg
  fuelMass: number; // kg (RP-1/Methane)
  oxidizerMass: number; // kg (LOX)
  initialPropellantMass: number; // kg
  fuelPercentage: number; // 0 - 100%
  massFlowRate: number; // kg/s
  twr: number; // Thrust to weight ratio

  // Coolant & Thermal Physics
  coolantFlowRate: number; // 0.0 - 1.2 (relative to nominal)
  coolantValveOpen: number; // 0 - 100%
  nozzleTemp: number; // Kelvin (nominal 700K - 1200K, dangerous >1650K, melt >2200K)
  chamberPressure: number; // bar
  coolantJacketTemp: number; // Kelvin
  thermalIntegrity: number; // 100% down to 0%
  isOverheating: boolean;
  isEngineExploded: boolean;

  // Staging
  currentStage: 1 | 2;
  stage1Separated: boolean;
  fairingSeparated: boolean;

  // Flight Phase
  phase: FlightPhase;
  phaseMessage: string;
}

export interface ImportedModelInfo {
  name: string;
  source: 'google-drive' | 'local-file' | 'preset';
  fileType: 'glb' | 'gltf' | 'obj' | 'stl' | 'custom';
  sizeBytes?: number;
  vertexCount: number;
  triangleCount: number;
  dimensions: { x: number; y: number; z: number }; // meters
  url?: string;
  isLoaded: boolean;
}
