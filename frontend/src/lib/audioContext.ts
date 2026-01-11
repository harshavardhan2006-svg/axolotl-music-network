class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isUnlocked = false;

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  async unlockAudio(): Promise<void> {
    if (this.isUnlocked) return;

    try {
      // Create audio context if it doesn't exist
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isUnlocked = true;
      console.log('Audio context unlocked');
    } catch (error) {
      console.error('Failed to unlock audio context:', error);
    }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }
}

export const audioContextManager = AudioContextManager.getInstance();

// Auto-unlock on first user interaction
const unlockOnInteraction = () => {
  audioContextManager.unlockAudio();
  // Remove listeners after first interaction
  document.removeEventListener('click', unlockOnInteraction);
  document.removeEventListener('touchstart', unlockOnInteraction);
  document.removeEventListener('keydown', unlockOnInteraction);
};

// Add listeners for user interaction
document.addEventListener('click', unlockOnInteraction);
document.addEventListener('touchstart', unlockOnInteraction);
document.addEventListener('keydown', unlockOnInteraction);