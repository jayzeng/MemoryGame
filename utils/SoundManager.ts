type SpeakOptions = {
  onEnd?: () => void;
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private synth: SpeechSynthesis;

  constructor() {
    this.synth = window.speechSynthesis;
    try {
      // Initialize AudioContext on user interaction if needed
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private ensureContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public speak(text: string, options?: SpeakOptions) {
    if (this.isMuted || !this.synth) return;

    // Cancel any currently speaking utterance to avoid queue buildup
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for kids
    utterance.pitch = 1.1; // Slightly higher/friendlier
    utterance.volume = 0.8;
    
    // Try to find a friendly English voice
    const voices = this.synth.getVoices();
    const friendlyVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (friendlyVoice) utterance.voice = friendlyVoice;

    if (options?.onEnd) {
      utterance.addEventListener('end', () => {
        options.onEnd?.();
      });
    }

    this.synth.speak(utterance);
  }

  public playFlip() {
    if (this.isMuted || !this.audioContext) return;
    this.ensureContext();
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
    
    // Reduced volume so it doesn't overpower the voice
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  public playMatch() {
    if (this.isMuted || !this.audioContext) return;
    this.ensureContext();

    // Play a pleasant major third "ding"
    this.playTone(523.25, 0.3, 'sine'); // C5
    setTimeout(() => this.playTone(659.25, 0.4, 'sine'), 100); // E5
  }

  public playMismatch() {
    if (this.isMuted || !this.audioContext) return;
    this.ensureContext();

    // Gentle low "boop"
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  public playWin() {
    if (this.isMuted || !this.audioContext) return;
    this.ensureContext();

    // Arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.4, 'triangle'), i * 150);
    });
  }

  private playTone(freq: number, duration: number, type: OscillatorType) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public stopSpeaking() {
    if (!this.synth) return;
    this.synth.cancel();
  }
}

export const soundManager = new SoundManager();
