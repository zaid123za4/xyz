import { RocketTelemetry, FlightPhase } from '../types/rocket';

// Real-world physical constants
export const G0 = 9.80665; // m/s^2 standard gravity
export const R_EARTH = 6371000; // Earth radius in meters
export const M_MOLAR_AIR = 0.0289644; // kg/mol
export const R_UNIVERSAL = 8.3144598; // J/(mol*K)
export const GAMMA_AIR = 1.4; // Heat capacity ratio for air

// Vehicle physical profile (Saturn / Starship class heavy rocket)
export const VEHICLE_CONFIG = {
  // Stage 1
  stage1: {
    dryMass: 85000, // kg
    fuelMass: 400000, // kg (RP-1 / Methane)
    oxidizerMass: 1000000, // kg (LOX)
    maxThrustSeaLevel: 34000000, // 34 MN (~7.6 million lbf)
    maxThrustVac: 37500000, // 37.5 MN
    ispSeaLevel: 310, // seconds
    ispVac: 348, // seconds
    crossSectionArea: 63.6, // m^2 (9m diameter)
    nominalCoolantFlow: 1200, // kg/s
    burnDuration: 165, // seconds nominal
  },
  // Stage 2
  stage2: {
    dryMass: 35000, // kg
    fuelMass: 100000, // kg
    oxidizerMass: 250000, // kg
    maxThrustVac: 7500000, // 7.5 MN
    ispVac: 380, // vacuum optimized
    crossSectionArea: 63.6, // m^2
    nominalCoolantFlow: 400, // kg/s
  },
  fairingMass: 4500, // kg
  cdSubsonic: 0.28,
  cdTransonic: 0.58, // Drag rise at Mach 0.9 - 1.2
  cdSupersonic: 0.35,
};

/**
 * Atmospheric physics model (US Standard Atmosphere approximation)
 */
export function getAtmosphericConditions(altitude: number): {
  pressure: number; // bar
  density: number; // kg/m^3
  temperature: number; // Kelvin
  speedOfSound: number; // m/s
} {
  const h = Math.max(0, altitude);

  let T = 288.15; // Sea level temp Kelvin
  let P = 1.01325; // Sea level pressure in bar
  let rho = 1.225; // Sea level density in kg/m^3

  if (h < 11000) {
    // Troposphere
    T = 288.15 - 0.0065 * h;
    P = 1.01325 * Math.pow(T / 288.15, 5.25588);
    rho = 1.225 * Math.pow(T / 288.15, 4.25588);
  } else if (h < 25000) {
    // Lower Stratosphere
    T = 216.65;
    P = 0.22632 * Math.exp(-0.0001577 * (h - 11000));
    rho = 0.36391 * Math.exp(-0.0001577 * (h - 11000));
  } else if (h < 85000) {
    // Upper Stratosphere / Mesosphere
    const hDiff = h - 25000;
    T = 216.65 + 0.0028 * Math.min(hDiff, 22000);
    P = 0.02488 * Math.exp(-0.00014 * hDiff);
    rho = (P * 100000 * M_MOLAR_AIR) / (R_UNIVERSAL * T);
  } else {
    // Exosphere / Space vacuum
    T = 180;
    P = 1e-9;
    rho = 1e-9;
  }

  const speedOfSound = Math.sqrt(GAMMA_AIR * (R_UNIVERSAL / M_MOLAR_AIR) * Math.max(100, T));

  return {
    pressure: Math.max(1e-9, P),
    density: Math.max(1e-9, rho),
    temperature: T,
    speedOfSound,
  };
}

/**
 * Aerodynamic Drag Coefficient based on Mach number
 */
export function getDragCoefficient(mach: number): number {
  if (mach < 0.8) {
    return VEHICLE_CONFIG.cdSubsonic;
  } else if (mach <= 1.2) {
    // Transonic drag rise (wave drag peak)
    const factor = (mach - 0.8) / 0.4;
    return VEHICLE_CONFIG.cdSubsonic + (VEHICLE_CONFIG.cdTransonic - VEHICLE_CONFIG.cdSubsonic) * Math.sin(factor * Math.PI * 0.5);
  } else {
    // Supersonic decay back down
    const factor = Math.min(1.0, (mach - 1.2) / 3.0);
    return VEHICLE_CONFIG.cdTransonic - (VEHICLE_CONFIG.cdTransonic - VEHICLE_CONFIG.cdSupersonic) * factor;
  }
}

/**
 * Computes initial baseline telemetry
 */
export function createInitialTelemetry(): RocketTelemetry {
  const initialProp =
    VEHICLE_CONFIG.stage1.fuelMass +
    VEHICLE_CONFIG.stage1.oxidizerMass +
    VEHICLE_CONFIG.stage2.fuelMass +
    VEHICLE_CONFIG.stage2.oxidizerMass;

  const totalMass =
    VEHICLE_CONFIG.stage1.dryMass +
    VEHICLE_CONFIG.stage2.dryMass +
    VEHICLE_CONFIG.fairingMass +
    initialProp;

  const atmo = getAtmosphericConditions(0);

  return {
    time: 0,
    altitude: 0,
    velocity: 0,
    acceleration: 0,
    verticalSpeed: 0,
    horizontalSpeed: 0,
    mach: 0,
    gForce: 1.0,
    dynamicPressure: 0,
    maxQReached: false,
    maxQValue: 0,
    apogee: 0,

    ambientPressure: atmo.pressure,
    airDensity: atmo.density,
    ambientTemp: atmo.temperature,

    throttle: 1.0,
    thrust: 0,
    specificImpulse: VEHICLE_CONFIG.stage1.ispSeaLevel,
    totalMass,
    dryMass: VEHICLE_CONFIG.stage1.dryMass + VEHICLE_CONFIG.stage2.dryMass + VEHICLE_CONFIG.fairingMass,
    fuelMass: VEHICLE_CONFIG.stage1.fuelMass + VEHICLE_CONFIG.stage2.fuelMass,
    oxidizerMass: VEHICLE_CONFIG.stage1.oxidizerMass + VEHICLE_CONFIG.stage2.oxidizerMass,
    initialPropellantMass: initialProp,
    fuelPercentage: 100,
    massFlowRate: 0,
    twr: 0,

    coolantFlowRate: 1.0,
    coolantValveOpen: 100,
    nozzleTemp: 320, // K (ambient chill)
    chamberPressure: 0,
    coolantJacketTemp: 290,
    thermalIntegrity: 100,
    isOverheating: false,
    isEngineExploded: false,

    currentStage: 1,
    stage1Separated: false,
    fairingSeparated: false,

    phase: 'PAD_READY',
    phaseMessage: 'Ready on launch pad. Cryogenic systems chilled.',
  };
}

/**
 * Core Physics Step - Numerically integrates 6-DOF / trajectory equations with real thermodynamics
 */
export function stepRocketPhysics(
  prev: RocketTelemetry,
  dt: number,
  controls: {
    throttle: number;
    coolantValve: number; // 0 - 100
    gimbalPitch: number; // degrees (-5 to +5)
    gimbalYaw: number;
    triggerStage: boolean;
    triggerAbort: boolean;
  }
): RocketTelemetry {
  if (prev.phase === 'EXPLOSION' || prev.phase === 'ABORTED') {
    return prev;
  }

  // Handle Abort
  if (controls.triggerAbort) {
    return {
      ...prev,
      phase: 'ABORTED',
      phaseMessage: 'MISSION ABORTED. Main engines commanded shutdown.',
      throttle: 0,
      thrust: 0,
      massFlowRate: 0,
    };
  }

  let nextPhase: FlightPhase = prev.phase;
  let phaseMessage = prev.phaseMessage;
  let currentStage = prev.currentStage;
  let stage1Separated = prev.stage1Separated;
  let fairingSeparated = prev.fairingSeparated;

  // Staging logic
  if (controls.triggerStage && currentStage === 1 && !stage1Separated) {
    currentStage = 2;
    stage1Separated = true;
    nextPhase = 'STAGE_SEP';
    phaseMessage = 'Stage 1 Booster Separated. Stage 2 vacuum engine online.';
  }

  // Atmospheric properties at current altitude
  const atmo = getAtmosphericConditions(prev.altitude);

  // Auto Fairing separation above 105 km (space boundary)
  if (!fairingSeparated && prev.altitude > 105000) {
    fairingSeparated = true;
    phaseMessage = 'Payload fairing jettisoned above Kármán line.';
  }

  // Propulsion calculation depending on stage
  const stageConfig = currentStage === 1 ? VEHICLE_CONFIG.stage1 : VEHICLE_CONFIG.stage2;
  const isStageActive = currentStage === 1 ? !stage1Separated : true;

  // Propellant check
  const hasPropellant = prev.fuelMass > 50 && prev.oxidizerMass > 100;
  const targetThrottle = hasPropellant && isStageActive && prev.phase !== 'PAD_READY' ? controls.throttle : 0;

  // Specific Impulse based on ambient pressure
  let effectiveIsp = stageConfig.ispVac;
  if (currentStage === 1) {
    const pressureRatio = Math.min(1.0, atmo.pressure / 1.01325);
    effectiveIsp = VEHICLE_CONFIG.stage1.ispVac - (VEHICLE_CONFIG.stage1.ispVac - VEHICLE_CONFIG.stage1.ispSeaLevel) * pressureRatio;
  }

  // Thrust in Newtons
  const maxThrust = currentStage === 1
    ? (atmo.pressure > 0.1 ? VEHICLE_CONFIG.stage1.maxThrustSeaLevel : VEHICLE_CONFIG.stage1.maxThrustVac)
    : VEHICLE_CONFIG.stage2.maxThrustVac;

  const currentThrust = targetThrottle * maxThrust * (effectiveIsp / stageConfig.ispVac);

  // Mass flow rate: m_dot = F / (g0 * Isp)
  const massFlowRate = currentThrust > 0 ? currentThrust / (G0 * effectiveIsp) : 0;
  const massBurned = massFlowRate * dt;

  // O:F ratio is 2.5:1 (LOX to Fuel)
  const fuelBurned = Math.min(prev.fuelMass, massBurned * (1.0 / 3.5));
  const oxBurned = Math.min(prev.oxidizerMass, massBurned * (2.5 / 3.5));

  const newFuelMass = Math.max(0, prev.fuelMass - fuelBurned);
  const newOxMass = Math.max(0, prev.oxidizerMass - oxBurned);
  const remainingPropellant = newFuelMass + newOxMass;
  const fuelPercentage = (remainingPropellant / prev.initialPropellantMass) * 100;

  // Dry mass calculation based on separated stages
  let activeDryMass = VEHICLE_CONFIG.stage2.dryMass;
  if (!stage1Separated) activeDryMass += VEHICLE_CONFIG.stage1.dryMass;
  if (!fairingSeparated) activeDryMass += VEHICLE_CONFIG.fairingMass;

  const currentTotalMass = activeDryMass + remainingPropellant;

  // Coolant & Thermal Physics
  const coolantValveOpen = controls.coolantValve;
  const coolantFlowRatio = coolantValveOpen / 100.0; // 0.0 to 1.2
  const chamberPressure = targetThrottle * (currentStage === 1 ? 220 : 150); // bar

  // Heat generated by combustion
  const heatGeneratedMW = targetThrottle > 0 ? (targetThrottle * 85.0 * (chamberPressure / 200.0)) : 0;

  // Heat removed by regenerative cooling channels
  const heatRemovedMW = coolantFlowRatio * 75.0 * Math.max(0.1, (prev.nozzleTemp - 300) / 1000.0);

  // Temperature derivative (Thermal capacity of regenerative inconel/copper jacket)
  const thermalInertia = 0.08; // K/MJ
  const deltaTemp = (heatGeneratedMW - heatRemovedMW) * thermalInertia * dt;
  const ambientCooling = (prev.nozzleTemp - atmo.temperature) * 0.02 * dt;

  let newNozzleTemp = Math.max(atmo.temperature, prev.nozzleTemp + deltaTemp - ambientCooling);
  let thermalIntegrity = prev.thermalIntegrity;
  let isOverheating = false;
  let isEngineExploded = false;

  // Overheating thresholds
  if (newNozzleTemp > 1650) {
    isOverheating = true;
    // Structural erosion when over threshold
    const erosionRate = Math.pow((newNozzleTemp - 1650) / 300, 2) * 5.0 * dt;
    thermalIntegrity = Math.max(0, thermalIntegrity - erosionRate);

    if (thermalIntegrity <= 0 || newNozzleTemp >= 2350) {
      isEngineExploded = true;
      return {
        ...prev,
        phase: 'EXPLOSION',
        phaseMessage: 'CATASTROPHIC ENGINE FAILURE: Regenerative cooling starved. Nozzle burn-through detonation!',
        nozzleTemp: 3200,
        thermalIntegrity: 0,
        isEngineExploded: true,
        thrust: 0,
        acceleration: 0,
      };
    }
  } else {
    // Normal cooling recovery
    thermalIntegrity = Math.min(100, thermalIntegrity + 0.5 * dt);
  }

  // Aerodynamics
  const speedOfSound = atmo.speedOfSound;
  const mach = prev.velocity / speedOfSound;
  const cd = getDragCoefficient(mach);
  const dynamicPressure = 0.5 * atmo.density * Math.pow(prev.velocity, 2); // Pascals

  let maxQReached = prev.maxQReached;
  let maxQValue = Math.max(prev.maxQValue, dynamicPressure);

  if (!maxQReached && dynamicPressure > 35000 && dynamicPressure < prev.dynamicPressure) {
    maxQReached = true;
  }

  const dragForce = dynamicPressure * cd * stageConfig.crossSectionArea;

  // Gravity with altitude decay: g(h) = g0 * (R / (R + h))^2
  const localGravity = G0 * Math.pow(R_EARTH / (R_EARTH + prev.altitude), 2);

  // Flight angle (gravity turn curve based on altitude)
  // At launch: 90 deg (vertical). Curves gradually to horizontal orbital insertion
  const pitchAngleDeg = Math.max(5, 90 - Math.pow(Math.min(1.0, prev.altitude / 140000), 0.6) * 80);
  const pitchRad = (pitchAngleDeg * Math.PI) / 180.0;

  // Net acceleration: F_net = Thrust - Drag - m*g*sin(pitch)
  const thrustEffective = currentThrust * (thermalIntegrity / 100.0);
  const netForceAlongFlightPath = thrustEffective - dragForce - currentTotalMass * localGravity * Math.sin(pitchRad);
  const netAcceleration = netForceAlongFlightPath / currentTotalMass;

  // Integration
  let newVelocity = Math.max(0, prev.velocity + netAcceleration * dt);
  const verticalVelocity = newVelocity * Math.sin(pitchRad);
  const horizontalVelocity = newVelocity * Math.cos(pitchRad);

  let newAltitude = Math.max(0, prev.altitude + verticalVelocity * dt);
  const newTime = prev.time + dt;

  // Apogee estimate (v^2 / (2g))
  const newApogee = Math.max(newAltitude, newAltitude + Math.pow(verticalVelocity, 2) / (2 * localGravity));

  // Thrust-to-weight ratio (TWR)
  const currentWeight = currentTotalMass * localGravity;
  const twr = currentWeight > 0 ? thrustEffective / currentWeight : 0;
  const gForce = (netAcceleration + localGravity) / G0;

  // Automatic phase detection
  if (prev.phase === 'PAD_READY') {
    if (controls.throttle > 0.1) {
      nextPhase = 'IGNITION';
      phaseMessage = 'Main Engine Ignition sequence initialized.';
    }
  } else if (prev.phase === 'IGNITION') {
    if (twr > 1.05 && newAltitude > 1.0) {
      nextPhase = 'LIFTOFF';
      phaseMessage = 'LIFTOFF! Vehicle has cleared the tower.';
    }
  } else if (prev.phase === 'LIFTOFF') {
    if (mach >= 0.95 && mach <= 1.15) {
      nextPhase = 'TRANSONIC';
      phaseMessage = 'Approaching Mach 1. Transonic condensation shock cone visible.';
    } else if (dynamicPressure > 32000 && !maxQReached) {
      nextPhase = 'MAX_Q';
      phaseMessage = 'Vehicle passing through MAX-Q (Maximum Dynamic Pressure).';
    }
  } else if (prev.phase === 'TRANSONIC') {
    if (mach > 1.2) {
      nextPhase = dynamicPressure > 32000 ? 'MAX_Q' : 'LIFTOFF';
      phaseMessage = 'Supersonic flight established. Accelerating into upper atmosphere.';
    }
  } else if (prev.phase === 'MAX_Q') {
    if (dynamicPressure < 25000) {
      nextPhase = 'LIFTOFF';
      phaseMessage = 'Max-Q passed. Aerodynamic stress easing. Rocket entering thin mesosphere.';
    }
  }

  // Auto MECO when Stage 1 propellant is empty
  if (currentStage === 1 && remainingPropellant <= (VEHICLE_CONFIG.stage2.fuelMass + VEHICLE_CONFIG.stage2.oxidizerMass + 50)) {
    if (!stage1Separated) {
      nextPhase = 'MECO';
      phaseMessage = 'MECO: Main Engine Cutoff. Stage 1 propellant depleted.';
    }
  }

  // Orbit insertion
  if (newAltitude > 185000 && newVelocity > 7600) {
    nextPhase = 'ORBIT_INSERTION';
    phaseMessage = 'Orbital velocity reached (Mach ~23). Stable Low Earth Orbit confirmed!';
  }

  return {
    time: newTime,
    altitude: newAltitude,
    velocity: newVelocity,
    acceleration: netAcceleration,
    verticalSpeed: verticalVelocity,
    horizontalSpeed: horizontalVelocity,
    mach,
    gForce,
    dynamicPressure,
    maxQReached,
    maxQValue,
    apogee: newApogee,

    ambientPressure: atmo.pressure,
    airDensity: atmo.density,
    ambientTemp: atmo.temperature,

    throttle: targetThrottle,
    thrust: thrustEffective,
    specificImpulse: effectiveIsp,
    totalMass: currentTotalMass,
    dryMass: activeDryMass,
    fuelMass: newFuelMass,
    oxidizerMass: newOxMass,
    initialPropellantMass: prev.initialPropellantMass,
    fuelPercentage,
    massFlowRate,
    twr,

    coolantFlowRate: coolantFlowRatio,
    coolantValveOpen,
    nozzleTemp: newNozzleTemp,
    chamberPressure,
    coolantJacketTemp: Math.min(newNozzleTemp - 150, 450),
    thermalIntegrity,
    isOverheating,
    isEngineExploded,

    currentStage,
    stage1Separated,
    fairingSeparated,

    phase: nextPhase,
    phaseMessage,
  };
}
