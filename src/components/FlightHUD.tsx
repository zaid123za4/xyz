import React from 'react';
import { RocketTelemetry, CameraViewMode } from '../types/rocket';
import {
  Gauge,
  Flame,
  Thermometer,
  Compass,
  Zap,
  Activity,
  AlertTriangle,
  Camera,
  Layers,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface Props {
  telemetry: RocketTelemetry;
  cameraMode: CameraViewMode;
  onCameraChange: (mode: CameraViewMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenImport: () => void;
}

export const FlightHUD: React.FC<Props> = ({
  telemetry,
  cameraMode,
  onCameraChange,
  isMuted,
  onToggleMute,
  onOpenImport,
}) => {
  // Format mission elapsed time
  const formatMET = (timeSec: number) => {
    const mins = Math.floor(timeSec / 60);
    const secs = Math.floor(timeSec % 60);
    const ms = Math.floor((timeSec % 1) * 10);
    return `T+ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const getPhaseBadgeColor = (phase: string) => {
    switch (phase) {
      case 'PAD_READY':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'IGNITION':
      case 'LIFTOFF':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'TRANSONIC':
      case 'MAX_Q':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'STAGE_SEP':
      case 'STAGE_2_BURN':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'ORBIT_INSERTION':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'CRITICAL_OVERHEAT':
      case 'EXPLOSION':
      case 'ABORTED':
        return 'bg-red-500/30 text-red-400 border-red-500/50 animate-bounce';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6 select-none font-mono text-slate-100">
      {/* Top Bar: Mission Phase & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-sm md:text-base font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              ASTRA-SIM // PROPULSION LAB
            </h1>
          </div>
          <span className="text-slate-500">|</span>
          <div className="text-sm font-bold text-cyan-400">
            {formatMET(telemetry.time)}
          </div>
        </div>

        {/* Phase Badge & Notifications */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold tracking-wider uppercase transition-all ${getPhaseBadgeColor(
              telemetry.phase
            )}`}
          >
            {telemetry.phase.replace(/_/g, ' ')}
          </div>

          {/* Model Import Button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg border border-indigo-400/30 text-xs font-bold transition shadow-lg backdrop-blur-md cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Load Rocket 3D</span>
          </button>

          {/* Audio Mute Button */}
          <button
            onClick={onToggleMute}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/50 transition cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Critical Overheating Alert Banner */}
      {telemetry.isOverheating && (
        <div className="mx-auto my-2 pointer-events-auto flex items-center gap-3 bg-red-600/90 border-2 border-red-400 text-white px-6 py-2 rounded-xl shadow-2xl animate-pulse">
          <AlertTriangle className="w-5 h-5 animate-spin" />
          <div className="text-sm font-black tracking-wide">
            WARNING: REGENERATIVE COOLANT STARVED! NOZZLE TEMPERATURE CRITICAL (
            {Math.round(telemetry.nozzleTemp)} K) — INCREASE COOLANT FLOW!
          </div>
        </div>
      )}

      {/* Center Left & Right Flight Instruments */}
      <div className="grid grid-cols-2 md:grid-cols-2 w-full max-w-full justify-between items-start pointer-events-none mt-2">
        {/* Left Tape: Flight Dynamics */}
        <div className="flex flex-col gap-2.5 max-w-[240px] bg-slate-900/75 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/50 shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> ALTITUDE
            </span>
            <span className="text-sm font-black text-cyan-300">
              {telemetry.altitude >= 1000
                ? `${(telemetry.altitude / 1000).toFixed(2)} km`
                : `${Math.round(telemetry.altitude)} m`}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> VELOCITY
            </span>
            <span className="text-sm font-black text-amber-300">
              {Math.round(telemetry.velocity)} m/s
              <span className="text-[10px] text-slate-400 ml-1">
                ({Math.round(telemetry.velocity * 3.6)} km/h)
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-sky-400" /> MACH SPEED
            </span>
            <span
              className={`text-sm font-black ${
                telemetry.mach >= 1.0 ? 'text-rose-400 animate-pulse' : 'text-sky-300'
              }`}
            >
              M {telemetry.mach.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-purple-400" /> MAX-Q (DYNAMIC P)
            </span>
            <span className="text-sm font-black text-purple-300">
              {(telemetry.dynamicPressure / 1000).toFixed(1)} kPa
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">APOGEE TARGET</span>
            <span className="text-xs font-bold text-slate-300">
              {(telemetry.apogee / 1000).toFixed(1)} km
            </span>
          </div>
        </div>

        {/* Right Tape: Atmospheric & Propulsion Physics */}
        <div className="flex flex-col gap-2.5 max-w-[240px] ml-auto bg-slate-900/75 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/50 shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> THRUST
            </span>
            <span className="text-sm font-black text-orange-300">
              {(telemetry.thrust / 1000000).toFixed(2)} MN
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400">SPECIFIC IMPULSE</span>
            <span className="text-sm font-black text-indigo-300">
              {Math.round(telemetry.specificImpulse)} s (Isp)
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400">TWR (THRUST/WT)</span>
            <span
              className={`text-sm font-black ${
                telemetry.twr >= 1.0 ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {telemetry.twr.toFixed(2)} : 1
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-400">AMBIENT PRESSURE</span>
            <span className="text-xs font-bold text-slate-300">
              {telemetry.ambientPressure >= 0.01
                ? `${telemetry.ambientPressure.toFixed(3)} bar`
                : `${(telemetry.ambientPressure * 1000).toFixed(2)} mbar`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">TOTAL MASS</span>
            <span className="text-xs font-bold text-slate-300">
              {(telemetry.totalMass / 1000).toFixed(1)} tons
            </span>
          </div>
        </div>
      </div>

      {/* Camera Mode Pills (Floating above control deck) */}
      <div className="flex items-center justify-center gap-2 pointer-events-auto mt-2">
        {(
          [
            { id: 'FOLLOW', label: 'Chase Cam' },
            { id: 'PAD_TRACK', label: 'Ground Telescope' },
            { id: 'ENGINE_POV', label: 'Exhaust Bell POV' },
            { id: 'NOSE_POV', label: 'Nosecone Horizon' },
            { id: 'FREE_ORBIT', label: '360° Free Orbit' },
          ] as const
        ).map((mode) => (
          <button
            key={mode.id}
            onClick={() => onCameraChange(mode.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide transition border cursor-pointer backdrop-blur-md ${
              cameraMode === mode.id
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/30 shadow-md font-black'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};
