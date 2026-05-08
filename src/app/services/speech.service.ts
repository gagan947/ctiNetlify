import { Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

export interface SpeechStartCallbacks {
  onText: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechService {

  recognition: any;

  isListening = false;

  finalTranscript = '';

  constructor(private message: NzMessageService) { }

  start(callbacks: SpeechStartCallbacks): boolean {

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {

      this.message.warning('Voice input is not supported in this browser.');
      callbacks.onError?.();

      return false;
    }

    if (this.isListening) {
      callbacks.onListeningChange?.(true);
      return false;
    }

    this.recognition = new SpeechRecognition();

    this.recognition.lang =
      navigator.language || 'en-US';

    this.recognition.interimResults = true;

    this.recognition.continuous = true;

    this.recognition.maxAlternatives = 1;

    this.finalTranscript = '';

    this.recognition.onstart = () => {

      console.log('Speech started');

      this.isListening = true;
      callbacks.onListeningChange?.(true);
    };

    this.recognition.onresult = (event: any) => {
      const finalChunks: string[] = [];
      const interimChunks: string[] = [];

      for (let i = 0; i < event.results.length; i++) {
        const chunk = this.normalizeChunk(event.results[i][0].transcript);

        if (!chunk) {
          continue;
        }

        if (event.results[i].isFinal) {
          finalChunks.push(chunk);
          continue;
        }

        interimChunks.push(chunk);
      }

      this.finalTranscript = this.mergeChunks(finalChunks);
      const interimTranscript = this.mergeChunks(interimChunks);
      const combinedTranscript = this.mergeChunks([
        this.finalTranscript,
        interimTranscript
      ]);

      callbacks.onText(combinedTranscript);

    };

    this.recognition.onerror = (event: any) => {

      console.error('Speech error', event);

      this.isListening = false;
      callbacks.onListeningChange?.(false);
      callbacks.onError?.();
      this.cleanupRecognition();

      this.showSpeechError(event?.error);
    };

    this.recognition.onend = () => {

      console.log('Speech ended');

      this.isListening = false;
      callbacks.onListeningChange?.(false);
      this.cleanupRecognition();
    };

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Speech start failed', error);
      this.isListening = false;
      callbacks.onError?.();
      this.cleanupRecognition();
      this.message.error('Voice input could not start. Please try again.');
      return false;
    }
  }

  stop(): void {

    if (this.recognition) {

      this.recognition.stop();

      this.isListening = false;
      this.cleanupRecognition();
    }
  }

  private showSpeechError(errorCode?: string): void {
    switch (errorCode) {
      case 'not-allowed':
      case 'service-not-allowed':
        this.message.error('Microphone access blocked. Please allow mic permission.');
        break;
      case 'audio-capture':
        this.message.error('No microphone was found on this device.');
        break;
      case 'no-speech':
        this.message.warning('No voice detected. Please try again.');
        break;
      default:
        this.message.error('Voice input could not start. Please try again.');
        break;
    }
  }

  private normalizeChunk(chunk: string): string {
    return chunk
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mergeChunks(chunks: string[]): string {
    let merged = '';

    for (const chunk of chunks) {
      if (!chunk) {
        continue;
      }

      merged = this.mergeWithOverlap(merged, chunk);
    }

    return this.normalizeChunk(merged);
  }

  private mergeWithOverlap(base: string, addition: string): string {
    const normalizedBase = this.normalizeChunk(base);
    const normalizedAddition = this.normalizeChunk(addition);

    if (!normalizedBase) {
      return normalizedAddition;
    }

    if (!normalizedAddition) {
      return normalizedBase;
    }

    if (normalizedBase === normalizedAddition) {
      return normalizedBase;
    }

    if (normalizedAddition.startsWith(normalizedBase)) {
      return normalizedAddition;
    }

    if (normalizedBase.startsWith(normalizedAddition)) {
      return normalizedBase;
    }

    const baseWords = normalizedBase.split(' ');
    const additionWords = normalizedAddition.split(' ');
    const maxOverlap = Math.min(baseWords.length, additionWords.length);

    for (let overlap = maxOverlap; overlap > 0; overlap--) {
      const baseTail = baseWords.slice(-overlap).join(' ').toLowerCase();
      const additionHead = additionWords.slice(0, overlap).join(' ').toLowerCase();

      if (baseTail === additionHead) {
        return `${normalizedBase} ${additionWords.slice(overlap).join(' ')}`.trim();
      }
    }

    return `${normalizedBase} ${normalizedAddition}`.trim();
  }

  private cleanupRecognition(): void {
    if (!this.recognition) {
      return;
    }

    this.recognition.onstart = null;
    this.recognition.onresult = null;
    this.recognition.onerror = null;
    this.recognition.onend = null;
    this.recognition = null;
  }
}
