import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { RocketViewport } from './components/RocketViewport';
import { FlightHUD } from './components/FlightHUD';
import { CoolantPropulsionDeck } from './components/CoolantPropulsionDeck';
import { ModelImportModal } from './components/ModelImportModal';
import {
  RocketTelemetry,
  CameraViewMode,
  ImportedModelInfo,
} from './types/rocket';
import {
  createInitialTelemetry,
  stepRocketPhysics,
} from './physics/rocketEnginePhysics';
import { soundEngine } from './audio/soundManager';

export default function App() {
  const [telemetry, setTelemetry] = useState<RocketTelemetry>(createInitialTelemetry());
  const [throttle, setThrottle] = useState(1.0);
  const [coolantValve, setCoolantValve] = useState(100);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('FOLLOW');
  const [isMuted, setIsMuted] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Custom 3D Rocket Model imported from local file or Google Drive
  const [customModel, setCustomModel] = useState<THREE.Group | null>(null);
  const [customModelInfo, setCustomModelInfo] = useState<ImportedModelInfo | null>(null);

  // Action flags
  const stageTriggerRef = useRef(false);
  const abortTriggerRef = useRef(false);
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;

  const throttleRef = useRef(throttle);
  throttleRef.current = throttle;

  const coolantRef = useRef(coolantValve);
  coolantRef.current = coolantValve;

  // Sound transition tracking
  const prevMachRef = useRef(0);
  const prevPhaseRef = useRef(telemetry.phase);

  // Main 60 FPS Physics & Simulation Engine Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (currentTime - lastTime) * 0.001);
      lastTime = currentTime;

      const current = telemetryRef.current;

      // Numerical integration step
      const next = stepRocketPhysics(current, dt, {
        throttle: throttleRef.current,
        coolantValve: coolantRef.current,
        gimbalPitch: 0,
        gimbalYaw: 0,
        triggerStage: stageTriggerRef.current,
        triggerAbort: abortTriggerRef.current,
      });

      // Reset one-shot triggers
      stageTriggerRef.current = false;
      abortTriggerRef.current = false;

      // Audio engine update
      const isVenting = next.phase === 'PAD_READY' || next.phase === 'COUNTDOWN';
      soundEngine.updateEngineSound(next.throttle, next.altitude, isVenting, next.isOverheating);

      // Sonic boom trigger at Mach 1 transition
      if (prevMachRef.current < 1.0 && next.mach >= 1.0) {
        soundEngine.playSonicBoom();
      }
      prevMachRef.current = next.mach;

      // Phase change audio & notifications
      if (prevPhaseRef.current !== next.phase) {
        if (next.phase === 'STAGE_SEP') {
          soundEngine.playStageSep();
        } else if (next.phase === 'EXPLOSION') {
          soundEngine.playExplosion();
        } else if (next.phase === 'ORBIT_INSERTION') {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 },
          });
        }
        prevPhaseRef.current = next.phase;
      }

      setTelemetry(next);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleLaunch = () => {
    soundEngine.init();
    setThrottle(1.0);
    setTelemetry((prev) => ({
      ...prev,
      phase: 'IGNITION',
      phaseMessage: 'Main Engine Ignition. Turbopumps at 100% rated thrust.',
    }));
  };

  const handleStage = () => {
    soundEngine.init();
    stageTriggerRef.current = true;
  };

  const handleAbort = () => {
    abortTriggerRef.current = true;
  };

  const handleReset = () => {
    setTelemetry(createInitialTelemetry());
    setThrottle(1.0);
    setCoolantValve(100);
    prevMachRef.current = 0;
    prevPhaseRef.current = 'PAD_READY';
  };

  const handleToggleMute = () => {
    soundEngine.init();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* 3D WebGL Simulation Viewport */}
      <div className="relative flex-1 w-full h-full">
        <RocketViewport
          telemetry={telemetry}
          cameraMode={cameraMode}
          customModel={customModel}
          customModelInfo={customModelInfo}
        />

        {/* Flight Telemetry HUD Overlay */}
        <FlightHUD
          telemetry={telemetry}
          cameraMode={cameraMode}
          onCameraChange={setCameraMode}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenImport={() => setIsImportOpen(true)}
        />
      </div>

      {/* Coolant Loop & Propulsion Control Deck */}
      <CoolantPropulsionDeck
        telemetry={telemetry}
        throttle={throttle}
        onThrottleChange={setThrottle}
        coolantValve={coolantValve}
        onCoolantChange={setCoolantValve}
        onLaunch={handleLaunch}
        onStage={handleStage}
        onAbort={handleAbort}
        onReset={handleReset}
      />

      {/* Google Drive & Local 3D File Loader Modal */}
      <ModelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        currentModelInfo={customModelInfo}
        onModelLoaded={(model, info) => {
          setCustomModel(model);
          setCustomModelInfo(info);
          if (model) {
            setCameraMode('FREE_ORBIT');
          }
        }}
      />
    </div>
  );
}
