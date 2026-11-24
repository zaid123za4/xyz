/**
 * Real-time Procedural Web Audio Engine for Rocket Dynamics
 * Synthesizes engine thrust rumbling, turbopump whining, cryogenic venting, sonic booms & warning alarms
 */
class RocketSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Audio Nodes
  private masterGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private turbopumpGain: GainNode | null = null;
  private turbopumpOsc: OscillatorNode | null = null;
  private ventGain: GainNode | null = null;
  private alarmOsc: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;

  // Noise generator
  private noiseBuffer: AudioBuffer | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      // Create Brown/Pink Noise Buffer (5 seconds looped)
      const bufferSize = this.ctx.sampleRate * 4;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }

      // Noise generator for engine exhaust
      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = this.noiseBuffer;
      this.noiseSource.loop = true;

      // Rumble lowpass filter
      this.rumbleFilter = this.ctx.createBiquadFilter();
      this.rumbleFilter.type = 'lowpass';
      this.rumbleFilter.frequency.value = 200;
      this.rumbleFilter.Q.value = 2.0;

      this.rumbleGain = this.ctx.createGain();
      this.rumbleGain.gain.value = 0.0;

      this.noiseSource.connect(this.rumbleFilter);
      this.rumbleFilter.connect(this.rumbleGain);
      this.rumbleGain.connect(this.masterGain);
      this.noiseSource.start();

      // Turbopump Whine
      this.turbopumpOsc = this.ctx.createOscillator();
      this.turbopumpOsc.type = 'sawtooth';
      this.turbopumpOsc.frequency.value = 2800;

      const turbopumpFilter = this.ctx.createBiquadFilter();
      turbopumpFilter.type = 'bandpass';
      turbopumpFilter.frequency.value = 3200;
      turbopumpFilter.Q.value = 4.0;

      this.turbopumpGain = this.ctx.createGain();
      this.turbopumpGain.gain.value = 0.0;

      this.turbopumpOsc.connect(turbopumpFilter);
      turbopumpFilter.connect(this.turbopumpGain);
      this.turbopumpGain.connect(this.masterGain);
      this.turbopumpOsc.start();

      // Cryo Venting noise
      const ventFilter = this.ctx.createBiquadFilter();
      ventFilter.type = 'highpass';
      ventFilter.frequency.value = 1800;

      this.ventGain = this.ctx.createGain();
      this.ventGain.gain.value = 0.0;

      const ventNoise = this.ctx.createBufferSource();
      ventNoise.buffer = this.noiseBuffer;
      ventNoise.loop = true;
      ventNoise.connect(ventFilter);
      ventFilter.connect(this.ventGain);
      this.ventGain.connect(this.masterGain);
      ventNoise.start();

      // Thermal Overheat Alarm
      this.alarmOsc = this.ctx.createOscillator();
      this.alarmOsc.type = 'square';
      this.alarmOsc.frequency.value = 880;

      this.alarmGain = this.ctx.createGain();
      this.alarmGain.gain.value = 0.0;

      this.alarmOsc.connect(this.alarmGain);
      this.alarmGain.connect(this.masterGain);
      this.alarmOsc.start();

      this.isInitialized = true;
    } catch {
      console.warn('Web Audio not supported or waiting for user interaction.');
    }
  }

  public updateEngineSound(throttle: number, altitude: number, isVenting: boolean, isOverheating: boolean) {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // Atmospheric sound attenuation as air gets thin
    const atmoFactor = Math.max(0.15, Math.exp(-altitude / 30000));

    // Engine rumble
    if (this.rumbleGain && this.rumbleFilter) {
      const targetGain = throttle > 0 ? (0.2 + throttle * 0.8) * atmoFactor : 0.0;
      this.rumbleGain.gain.setTargetAtTime(targetGain, now, 0.05);

      const targetFreq = 120 + throttle * 320;
      this.rumbleFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
    }

    // Turbopump whine
    if (this.turbopumpGain && this.turbopumpOsc) {
      const turbopumpLevel = throttle > 0.05 ? Math.pow(throttle, 1.5) * 0.12 * atmoFactor : 0.0;
      this.turbopumpGain.gain.setTargetAtTime(turbopumpLevel, now, 0.1);
      this.turbopumpOsc.frequency.setTargetAtTime(2200 + throttle * 3000, now, 0.1);
    }

    // Cryogenic boil-off venting
    if (this.ventGain) {
      const ventLevel = isVenting ? 0.08 : 0.0;
      this.ventGain.gain.setTargetAtTime(ventLevel, now, 0.15);
    }

    // Thermal Overheat Klaxon
    if (this.alarmGain && this.alarmOsc) {
      if (isOverheating) {
        // Pulsing siren
        const pulse = Math.sin(now * 8.0) > 0 ? 0.25 : 0.0;
        this.alarmGain.gain.setTargetAtTime(pulse, now, 0.03);
      } else {
        this.alarmGain.gain.setTargetAtTime(0.0, now, 0.05);
      }
    }
  }

  public playSonicBoom() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.85);
    } catch {
      // Audio error fallback
    }
  }

  public playStageSep() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {
      // Audio fallback
    }
  }

  public playExplosion() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 1.5);

      gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 2.1);
    } catch {
      // Audio fallback
    }
  }

  public speak(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !this.isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.9;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const soundEngine = new RocketSoundEngine();
