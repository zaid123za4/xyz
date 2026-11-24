import React from 'react';
import { RocketTelemetry } from '../types/rocket';
import {
  Flame,
  Thermometer,
  Droplet,
  Power,
  RotateCcw,
  AlertOctagon,
  ChevronUp,
} from 'lucide-react';

interface Props {
  telemetry: RocketTelemetry;
  throttle: number;
  onThrottleChange: (val: number) => void;
  coolantValve: number;
  onCoolantChange: (val: number) => void;
  onLaunch: () => void;
  onStage: () => void;
  onAbort: () => void;
  onReset: () => void;
}

export const CoolantPropulsionDeck: React.FC<Props> = ({
  telemetry,
  throttle,
  onThrottleChange,
  coolantValve,
  onCoolantChange,
  onLaunch,
  onStage,
  onAbort,
  onReset,
}) => {
  // Thermal color gradient based on nozzle temperature
  const getTempColor = (kelvin: number) => {
    if (kelvin < 900) return 'text-emerald-400';
    if (kelvin < 1300) return 'text-amber-400';
    if (kelvin < 1650) return 'text-orange-500';
    return 'text-rose-500 animate-pulse';
  };

  const getIntegrityBarColor = (integrity: number) => {
    if (integrity > 70) return 'bg-emerald-500';
    if (integrity > 35) return 'bg-amber-500';
    return 'bg-rose-500 animate-pulse';
  };

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 p-4 font-mono select-none shadow-2xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* 1. Regenerative Coolant System */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shadow-inner flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5" /> REGEN COOLANT LOOP
            </span>
            <span className="text-xs font-black text-cyan-300">
              {coolantValve}% FLOW
            </span>
          </div>

          {/* Coolant Slider */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="120"
              value={coolantValve}
              onChange={(e) => onCoolantChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Thermal Diagnostics */}
          <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-slate-800/60">
            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Thermometer className="w-3 h-3" /> NOZZLE TEMP
              </div>
              <div className={`text-sm font-black ${getTempColor(telemetry.nozzleTemp)}`}>
                {Math.round(telemetry.nozzleTemp)} K
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">NOZZLE INTEGRITY</div>
              <div className="text-sm font-bold text-slate-200">
                {Math.round(telemetry.thermalIntegrity)}%
              </div>
            </div>
          </div>

          {/* Structural Integrity Progress Bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${getIntegrityBarColor(
                telemetry.thermalIntegrity
              )}`}
              style={{ width: `${Math.max(0, telemetry.thermalIntegrity)}%` }}
            />
          </div>
        </div>

        {/* 2. Propellant & Tank Levels */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shadow-inner flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> PROPELLANT DYNAMICS
            </span>
            <span className="text-xs font-black text-amber-300">
              {telemetry.fuelPercentage.toFixed(1)}% TOTAL
            </span>
          </div>

          {/* LOX Tank Bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>LOX (OXIDIZER)</span>
              <span>{(telemetry.oxidizerMass / 1000).toFixed(1)} t</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full transition-all duration-150"
                style={{
                  width: `${Math.max(
                    0,
                    (telemetry.oxidizerMass / (telemetry.initialPropellantMass * (2.5 / 3.5))) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Fuel Tank Bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>METHANE / RP-1 FUEL</span>
              <span>{(telemetry.fuelMass / 1000).toFixed(1)} t</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-150"
                style={{
                  width: `${Math.max(
                    0,
                    (telemetry.fuelMass / (telemetry.initialPropellantMass * (1.0 / 3.5))) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 pt-1">
            <span>CHAMBER PRESSURE</span>
            <span className="text-slate-200 font-bold">
              {Math.round(telemetry.chamberPressure)} bar
            </span>
          </div>
        </div>

        {/* 3. Main Throttle Control */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shadow-inner flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> MASTER THROTTLE
            </span>
            <span className="text-sm font-black text-orange-300">
              {Math.round(throttle * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={throttle}
            disabled={telemetry.phase === 'EXPLOSION' || telemetry.phase === 'ABORTED'}
            onChange={(e) => onThrottleChange(Number(e.target.value))}
            className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />

          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
            <button
              onClick={() => onThrottleChange(0)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
            >
              0% (CUTOFF)
            </button>
            <button
              onClick={() => onThrottleChange(0.65)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
            >
              65% (MAX-Q)
            </button>
            <button
              onClick={() => onThrottleChange(1.0)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
            >
              100%
            </button>
          </div>
        </div>

        {/* 4. Flight Execution Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {telemetry.phase === 'PAD_READY' ? (
            <button
              onClick={onLaunch}
              className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black tracking-wider text-sm rounded-xl shadow-lg shadow-emerald-600/30 border border-emerald-400 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>IGNITE & LAUNCH</span>
            </button>
          ) : (
            <>
              {/* Stage Separation Button */}
              <button
                onClick={onStage}
                disabled={
                  telemetry.currentStage !== 1 ||
                  telemetry.stage1Separated ||
                  telemetry.phase === 'EXPLOSION' ||
                  telemetry.phase === 'ABORTED'
                }
                className="py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 active:scale-95 text-white font-bold text-xs tracking-wider rounded-xl shadow-md border border-indigo-400/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
                <span>STAGE SEP</span>
              </button>

              {/* Abort Button */}
              <button
                onClick={onAbort}
                disabled={telemetry.phase === 'EXPLOSION' || telemetry.phase === 'ABORTED'}
                className="py-3 bg-rose-700 hover:bg-rose-600 disabled:opacity-30 active:scale-95 text-white font-bold text-xs tracking-wider rounded-xl shadow-md border border-rose-400/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>ABORT</span>
              </button>
            </>
          )}

          {/* Reset / Reload Button */}
          <button
            onClick={onReset}
            className="col-span-2 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET TO PAD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
