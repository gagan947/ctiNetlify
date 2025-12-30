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
  constructor(private apiService: ApiService) {
    this.socket = io(this.apiService.apiUrl);

    // 🔥 VERY IMPORTANT
   this.socket.on('connect', () => {
    this.socketReady$.next(this.socket.id);
  });
  }
  

  listen(cb: (blocks: any[]) => void) {
  
    this.socket.on("ai:stream", (data) => {
        // console.log(data);
      let block = this.blocks.find(b => b.id === data.blockId);

      if (!block) {
        block = { id: data.blockId, text: "", done: false };
      
        if(this.blocks.length > 0 ){
          this.blocks = this.blocks.filter(items=>items.id !== 'loader');
         
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
}
