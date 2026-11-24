import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RocketTelemetry, CameraViewMode, ImportedModelInfo } from '../types/rocket';
import { createDetailedRocketModel } from '../simulation/RocketMeshGenerator';
import { RocketPlumeEngine } from '../simulation/RocketPlume';

interface Props {
  telemetry: RocketTelemetry;
  cameraMode: CameraViewMode;
  customModel: THREE.Group | null;
  customModelInfo: ImportedModelInfo | null;
}

export const RocketViewport: React.FC<Props> = ({
  telemetry,
  cameraMode,
  customModel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Simulation references
  const rocketRootRef = useRef<THREE.Group | null>(null);
  const plumeEngineRef = useRef<RocketPlumeEngine | null>(null);
  const defaultModelRef = useRef<ReturnType<typeof createDetailedRocketModel> | null>(null);
  const customModelRef = useRef<THREE.Group | null>(null);

  // Environment references
  const skyMeshRef = useRef<THREE.Mesh | null>(null);
  const groundGroupRef = useRef<THREE.Group | null>(null);
  const earthGlobeRef = useRef<THREE.Mesh | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500000);
    camera.position.set(0, 25, 120);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 15000;
    controls.minDistance = 2.0;
    controlsRef.current = controls;

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    dirLight.position.set(200, 400, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Secondary fill light for engine bells
    const fillLight = new THREE.DirectionalLight(0x7090b0, 0.8);
    fillLight.position.set(-150, -50, -150);
    scene.add(fillLight);

    // 3. Environment: Sky Sphere with Altitude Gradient
    const skyGeom = new THREE.SphereGeometry(180000, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        uniform float uAltitude;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float heightFactor = clamp(uAltitude / 90000.0, 0.0, 1.0);

          // Sea level daytime sky
          vec3 groundSky = vec3(0.55, 0.72, 0.95);
          vec3 zenithSky = vec3(0.12, 0.35, 0.75);
          vec3 seaSky = mix(groundSky, zenithSky, max(0.0, dir.y));

          // Space sky
          vec3 spaceSky = vec3(0.01, 0.015, 0.035);

          vec3 finalSky = mix(seaSky, spaceSky, heightFactor);

          // Starfield in vacuum
          if (heightFactor > 0.4) {
            float starNoise = fract(sin(dot(dir.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            if (starNoise > 0.994) {
              finalSky += vec3(0.85) * (heightFactor - 0.4) * 1.5;
            }
          }

          gl_FragColor = vec4(finalSky, 1.0);
        }
      `,
      uniforms: {
        uAltitude: { value: 0 },
      },
    });
    const skyMesh = new THREE.Mesh(skyGeom, skyMat);
    scene.add(skyMesh);
    skyMeshRef.current = skyMesh;

    // 4. Ground Launch Pad & Ocean
    const groundGroup = new THREE.Group();
    scene.add(groundGroup);
    groundGroupRef.current = groundGroup;

    // Ocean plane
    const oceanGeom = new THREE.PlaneGeometry(12000, 12000);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a2236,
      roughness: 0.15,
      metalness: 0.8,
    });
    const ocean = new THREE.Mesh(oceanGeom, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.1;
    ocean.receiveShadow = true;
    groundGroup.add(ocean);

    // Concrete Launch Pad Platform
    const padGeom = new THREE.CylinderGeometry(45, 55, 4, 32);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3a3f47,
      roughness: 0.85,
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.y = -2;
    pad.receiveShadow = true;
    groundGroup.add(pad);

    // Launch Umbilical Tower
    const towerGeom = new THREE.BoxGeometry(6, 80, 6);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x9e2a2b, // Aerospace red tower
      roughness: 0.5,
      metalness: 0.5,
    });
    const tower = new THREE.Mesh(towerGeom, towerMat);
    tower.position.set(16, 40, 0);
    tower.castShadow = true;
    groundGroup.add(tower);

    // Tower Service Arms
    for (let i = 0; i < 3; i++) {
      const armGeom = new THREE.BoxGeometry(14, 1.5, 1.5);
      const arm = new THREE.Mesh(armGeom, towerMat);
      arm.position.set(9, 20 + i * 22, 0);
      groundGroup.add(arm);
    }

    // 5. Earth Curved Horizon (Visible at high altitudes)
    const earthRadius = 6371000 * 0.005; // scaled for 3D view
    const earthGeom = new THREE.SphereGeometry(earthRadius, 64, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1b4965,
      roughness: 0.6,
      metalness: 0.2,
    });
    const earthGlobe = new THREE.Mesh(earthGeom, earthMat);
    earthGlobe.position.set(0, -earthRadius, 0);
    scene.add(earthGlobe);
    earthGlobeRef.current = earthGlobe;

    // 6. Rocket Group Setup
    const rocketRoot = new THREE.Group();
    scene.add(rocketRoot);
    rocketRootRef.current = rocketRoot;

    // Default High-Detail Vehicle
    const defaultRocket = createDetailedRocketModel();
    defaultModelRef.current = defaultRocket;
    rocketRoot.add(defaultRocket.root);

    // 7. Exhaust Plume & Particle Engine
    const plumeEngine = new RocketPlumeEngine();
    plumeEngineRef.current = plumeEngine;
    rocketRoot.add(plumeEngine.root);

    // Animation Loop
    let lastTime = performance.now();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Custom Model swapping
  useEffect(() => {
    if (!rocketRootRef.current) return;

    if (customModel) {
      if (defaultModelRef.current) {
        defaultModelRef.current.root.visible = false;
      }
      if (customModelRef.current) {
        rocketRootRef.current.remove(customModelRef.current);
      }
      customModelRef.current = customModel;
      rocketRootRef.current.add(customModel);
    } else {
      if (defaultModelRef.current) {
        defaultModelRef.current.root.visible = true;
      }
      if (customModelRef.current) {
        rocketRootRef.current.remove(customModelRef.current);
        customModelRef.current = null;
      }
    }
  }, [customModel]);

  // Frame-by-frame updates from Telemetry
  useEffect(() => {
    if (!rocketRootRef.current || !cameraRef.current || !controlsRef.current) return;

    // Altitude scaling for 3D world: 1 meter in physics = 1 unit in Three.js
    const alt = telemetry.altitude;
    rocketRootRef.current.position.y = alt;

    // Pitch angle from vertical (gravity turn)
    const pitchDeg = Math.max(0, 90 - Math.pow(Math.min(1.0, alt / 140000), 0.6) * 80);
    const pitchRad = ((90 - pitchDeg) * Math.PI) / 180;
    rocketRootRef.current.rotation.z = -pitchRad;

    // Update Staging Visibilities
    if (defaultModelRef.current) {
      defaultModelRef.current.stage1Group.visible = !telemetry.stage1Separated;
      defaultModelRef.current.fairingGroup.visible = !telemetry.fairingSeparated;

      // Nozzle thermal glow (emissive shader update)
      const mat = defaultModelRef.current.nozzleMaterial;
      if (telemetry.nozzleTemp > 750) {
        // Red-Orange to incandescent Yellow/White
        const t = Math.min(1.0, (telemetry.nozzleTemp - 750) / 1300);
        const r = Math.min(1.0, 0.4 + t * 0.6);
        const g = Math.min(1.0, t * 0.85);
        const b = Math.min(1.0, Math.max(0, (t - 0.7) * 3.0));
        mat.emissive.setRGB(r, g, b);
        mat.emissiveIntensity = t * 2.5;
      } else {
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
      }
    }

    // Update Plume and Particles
    if (plumeEngineRef.current) {
      const isVenting = telemetry.phase === 'PAD_READY' || telemetry.phase === 'COUNTDOWN';
      plumeEngineRef.current.update(
        0.016,
        telemetry.throttle,
        telemetry.ambientPressure,
        telemetry.mach,
        telemetry.altitude,
        isVenting,
        telemetry.isOverheating
      );
    }

    // Update Sky Shader altitude
    if (skyMeshRef.current) {
      (skyMeshRef.current.material as THREE.ShaderMaterial).uniforms.uAltitude.value = alt;
    }

    // Camera Modes
    const cam = cameraRef.current;
    const controls = controlsRef.current;

    switch (cameraMode) {
      case 'FOLLOW':
        controls.enabled = false;
        cam.position.set(0, alt + 15, 95);
        cam.lookAt(0, alt + 30, 0);
        break;
      case 'PAD_TRACK':
        controls.enabled = false;
        cam.position.set(120, 15, 120);
        cam.lookAt(0, alt + 25, 0);
        break;
      case 'ENGINE_POV':
        controls.enabled = false;
        cam.position.set(0, alt - 14, 22);
        cam.lookAt(0, alt + 5, 0);
        break;
      case 'NOSE_POV':
        controls.enabled = false;
        cam.position.set(0, alt + 64, 4);
        cam.lookAt(0, alt + 100, 50);
        break;
      case 'FREE_ORBIT':
      default:
        controls.enabled = true;
        controls.target.set(0, alt + 30, 0);
        break;
    }
  }, [telemetry, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
