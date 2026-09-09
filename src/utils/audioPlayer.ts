// Perkhidmatan audio bersuara untuk warga emas dengan sokongan Bahasa Melayu dan penjejakan ayat langsung

export type VoiceGender = 'natural' | 'gentle-female' | 'clear-male';

class SeniorAudioService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private speedMultiplier = 0.88; // Kelajuan sedikit perlahan lebih mudah difahami oleh pendengaran warga emas
  private availableVoices: SpeechSynthesisVoice[] = [];
  private onStateChangeCallback: ((speaking: boolean) => void) | null = null;
  private onSentenceCallback: ((sentenceIndex: number) => void) | null = null;
  private sentences: string[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.availableVoices = this.synth.getVoices();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  public setSpeed(speed: 'slow' | 'normal' | 'fast') {
    if (speed === 'slow') this.speedMultiplier = 0.78;
    else if (speed === 'normal') this.speedMultiplier = 0.88;
    else this.speedMultiplier = 1.05;

    // Jika sedang bersuara, mulakan semula dengan kelajuan baharu
    if (this.isSpeaking && this.currentUtterance && this.sentences.length > 0) {
      const fullText = this.sentences.join(' ');
      this.speakText(fullText, this.onSentenceCallback || undefined);
    }
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public setOnStateChange(callback: (speaking: boolean) => void) {
    this.onStateChangeCallback = callback;
  }

  // Hentikan sebarang audio yang sedang dimainkan
  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(false);
    }
  }

  public pause() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    } else if (this.synth && this.isSpeaking) {
      this.synth.pause();
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    }
  }

  public resume() {
    if (this.currentAudioElement && this.currentAudioElement.paused) {
      this.currentAudioElement.play();
      this.isSpeaking = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    } else if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isSpeaking = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  // Pecahkan teks mengikut ayat untuk sorotan teks secara langsung
  public splitSentences(text: string): string[] {
    const raw = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
    if (!raw) return [text];
    return raw.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // Dapatkan suara Bahasa Melayu atau Bahasa Nusantara
  private getMalayVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    // Cari suara ms (Melayu Malaysia) dahulu, atau id (Indonesia) kerana fonetik hampir sama
    const malayVoice =
      voices.find((v) => v.lang.startsWith('ms')) ||
      voices.find((v) => v.lang.startsWith('id')) ||
      voices.find((v) => v.name.toLowerCase().includes('malay') || v.name.toLowerCase().includes('melayu')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null;

    return malayVoice;
  }

  // Bersihkan teks ucapan agar sebutan audio dalam Bahasa Melayu kedengaran jelas dan lancar
  public cleanMalaySpeechText(text: string): string {
    if (!text) return '';
    return text
      // Normalisasikan unit ubat ke sebutan perkataan Bahasa Melayu penuh
      .replace(/(\d+)\s*mg\b/gi, '$1 miligram')
      .replace(/(\d+)\s*ml\b/gi, '$1 mililiter')
      .replace(/(\d+)\s*mcg\b/gi, '$1 mikrogram')
      .replace(/(\d+)\s*g\b/gi, '$1 gram')
      .replace(/(\d+)\s*tab\b/gi, '$1 biji')
      .replace(/(\d+)\s*cap\b/gi, '$1 kapsul')
      .replace(/(\d+)\s*x\s*sehari/gi, '$1 kali sehari')
      .replace(/(\d+)\s*kali\s*sehari/gi, '$1 kali sehari')
      .replace(/Rx\s*[-#:]?\s*(\w+)/gi, 'Nombor preskripsi $1')
      .replace(/Dr\.\s*/g, 'Doktor ')
      .replace(/&/g, 'dan ')
      .replace(/%/g, ' peratus');
  }

  // Baca teks dengan penjejakan sorotan ayat langsung
  public speakText(
    text: string,
    onSentenceChange?: (index: number) => void,
    onFinished?: () => void
  ) {
    this.stop();

    if (!this.synth) {
      console.warn('SpeechSynthesis tidak disokong pada pelayar ini.');
      return;
    }

    this.sentences = this.splitSentences(text);
    this.onSentenceCallback = onSentenceChange || null;

    const speechSpokenText = this.cleanMalaySpeechText(text);
    const utterance = new SpeechSynthesisUtterance(speechSpokenText);
    this.currentUtterance = utterance;

    utterance.rate = this.speedMultiplier;
    utterance.pitch = 1.0;
    utterance.lang = 'ms-MY';

    const preferredVoice = this.getMalayVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    let charOffset = 0;
    const sentenceOffsets: { start: number; end: number; index: number }[] = [];
    for (let i = 0; i < this.sentences.length; i++) {
      const s = this.sentences[i];
      const start = text.indexOf(s, charOffset);
      const end = start + s.length;
      sentenceOffsets.push({ start, end, index: i });
      charOffset = end;
    }

    utterance.onboundary = (event) => {
      if (event.name === 'sentence' || event.name === 'word') {
        const charIdx = event.charIndex;
        const matched = sentenceOffsets.find(
          (o) => charIdx >= o.start && charIdx <= o.end
        );
        if (matched && onSentenceChange) {
          onSentenceChange(matched.index);
        }
      }
    };

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
      if (onSentenceChange) onSentenceChange(0);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (onSentenceChange) onSentenceChange(-1);
      if (onFinished) onFinished();
    };

    utterance.onerror = (e) => {
      console.warn('Ralat sintesis suara:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (onSentenceChange) onSentenceChange(-1);
      if (onFinished) onFinished();
    };

    this.synth.speak(utterance);
  }

  // Mainkan audio fail base64 jika ada
  public playBase64Audio(
    base64Data: string,
    mimeType = 'audio/wav',
    onFinished?: () => void
  ) {
    this.stop();
    const audioUrl = `data:${mimeType};base64,${base64Data}`;
    const audio = new Audio(audioUrl);
    this.currentAudioElement = audio;
    audio.playbackRate = this.speedMultiplier;

    audio.onplay = () => {
      this.isSpeaking = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    };

    audio.onended = () => {
      this.isSpeaking = false;
      this.currentAudioElement = null;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (onFinished) onFinished();
    };

    audio.onerror = (e) => {
      console.error('Ralat audio:', e);
      this.isSpeaking = false;
      this.currentAudioElement = null;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (onFinished) onFinished();
    };

    audio.play().catch((err) => {
      console.warn('Gagal memainkan audio:', err);
    });
  }

  // Pengesahan suara ringkas untuk warga emas dalam Bahasa Melayu
  public announcePrompt(message: string) {
    if (!this.synth) return;
    const promptUtterance = new SpeechSynthesisUtterance(message);
    promptUtterance.rate = 0.95;
    promptUtterance.pitch = 1.0;
    promptUtterance.lang = 'ms-MY';
    const preferredVoice = this.getMalayVoice();
    if (preferredVoice) promptUtterance.voice = preferredVoice;
    this.synth.speak(promptUtterance);
  }
}

export const seniorAudio = new SeniorAudioService();
