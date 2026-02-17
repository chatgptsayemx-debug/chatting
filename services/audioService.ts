
class AudioService {
  private sendSound: HTMLAudioElement;
  private receiveSound: HTMLAudioElement;

  constructor() {
    // Using standard notification sounds
    this.sendSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    this.receiveSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
  }

  playSend() {
    this.sendSound.currentTime = 0;
    this.sendSound.play().catch(e => console.debug('Audio blocked', e));
  }

  playReceive() {
    this.receiveSound.currentTime = 0;
    this.receiveSound.play().catch(e => console.debug('Audio blocked', e));
  }
}

export const audioService = new AudioService();
