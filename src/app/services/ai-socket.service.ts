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

    this.socket.on("ai:stream", (data) => {
      let block = this.blocks.find(b => b.id === data.blockId);

      if (!block) {
        block = { id: data.blockId, text: "", done: false };

        if (this.blocks.length > 0) {
          this.blocks = this.blocks.filter(item => item.id !== 'loader');
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
    this.socket.off('ai:stream');
    this.socket.off('ai:done');
    this.blocks = [];
    this.listening = false;
  }


}
