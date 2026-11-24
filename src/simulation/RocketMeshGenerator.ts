import * as THREE from 'three';

/**
 * Generates an ultra-detailed procedural aerospace rocket vehicle
 * Complete with regenerative cooling coils, 9 engine bells, raceways, stage separation seams, and grid fins.
 */
export function createDetailedRocketModel(): {
  root: THREE.Group;
  stage1Group: THREE.Group;
  stage2Group: THREE.Group;
  fairingGroup: THREE.Group;
  engineNozzles: THREE.Mesh[];
  nozzleMaterial: THREE.MeshStandardMaterial;
} {
  const root = new THREE.Group();
  const stage1Group = new THREE.Group();
  const stage2Group = new THREE.Group();
  const fairingGroup = new THREE.Group();

  root.add(stage1Group);
  root.add(stage2Group);
  root.add(fairingGroup);

  // High-performance aerospace materials
  const whiteCompositeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f7fb,
    metalness: 0.35,
    roughness: 0.28,
  });

  const carbonFiberMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    metalness: 0.8,
    roughness: 0.3,
  });

  const chromeMetalMat = new THREE.MeshStandardMaterial({
    color: 0xdde2ea,
    metalness: 0.9,
    roughness: 0.15,
  });

  // Dynamic Regenerative Nozzle Material (Emissive changes with temperature!)
  const nozzleMaterial = new THREE.MeshStandardMaterial({
    color: 0x22242a,
    metalness: 0.85,
    roughness: 0.35,
    emissive: 0x000000,
    emissiveIntensity: 0.0,
  });

  const copperCoolingJacketMat = new THREE.MeshStandardMaterial({
    color: 0xc87d55, // Inconel / Copper alloy cooling tubes
    metalness: 0.8,
    roughness: 0.3,
  });

  const engineNozzles: THREE.Mesh[] = [];

  // ==========================================
  // STAGE 1: BOOSTER CORE (Height: ~45m, Radius: 3.7m)
  // ==========================================
  const s1Height = 44;
  const s1Radius = 2.4;

  // Main Tank Barrel
  const s1Geom = new THREE.CylinderGeometry(s1Radius, s1Radius, s1Height, 48, 16);
  const s1Mesh = new THREE.Mesh(s1Geom, whiteCompositeMat);
  s1Mesh.position.y = s1Height / 2 + 3.0; // elevated above nozzles
  s1Mesh.castShadow = true;
  s1Mesh.receiveShadow = true;
  stage1Group.add(s1Mesh);

  // Carbon Fiber Interstage Skirt
  const interstageGeom = new THREE.CylinderGeometry(s1Radius * 0.98, s1Radius, 5.0, 48, 4);
  const interstageMesh = new THREE.Mesh(interstageGeom, carbonFiberMat);
  interstageMesh.position.y = s1Height + 3.0 + 2.5;
  interstageMesh.castShadow = true;
  stage1Group.add(interstageMesh);

  // External Raceways / Cable conduits running vertically
  for (let a = 0; a < 2; a++) {
    const angle = (a * Math.PI) + 0.5;
    const racewayGeom = new THREE.BoxGeometry(0.2, s1Height, 0.4);
    const raceway = new THREE.Mesh(racewayGeom, carbonFiberMat);
    raceway.position.set(
      Math.cos(angle) * (s1Radius + 0.1),
      s1Height / 2 + 3.0,
      Math.sin(angle) * (s1Radius + 0.1)
    );
    stage1Group.add(raceway);
  }

  // 4 Titanium Grid Fins at top of Stage 1
  for (let i = 0; i < 4; i++) {
    const finAngle = (i * Math.PI) / 2;
    const finGroup = new THREE.Group();
    finGroup.position.set(
      Math.cos(finAngle) * (s1Radius + 0.3),
      s1Height + 2.0,
      Math.sin(finAngle) * (s1Radius + 0.3)
    );
    finGroup.rotation.y = finAngle;

    const finPlateGeom = new THREE.BoxGeometry(0.8, 1.4, 0.08);
    const finPlate = new THREE.Mesh(finPlateGeom, carbonFiberMat);
    finGroup.add(finPlate);
    stage1Group.add(finGroup);
  }

  // 9 Engine Cluster (Octaweb layout: 1 center + 8 perimeter)
  const engineLayout: [number, number][] = [
    [0, 0], // Center
  ];
  const perimeterRadius = 1.35;
  for (let i = 0; i < 8; i++) {
    const theta = (i * 2 * Math.PI) / 8;
    engineLayout.push([Math.cos(theta) * perimeterRadius, Math.sin(theta) * perimeterRadius]);
  }

  // Engine Bell geometry
  const nozzleGeom = new THREE.ConeGeometry(0.55, 2.5, 32, 8, true);
  nozzleGeom.rotateX(Math.PI); // Point bell downward

  engineLayout.forEach(([x, z]) => {
    const nozzle = new THREE.Mesh(nozzleGeom, nozzleMaterial);
    nozzle.position.set(x, 1.8, z);
    nozzle.castShadow = true;
    engineNozzles.push(nozzle);
    stage1Group.add(nozzle);

    // Regenerative cooling helical tube jacket ring
    const ringGeom = new THREE.TorusGeometry(0.48, 0.04, 12, 32);
    ringGeom.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeom, copperCoolingJacketMat);
    ring.position.set(x, 1.2, z);
    stage1Group.add(ring);
  });

  // Base Heat Shield
  const heatShieldGeom = new THREE.CylinderGeometry(s1Radius, s1Radius * 1.05, 0.6, 48);
  const heatShield = new THREE.Mesh(heatShieldGeom, carbonFiberMat);
  heatShield.position.y = 2.8;
  stage1Group.add(heatShield);

  // ==========================================
  // STAGE 2: VACUUM ORBITAL STAGE (Height: ~14m)
  // ==========================================
  const s2BaseY = s1Height + 3.0 + 5.0; // above interstage
  const s2Height = 12.0;

  const s2Geom = new THREE.CylinderGeometry(s1Radius * 0.98, s1Radius * 0.98, s2Height, 48);
  const s2Mesh = new THREE.Mesh(s2Geom, whiteCompositeMat);
  s2Mesh.position.y = s2BaseY + s2Height / 2;
  s2Mesh.castShadow = true;
  stage2Group.add(s2Mesh);

  // Stage 2 Vacuum Engine Bell (Single large expansion ratio bell)
  const vacNozzleGeom = new THREE.ConeGeometry(1.2, 3.8, 48, 12, true);
  vacNozzleGeom.rotateX(Math.PI);
  const vacNozzle = new THREE.Mesh(vacNozzleGeom, nozzleMaterial);
  vacNozzle.position.set(0, s2BaseY - 1.0, 0);
  engineNozzles.push(vacNozzle);
  stage2Group.add(vacNozzle);

  // Vacuum nozzle reinforcement stiffener rings
  for (let r = 0; r < 3; r++) {
    const stiffenerGeom = new THREE.TorusGeometry(0.6 + r * 0.22, 0.03, 8, 32);
    stiffenerGeom.rotateX(Math.PI / 2);
    const stiffener = new THREE.Mesh(stiffenerGeom, chromeMetalMat);
    stiffener.position.set(0, s2BaseY - 0.5 - r * 0.9, 0);
    stage2Group.add(stiffener);
  }

  // ==========================================
  // PAYLOAD FAIRING / NOSECONE (Height: ~13m)
  // ==========================================
  const fairingBaseY = s2BaseY + s2Height;
  const fairingHeight = 12.0;

  // Ogive Nosecone Fairing
  const fairingGeom = new THREE.ConeGeometry(s1Radius * 0.98, fairingHeight, 48, 16);
  const fairingMesh = new THREE.Mesh(fairingGeom, whiteCompositeMat);
  fairingMesh.position.y = fairingBaseY + fairingHeight / 2;
  fairingMesh.castShadow = true;
  fairingGroup.add(fairingMesh);

  // Split seam line between fairing halves
  const seamGeom = new THREE.BoxGeometry(0.04, fairingHeight, s1Radius * 2.05);
  const seamMesh = new THREE.Mesh(seamGeom, carbonFiberMat);
  seamMesh.position.y = fairingBaseY + fairingHeight / 2;
  fairingGroup.add(seamMesh);

  return {
    root,
    stage1Group,
    stage2Group,
    fairingGroup,
    engineNozzles,
    nozzleMaterial,
  };
}
