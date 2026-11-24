import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ImportedModelInfo } from '../types/rocket';

/**
 * Extracts Google Drive File ID from standard sharing URLs
 */
export function extractGoogleDriveId(url: string): string | null {
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // If user pasted pure raw ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
}

/**
 * Converts a Google Drive link into direct download endpoint URLs
 */
export function getGoogleDriveDirectUrls(fileId: string): string[] {
  return [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://docs.google.com/uc?export=download&id=${fileId}`,
  ];
}

/**
 * Analyzes and normalizes any loaded 3D rocket mesh:
 * - Centers X and Z
 * - Aligns bottom engine bells to Y = 0
 * - Scales to realistic rocket scale (nominally ~60-70 meters height)
 * - Computes vertex and triangle metrics
 */
export function normalizeRocketMesh(object: THREE.Object3D): {
  normalizedObject: THREE.Group;
  info: Omit<ImportedModelInfo, 'name' | 'source' | 'fileType' | 'isLoaded'>;
} {
  const group = new THREE.Group();
  group.add(object);

  // Compute bounding box
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);

  // If Z is longest instead of Y (common in Blender exports), rotate around X by -90 deg
  if (size.z > size.y && size.z > size.x) {
    object.rotation.x = -Math.PI / 2;
    box.setFromObject(group);
    box.getSize(size);
    box.getCenter(center);
  }

  // Scale rocket to real-world target height (approx 65m default)
  const targetHeight = 65.0;
  const currentHeight = Math.max(0.1, size.y);
  const scaleFactor = targetHeight / currentHeight;
  object.scale.set(scaleFactor, scaleFactor, scaleFactor);

  // Recompute after scaling
  box.setFromObject(group);
  box.getSize(size);
  box.getCenter(center);

  // Shift geometry so nozzle base is at Y = 0 and centered on X/Z
  object.position.x = -center.x;
  object.position.z = -center.z;
  object.position.y = -box.min.y;

  // Apply PBR materials and shadow flags
  let vertexCount = 0;
  let triangleCount = 0;

  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.geometry) {
        if (mesh.geometry.attributes.position) {
          vertexCount += mesh.geometry.attributes.position.count;
        }
        if (mesh.geometry.index) {
          triangleCount += mesh.geometry.index.count / 3;
        } else if (mesh.geometry.attributes.position) {
          triangleCount += mesh.geometry.attributes.position.count / 3;
        }
      }

      // Upgrade standard materials to metallic aerospace PBR
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.roughness !== undefined) {
          mat.roughness = Math.min(0.45, mat.roughness);
          mat.metalness = Math.max(0.65, mat.metalness || 0.7);
        }
      }
    }
  });

  return {
    normalizedObject: group,
    info: {
      vertexCount,
      triangleCount: Math.round(triangleCount),
      dimensions: {
        x: Math.round(size.x * 10) / 10,
        y: Math.round(size.y * 10) / 10,
        z: Math.round(size.z * 10) / 10,
      },
    },
  };
}

/**
 * Loads a local rocket file (GLB, GLTF, OBJ, STL)
 */
export async function loadLocalRocketFile(file: File): Promise<{
  object: THREE.Group;
  info: ImportedModelInfo;
}> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();

  let loadedObject: THREE.Object3D;

  if (extension === 'glb' || extension === 'gltf') {
    const gltfLoader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader.parse(buffer, '', resolve, reject);
    });
    loadedObject = gltf.scene;
  } else if (extension === 'obj') {
    const objLoader = new OBJLoader();
    const text = new TextDecoder().decode(buffer);
    loadedObject = objLoader.parse(text);
  } else if (extension === 'stl') {
    const stlLoader = new STLLoader();
    const geom = stlLoader.parse(buffer);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      metalness: 0.8,
      roughness: 0.25,
    });
    loadedObject = new THREE.Mesh(geom, mat);
  } else {
    throw new Error(`Unsupported 3D file format .${extension}. Please use .glb, .gltf, .obj, or .stl.`);
  }

  const { normalizedObject, info } = normalizeRocketMesh(loadedObject);

  return {
    object: normalizedObject,
    info: {
      name: file.name,
      source: 'local-file',
      fileType: (extension as any) || 'custom',
      sizeBytes: file.size,
      ...info,
      isLoaded: true,
    },
  };
}

/**
 * Fetches and loads a 3D model directly from a Google Drive share link
 */
export async function loadGoogleDriveRocket(driveUrl: string): Promise<{
  object: THREE.Group;
  info: ImportedModelInfo;
}> {
  const fileId = extractGoogleDriveId(driveUrl);
  if (!fileId) {
    throw new Error('Invalid Google Drive URL. Please provide a link in the form: https://drive.google.com/file/d/FILE_ID/view');
  }

  const urls = getGoogleDriveDirectUrls(fileId);
  let blob: Blob | null = null;
  let lastError: any = null;

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        blob = await res.blob();
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!blob) {
    throw new Error(
      'Could not download file directly from Google Drive. Ensure the file sharing is set to "Anyone with the link can view". Alternatively, download the file and drag it into the simulator!'
    );
  }

  const file = new File([blob], `gdrive_rocket_${fileId.substring(0, 6)}.glb`, { type: blob.type });
  const result = await loadLocalRocketFile(file);
  result.info.source = 'google-drive';
  result.info.url = driveUrl;

  return result;
}
