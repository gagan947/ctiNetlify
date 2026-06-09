import { Injectable } from "@angular/core";
import { io } from 'socket.io-client';
import { ApiService } from "./api.service";
import { BehaviorSubject } from "rxjs";
@Injectable({ providedIn: 'root' })
export class AiSocketService {
  socket;
  blocks: any[] = [];
  socketId!: any;
  socketReady$ = new BehaviorSubject<string | undefined>(undefined);
  private listening = false;

  constructor(private apiService: ApiService) {
    this.socket = io(this.apiService.apiUrl);

    // 🔥 VERY IMPORTANT
    this.socket.on('connect', () => {
      this.socketId = this.socket.id;           // ✅ FIXED
      this.socketReady$.next(this.socket.id);
    });

  }


  listen(cb: (blocks: any[]) => void) {

    // 🔥 Prevent duplicate listeners
    if (this.listening) return;
    this.listening = true;

    this.socket.on("ai:reset", () => {
      this.blocks = [];
      cb([]);
    });

    this.socket.on("ai:stream", (data) => {
      let block = this.blocks.find(b => b.id === data.blockId);

      if (!block) {
        block = { id: data.blockId, text: "", done: false, timestamp: new Date() };

        if (this.blocks.length > 0) {
          // this.blocks = this.blocks.filter(item => item.id !== 'loader');
          this.blocks = this.blocks.filter(item => !item.id.startsWith('status'));
        }

        this.blocks.push(block);
      }

      block.text = data.content;
      block.done = !!data.done;

      cb(this.blocks);
    });

    this.socket.on("ai:done", () => {
      console.log("✅ AI finished");
    });
  }

  getSocketId(): string | null {
    return this.socketId;
  }

  /** 🔥 cleanup hook */
  stop() {
    console.log("stopeed");
    this.socket.off('ai:stream');
    this.socket.off('ai:done');
    this.blocks = [];
    this.listening = false;
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }




  getRegenCommands(buildId: number): string[] {
    const variants = [
      {
        theme: 'modern',
        layout: 'spacing',
        style: 'refresh'
      },
      {
        theme: 'minimal',
        layout: 'density',
        style: 'polish'
      },
      {
        theme: 'bold',
        layout: 'hierarchy',
        style: 'contrast'
      },
      {
        theme: 'clean',
        layout: 'alignment',
        style: 'refine'
      }
    ];

    const v = variants[buildId % variants.length];

    return [
      `$ ai theme --switch=${v.theme}`,
      `$ ai layout --optimize=${v.layout}`,
      `$ ai style --${v.style}`
    ];
  }
  emitCodeDone() {
    console.log('emit done');

    if (this.socket.connected) {
      console.log('already connected', this.socket.id);
      this.socket.emit('ai:code:done');
      return;
    }

    this.socket.once('connect', () => {
      console.log('connected later', this.socket.id);
      this.socket.emit('ai:code:done');
    });
  }
}
