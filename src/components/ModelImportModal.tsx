import React, { useState } from 'react';
import * as THREE from 'three';
import {
  Upload,
  Link,
  CheckCircle,
  AlertCircle,
  X,
  FileCode,
  Rocket,
  Info,
} from 'lucide-react';
import { loadLocalRocketFile, loadGoogleDriveRocket } from '../utils/fileLoader';
import { ImportedModelInfo } from '../types/rocket';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onModelLoaded: (model: THREE.Group | null, info: ImportedModelInfo | null) => void;
  currentModelInfo: ImportedModelInfo | null;
}

export const ModelImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onModelLoaded,
  currentModelInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'drive' | 'preset'>('drive');
  const [driveUrl, setDriveUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { object, info } = await loadLocalRocketFile(file);
      onModelLoaded(object, info);
      setSuccessMsg(`Successfully loaded ${info.name} (${info.triangleCount.toLocaleString()} triangles)`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse rocket 3D file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrl.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { object, info } = await loadGoogleDriveRocket(driveUrl.trim());
      onModelLoaded(object, info);
      setSuccessMsg(`Successfully loaded rocket file from Google Drive!`);
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          'Failed to load from Google Drive. Ensure the file sharing is set to "Anyone with the link can view", or download the file and drag it here.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefault = () => {
    onModelLoaded(null, null);
    setSuccessMsg('Reverted to default Astra-X Heavy Lift Aerospace rocket.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 font-mono text-slate-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Rocket className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold tracking-wider">LOAD ROCKET 3D ASSETS</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('drive')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'drive'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>Google Drive Link</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Local 3D File</span>
          </button>

          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'preset'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Default Vehicle</span>
          </button>
        </div>

        {/* Tab 1: Google Drive */}
        {activeTab === 'drive' && (
          <form onSubmit={handleDriveSubmit} className="flex flex-col gap-4">
            <div className="text-xs text-slate-400 leading-relaxed">
              Paste your shared Google Drive link for your Blender / 3D rocket model (<code className="text-cyan-300">.glb</code>, <code className="text-cyan-300">.gltf</code>, or <code className="text-cyan-300">.obj</code>). Make sure the sharing setting is set to <strong>"Anyone with the link can view"</strong>:
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-300">GOOGLE DRIVE SHARING URL:</label>
              <input
                type="text"
                placeholder="https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !driveUrl.trim()}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>DOWNLOADING & PARSING 3D MESH...</span>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  <span>LOAD FROM DRIVE</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Local Upload */}
        {activeTab === 'upload' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-slate-400">
              Drag and drop your exported rocket file from Blender or CAD. Supports <code className="text-cyan-300">.glb</code>, <code className="text-cyan-300">.gltf</code>, <code className="text-cyan-300">.obj</code>, or <code className="text-cyan-300">.stl</code>:
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-cyan-400/80 bg-slate-950/60 rounded-xl p-8 cursor-pointer transition group">
              <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition mb-2" />
              <span className="text-xs font-bold text-slate-300">
                Click to browse or drop file here
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                GLTF, GLB, OBJ, STL (Auto-scales to 65m launch vehicle)
              </span>
              <input
                type="file"
                accept=".glb,.gltf,.obj,.stl"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Tab 3: Preset */}
        {activeTab === 'preset' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-slate-400 leading-relaxed">
              Use the built-in Astra-X heavy multi-stage launch vehicle, equipped with 9 regenerative engine bells, titanium grid fins, interstage separation rings, and carbon composite body.
            </div>

            <button
              onClick={handleResetToDefault}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-cyan-400" />
              <span>USE DEFAULT ASTRA-X VEHICLE</span>
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {errorMsg && (
          <div className="flex items-start gap-2 bg-red-950/60 border border-red-500/50 p-3 rounded-xl text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl text-xs text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Currently Loaded Model Info Card */}
        {currentModelInfo && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800/80 pb-1">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <FileCode className="w-3.5 h-3.5" /> ACTIVE MODEL: {currentModelInfo.name}
              </span>
              <span className="text-[10px] text-slate-500 uppercase">{currentModelInfo.fileType}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
              <div>
                <span className="text-slate-500">TRIANGLES:</span> {currentModelInfo.triangleCount.toLocaleString()}
              </div>
              <div>
                <span className="text-slate-500">VERTICES:</span> {currentModelInfo.vertexCount.toLocaleString()}
              </div>
              <div>
                <span className="text-slate-500">HEIGHT:</span> {currentModelInfo.dimensions.y} m
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
