import { Injectable } from '@angular/core';
declare var webkitSpeechRecognition: any;
@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  recognition: any;
  isListening = false;

  start(callback: (text: string) => void) {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();

    this.recognition.lang =
      navigator.language || 'en-US';

    this.recognition.interimResults = true;

    this.recognition.continuous = false;

    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      let transcript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      callback(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error(event);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
