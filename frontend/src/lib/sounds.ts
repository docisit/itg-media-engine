/**
 * Sound Effects Manager for Interactive UI
 * Provides engaging audio feedback for high school athletes
 */

export type SoundType = 
  | 'click' 
  | 'vote' 
  | 'success' 
  | 'error' 
  | 'message' 
  | 'notification'
  | 'levelUp'
  | 'achievement'
  | 'cheer'
  | 'whistle'
  | 'buzzer'
  | 'crowd';

export interface SoundConfig {
  volume: number;
  enabled: boolean;
  vibration: boolean;
}

class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private config: SoundConfig = {
    volume: 0.7,
    enabled: true,
    vibration: true
  };

  private constructor() {
    this.initializeAudioContext();
    this.preloadSounds();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initializeAudioContext(): void {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
      }
    }
  }

  private async preloadSounds(): Promise<void> {
    if (!this.audioContext) return;

    const soundFiles: Record<SoundType, string> = {
      click: '/sounds/click.mp3',
      vote: '/sounds/vote.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      message: '/sounds/message.mp3',
      notification: '/sounds/notification.mp3',
      levelUp: '/sounds/level-up.mp3',
      achievement: '/sounds/achievement.mp3',
      cheer: '/sounds/cheer.mp3',
      whistle: '/sounds/whistle.mp3',
      buzzer: '/sounds/buzzer.mp3',
      crowd: '/sounds/crowd.mp3'
    };

    for (const [type, url] of Object.entries(soundFiles)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds.set(type as SoundType, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound ${type}:`, error);
        // Generate fallback sounds
        this.generateFallbackSound(type as SoundType);
      }
    }
  }

  private generateFallbackSound(type: SoundType): void {
    if (!this.audioContext) return;

    const buffer = this.audioContext.createBuffer(1, 22050, 22050);
    const data = buffer.getChannelData(0);

    switch (type) {
      case 'click':
        // Short click sound
        for (let i = 0; i < 2205; i++) {
          data[i] = Math.random() * 0.1;
        }
        break;
      case 'vote':
        // Positive voting sound
        for (let i = 0; i < 4410; i++) {
          data[i] = Math.sin(i * 0.1) * 0.2;
        }
        break;
      case 'success':
        // Success chime
        for (let i = 0; i < 8820; i++) {
          data[i] = Math.sin(i * 0.05) * 0.3;
        }
        break;
      default:
        // Generic beep
        for (let i = 0; i < 2205; i++) {
          data[i] = Math.sin(i * 0.2) * 0.1;
        }
    }

    this.sounds.set(type, buffer);
  }

  play(soundType: SoundType, options?: { volume?: number; vibration?: boolean }): void {
    if (!this.config.enabled || !this.audioContext) return;

    const buffer = this.sounds.get(soundType);
    if (!buffer) {
      console.warn(`Sound ${soundType} not loaded`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = options?.volume ?? this.config.volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);

    // Trigger vibration if enabled
    if ((options?.vibration ?? this.config.vibration) && 'vibrate' in navigator) {
      this.vibrate(soundType);
    }
  }

  private vibrate(soundType: SoundType): void {
    if (!('vibrate' in navigator)) return;

    const patterns: Record<SoundType, number | number[]> = {
      click: 10,
      vote: [50, 30, 50],
      success: [100, 50, 100],
      error: [200, 100, 200, 100],
      message: 30,
      notification: [100, 50],
      levelUp: [50, 100, 50, 100],
      achievement: [100, 50, 100, 50, 100],
      cheer: [30, 30, 30, 30, 30],
      whistle: 150,
      buzzer: 300,
      crowd: [50, 50, 50, 50, 50]
    };

    const pattern = patterns[soundType] || 50;
    navigator.vibrate(pattern);
  }

  setConfig(config: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SoundConfig {
    return { ...this.config };
  }

  toggleEnabled(): boolean {
    this.config.enabled = !this.config.enabled;
    return this.config.enabled;
  }

  toggleVibration(): boolean {
    this.config.vibration = !this.config.vibration;
    return this.config.vibration;
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }
}

export const soundManager = SoundManager.getInstance();

/**
 * React hook for using sound effects
 */
export function useSound() {
  const playSound = (soundType: SoundType, options?: { volume?: number; vibration?: boolean }) => {
    soundManager.play(soundType, options);
  };

  const toggleSound = () => soundManager.toggleEnabled();
  const toggleVibration = () => soundManager.toggleVibration();
  const setVolume = (volume: number) => soundManager.setVolume(volume);

  return {
    playSound,
    toggleSound,
    toggleVibration,
    setVolume,
    config: soundManager.getConfig()
  };
}

/**
 * Predefined sound effects for common actions
 */
export const sounds = {
  click: () => soundManager.play('click'),
  vote: () => soundManager.play('vote'),
  success: () => soundManager.play('success'),
  error: () => soundManager.play('error'),
  message: () => soundManager.play('message'),
  notification: () => soundManager.play('notification'),
  levelUp: () => soundManager.play('levelUp'),
  achievement: () => soundManager.play('achievement'),
  cheer: () => soundManager.play('cheer'),
  whistle: () => soundManager.play('whistle'),
  buzzer: () => soundManager.play('buzzer'),
  crowd: () => soundManager.play('crowd')
};