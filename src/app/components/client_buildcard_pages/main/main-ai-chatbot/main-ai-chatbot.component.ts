import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { io } from 'socket.io-client';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  variant: 'default' | 'error';
}

@Component({
  selector: 'app-main-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main-ai-chatbot.component.html',
  styleUrl: './main-ai-chatbot.component.css'
})
export class MainAiChatbotComponent implements OnInit, OnDestroy {
  @Input() initialPrompt = '';
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('chatPromptInput') chatPromptInput?: ElementRef<HTMLTextAreaElement>;

  socket: any;
  promptText = '';
  isSubmitting = false;
  chatMessages: ChatMessage[] = [];
  currentLoaderText = '';
  followUpLoaderText = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.socket = io(this.apiService.apiUrl);
    this.registerSocketHandlers();

    if (this.initialPrompt.trim()) {
      this.submitPrompt(this.initialPrompt);
      return;
    }

    this.focusInput();
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }

  handlePromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitPrompt();
    }
  }

  submitPrompt(promptOverride?: string): void {
    const prompt = (promptOverride ?? this.promptText).trim().replace(/\s+/g, ' ');
    if (!prompt || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.currentLoaderText = 'Thinking...';
    this.followUpLoaderText = '';
    this.chatMessages = [
      ...this.chatMessages,
      { sender: 'user', text: prompt, variant: 'default' }
    ];
    this.promptText = '';
    this.scrollChatToBottom();

    this.socket?.emit('chatMessage', prompt);
  }

  private registerSocketHandlers(): void {
    this.socket.on('loader_message', (message: string) => {
      this.currentLoaderText = message || 'Thinking...';
      this.scrollChatToBottom();
    });

    this.socket.on('botReply', (message: string) => {
      this.isSubmitting = false;
      this.currentLoaderText = '';
      this.followUpLoaderText = '';
      this.pushAiMessage(message);
      this.focusInput();
    });

    this.socket.on('navigateToBuilder', (payload: any) => {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

      if (data?.projectId) {
        this.router.navigate(['/bd_loader'], {
          queryParams: { id: data.projectId },
          skipLocationChange: true
        });
      }
    });

    this.socket.on('showBuildButton', (show: boolean) => {
      this.followUpLoaderText = show ? 'Ready to build your project' : '';
      this.scrollChatToBottom();
    });
  }

  private pushAiMessage(text: string, variant: 'default' | 'error' = 'default'): void {
    this.chatMessages = [
      ...this.chatMessages,
      { sender: 'ai', text, variant }
    ];
    this.scrollChatToBottom();
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const container = this.chatScroll?.nativeElement;
      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }, 0);
  }

  private focusInput(): void {
    setTimeout(() => this.chatPromptInput?.nativeElement.focus(), 0);
  }
}
