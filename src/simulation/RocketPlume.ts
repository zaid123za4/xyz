import * as THREE from 'three';

/**
 * Blender-Grade Realtime Rocket Plume, Fire & Shock Diamond Particle Engine
 * Adapts plume expansion and Mach diamond spacing based on atmospheric pressure (Barometric P_amb)
 */
export class RocketPlumeEngine {
  public root: THREE.Group;

  // Plume Core Mesh (Volumetric Glow)
  private coreMesh: THREE.Mesh;
  private coreMaterial: THREE.ShaderMaterial;

  // Outer Expansion Sheath Mesh (Vacuum Plume)
  private vacuumSheathMesh: THREE.Mesh;
  private vacuumSheathMaterial: THREE.ShaderMaterial;

  // Shock Diamonds (Mach Disks)
  private shockDiamondGroup: THREE.Group;
  private shockDiamonds: THREE.Mesh[] = [];

  // Particle System (Fire, Smoke, Sparks)
  private particleCount = 2000;
  private particleGeometry: THREE.BufferGeometry;
  private particlePoints: THREE.Points;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;
  private particleVelocities: Float32Array;
  private particleLifetimes: Float32Array;
  private particleMaxLifetimes: Float32Array;
  private particleTypes: Float32Array; // 0: Fire/Core, 1: Smoke, 2: Cryo Vent, 3: Deluge Steam

  // Mach 1 Condensation Collar
  private transonicConeMesh: THREE.Mesh;
  private transonicConeMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.root = new THREE.Group();

    // 1. Core Plasma Plume Shader
    const coreVertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const coreFragmentShader = `
      uniform float uTime;
      uniform float uThrottle;
      uniform float uPressure; // 1.0 at sea level, 0.0 in vacuum
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        if (uThrottle <= 0.01) discard;

        float distFromCenter = abs(vUv.x - 0.5) * 2.0;
        float progressAlongJet = vUv.y;

        // Sea level = intense yellow/orange core; Vacuum = blue/violet translucent expansion
        vec3 seaColor = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.45, 0.05), progressAlongJet);
        vec3 vacColor = mix(vec3(0.4, 0.7, 1.0), vec3(0.65, 0.2, 0.95), progressAlongJet);
        vec3 baseColor = mix(vacColor, seaColor, uPressure);

        // Core flicker
        float flicker = sin(vPosition.y * 25.0 - uTime * 65.0) * 0.15 + 0.85;

        // Alpha falloff
        float alpha = (1.0 - distFromCenter) * (1.0 - progressAlongJet * 0.75) * uThrottle * flicker;
        alpha = clamp(alpha, 0.0, 0.95);

        gl_FragColor = vec4(baseColor * (1.2 + uThrottle * 0.8), alpha);
      }
    `;

    this.coreMaterial = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uThrottle: { value: 0 },
        uPressure: { value: 1.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const coreGeom = new THREE.CylinderGeometry(0.8, 2.5, 20, 32, 16, true);
    coreGeom.translate(0, -10, 0); // origin at top nozzle
    this.coreMesh = new THREE.Mesh(coreGeom, this.coreMaterial);
    this.root.add(this.coreMesh);

    // 2. Vacuum Sheath (Wide ballooning plume in thin air / space)
    const sheathGeom = new THREE.ConeGeometry(8.0, 35, 32, 16, true);
    sheathGeom.rotateX(Math.PI);
    sheathGeom.translate(0, -17.5, 0);

    this.vacuumSheathMaterial = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: `
        uniform float uTime;
        uniform float uThrottle;
        uniform float uPressure;
        varying vec2 vUv;
        void main() {
          if (uThrottle <= 0.01) discard;
          float vacIntensity = (1.0 - uPressure);
          if (vacIntensity <= 0.05) discard;

          float alpha = (1.0 - vUv.y) * 0.25 * vacIntensity * uThrottle;
          vec3 vacGlow = vec3(0.3, 0.55, 0.95);
          gl_FragColor = vec4(vacGlow, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uThrottle: { value: 0 },
        uPressure: { value: 1.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.vacuumSheathMesh = new THREE.Mesh(sheathGeom, this.vacuumSheathMaterial);
    this.root.add(this.vacuumSheathMesh);

    // 3. Shock Diamonds (Mach Disks - physics phenomenon)
    this.shockDiamondGroup = new THREE.Group();
    const diamondMat = new THREE.MeshBasicMaterial({
      color: 0xfff0aa,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < 6; i++) {
      const diamondGeom = new THREE.OctahedronGeometry(0.6, 1);
      diamondGeom.scale(1.0, 2.2, 1.0);
      const diamond = new THREE.Mesh(diamondGeom, diamondMat);
      diamond.position.y = -1.8 - i * 2.8;
      this.shockDiamonds.push(diamond);
      this.shockDiamondGroup.add(diamond);
    }
    this.root.add(this.shockDiamondGroup);

    // 4. Transonic Shock Cone (Prandtl-Glauert Singularity)
    const coneGeom = new THREE.ConeGeometry(4.2, 3.5, 32, 1, true);
    coneGeom.rotateX(Math.PI);
    this.transonicConeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.transonicConeMesh = new THREE.Mesh(coneGeom, this.transonicConeMaterial);
    this.transonicConeMesh.position.y = 35.0; // near the nosecone / max-cross section
    this.root.add(this.transonicConeMesh);

    // 5. Particles Setup
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleColors = new Float32Array(this.particleCount * 3);
    this.particleSizes = new Float32Array(this.particleCount);
    this.particleVelocities = new Float32Array(this.particleCount * 3);
    this.particleLifetimes = new Float32Array(this.particleCount);
    this.particleMaxLifetimes = new Float32Array(this.particleCount);
    this.particleTypes = new Float32Array(this.particleCount);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    // Particle Texture Canvas (Soft radial glow)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,200,100,0.8)');
    grad.addColorStop(0.7, 'rgba(255,80,20,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 4.5,
      map: texture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, particleMaterial);
    this.root.add(this.particlePoints);

    // Initialize all particles inactive
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, 0, 1.0, false);
      this.particleLifetimes[i] = 999; // dead initially
    }
  }

  private resetParticle(i: number, throttle: number, ambientPressure: number, isVentingCryo: boolean) {
    const i3 = i * 3;

    // Decide particle type based on state
    if (isVentingCryo && Math.random() < 0.25) {
      // Cryo Boil-off Vapor from interstage side relief valves
      this.particleTypes[i] = 2;
      const angle = Math.random() * Math.PI * 2;
      this.particlePositions[i3] = Math.cos(angle) * 2.5;
      this.particlePositions[i3 + 1] = 42.0; // interstage height
      this.particlePositions[i3 + 2] = Math.sin(angle) * 2.5;

      this.particleVelocities[i3] = Math.cos(angle) * (1.5 + Math.random() * 2);
      this.particleVelocities[i3 + 1] = -0.5 + Math.random() * 1.5;
      this.particleVelocities[i3 + 2] = Math.sin(angle) * (1.5 + Math.random() * 2);

      this.particleColors[i3] = 0.9;
      this.particleColors[i3 + 1] = 0.95;
      this.particleColors[i3 + 2] = 1.0;
      this.particleSizes[i] = 3.0 + Math.random() * 3.0;
      this.particleLifetimes[i] = 0;
      this.particleMaxLifetimes[i] = 1.2 + Math.random() * 1.0;
      return;
    }

    if (throttle <= 0.01) {
      this.particleLifetimes[i] = 999;
      return;
    }

    // Engine exhaust particle (Fire or Smoke)
    const isSmoke = Math.random() < 0.45;
    this.particleTypes[i] = isSmoke ? 1 : 0;

    // Emitter base at engine bells
    const radius = Math.random() * 1.4;
    const angle = Math.random() * Math.PI * 2;
    this.particlePositions[i3] = Math.cos(angle) * radius;
    this.particlePositions[i3 + 1] = 0.5; // at nozzle exit
    this.particlePositions[i3 + 2] = Math.sin(angle) * radius;

    // Plume spread depends on ambient pressure (real physics: vacuum expands outwards!)
    const expansionRatio = Math.max(1.0, 1.0 + (1.0 - ambientPressure) * 4.5);
    const spreadSpeed = (1.5 + Math.random() * 4.0) * expansionRatio;

    this.particleVelocities[i3] = (Math.random() - 0.5) * spreadSpeed;
    this.particleVelocities[i3 + 1] = -(35 + Math.random() * 65 * throttle); // High downward velocity
    this.particleVelocities[i3 + 2] = (Math.random() - 0.5) * spreadSpeed;

    if (!isSmoke) {
      // Fire / Core plasma
      if (ambientPressure > 0.3) {
        // Sea level fiery yellow-orange
        this.particleColors[i3] = 1.0;
        this.particleColors[i3 + 1] = 0.7 + Math.random() * 0.3;
        this.particleColors[i3 + 2] = 0.2;
      } else {
        // Vacuum electric blue-violet
        this.particleColors[i3] = 0.4 + Math.random() * 0.3;
        this.particleColors[i3 + 1] = 0.6 + Math.random() * 0.3;
        this.particleColors[i3 + 2] = 1.0;
      }
      this.particleSizes[i] = (4.0 + Math.random() * 6.0) * throttle;
      this.particleMaxLifetimes[i] = 0.35 + Math.random() * 0.4;
    } else {
      // Atmospheric smoke billowing
      this.particleColors[i3] = 0.55;
      this.particleColors[i3 + 1] = 0.52;
      this.particleColors[i3 + 2] = 0.5;
      this.particleSizes[i] = 6.0 + Math.random() * 8.0;
      this.particleMaxLifetimes[i] = 1.2 + Math.random() * 1.5;
    }

    this.particleLifetimes[i] = 0;
  }

  public update(
    dt: number,
    throttle: number,
    ambientPressure: number,
    mach: number,
    altitude: number,
    isVentingCryo: boolean,
    isOverheating: boolean
  ) {
    const time = performance.now() * 0.001;

    // 1. Update Core Plume Shader Uniforms
    this.coreMaterial.uniforms.uTime.value = time;
    this.coreMaterial.uniforms.uThrottle.value = throttle;
    this.coreMaterial.uniforms.uPressure.value = ambientPressure;

    this.vacuumSheathMaterial.uniforms.uTime.value = time;
    this.vacuumSheathMaterial.uniforms.uThrottle.value = throttle;
    this.vacuumSheathMaterial.uniforms.uPressure.value = ambientPressure;

    // Real-world plume scale: In vacuum (ambientPressure -> 0), plume flares wide!
    const flareScale = 1.0 + (1.0 - ambientPressure) * 3.8;
    this.coreMesh.scale.set(flareScale * throttle, 1.0 + throttle * 0.5, flareScale * throttle);
    this.vacuumSheathMesh.scale.set(flareScale * 1.5 * throttle, 1.0 + throttle * 0.8, flareScale * 1.5 * throttle);

    // 2. Shock Diamonds (Only visible when ambient pressure is high enough and throttle active)
    const showDiamonds = ambientPressure > 0.15 && throttle > 0.3;
    this.shockDiamondGroup.visible = showDiamonds;

    if (showDiamonds) {
      const diamondScale = throttle * Math.min(1.0, ambientPressure * 1.2);
      this.shockDiamonds.forEach((diamond, idx) => {
        diamond.scale.set(diamondScale, diamondScale * (1.2 + Math.sin(time * 30 + idx) * 0.2), diamondScale);
        // Spacing varies with exhaust speed and chamber pressure
        diamond.position.y = -1.5 - idx * (2.2 + throttle * 1.4);
      });
    }

    // 3. Mach 1 Transonic Vapor Cloud (Prandtl-Glauert effect)
    if (mach >= 0.94 && mach <= 1.12 && altitude < 25000) {
      const coneIntensity = 1.0 - Math.abs(mach - 1.03) / 0.09;
      this.transonicConeMaterial.opacity = Math.max(0, coneIntensity * 0.75);
      this.transonicConeMesh.scale.set(1.0 + Math.sin(time * 20) * 0.05, 1.0, 1.0 + Math.cos(time * 20) * 0.05);
    } else {
      this.transonicConeMaterial.opacity = 0.0;
    }

    // 4. Update Particle System
    const spawnRate = Math.floor(this.particleCount * dt * (throttle > 0 ? 3.0 : 0.5));
    let spawned = 0;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.particleLifetimes[i] += dt;

      if (this.particleLifetimes[i] >= this.particleMaxLifetimes[i]) {
        if (spawned < spawnRate) {
          this.resetParticle(i, throttle, ambientPressure, isVentingCryo);
          spawned++;
        } else {
          // Keep dead
          this.particlePositions[i3 + 1] = -9999;
          continue;
        }
      }

      // Physics integration for particles
      this.particlePositions[i3] += this.particleVelocities[i3] * dt;
      this.particlePositions[i3 + 1] += this.particleVelocities[i3 + 1] * dt;
      this.particlePositions[i3 + 2] += this.particleVelocities[i3 + 2] * dt;

      // Atmospheric drag slows down smoke particles
      if (this.particleTypes[i] === 1) {
        this.particleVelocities[i3] *= 0.94;
        this.particleVelocities[i3 + 1] *= 0.92;
        this.particleVelocities[i3 + 2] *= 0.94;
        // Smoke expands as it rises
        this.particleSizes[i] += dt * 8.0;
      }

      // Life alpha fadeout
      const lifeFrac = this.particleLifetimes[i] / this.particleMaxLifetimes[i];
      if (this.particleTypes[i] === 0) {
        // Fire fades from yellow to red/black
        this.particleColors[i3 + 1] *= 0.95;
      } else {
        // Smoke fades to transparent
        this.particleColors[i3] *= 0.97;
        this.particleColors[i3 + 1] *= 0.97;
        this.particleColors[i3 + 2] *= 0.97;
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
  }
}
