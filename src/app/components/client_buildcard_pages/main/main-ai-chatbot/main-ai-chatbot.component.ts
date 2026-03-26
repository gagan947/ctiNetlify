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

interface FormattedMessageLine {
  type: 'text' | 'bullet';
  text: string;
}

interface ProjectMatchPayload {
  match?: boolean;
  score?: number;
  project?: {
    _id?: string;
    id?: string;
    projectName?: string;
    name?: string;
  };
}

interface GenerateInquiryResponse {
  success?: boolean;
  data?: {
    public_id?: string;
  };
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
  isBuildActionLoading = false;
  chatMessages: ChatMessage[] = [];
  currentLoaderText = '';
  followUpLoaderText = '';
  showBuildProjectButton = false;
  matchedProjectId = '';
  matchedProjectName = 'My Creative Project';
  lastUserPrompt = '';
  private buildButtonRequested = false;

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
    this.lastUserPrompt = prompt;
    this.showBuildProjectButton = false;
    this.buildButtonRequested = false;
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

    this.socket.on('projectMatch', (payload: ProjectMatchPayload) => {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const project = data?.project;

      this.matchedProjectId = String(project?._id ?? project?.id ?? '');
      this.matchedProjectName = project?.projectName ?? project?.name ?? 'My Creative Project';
      this.showBuildProjectButton = this.buildButtonRequested && !!this.matchedProjectId;
    });

    this.socket.on('showBuildButton', (show: boolean) => {
      this.buildButtonRequested = !!show;
      this.showBuildProjectButton = this.buildButtonRequested && !!this.matchedProjectId;
      this.followUpLoaderText = show ? 'Your project is ready to build.' : '';
      this.scrollChatToBottom();
    });
  }

  buildMatchedProject(): void {
    if (!this.matchedProjectId || this.isBuildActionLoading) {
      return;
    }

    this.isBuildActionLoading = true;

    this.apiService.postAPI<GenerateInquiryResponse, { sd: string; user_prompt: string }>('api/user/generateInquiry', {
      sd: this.matchedProjectId,
      user_prompt: this.lastUserPrompt
    }).subscribe({
      next: (response) => {
        const publicId = response?.data?.public_id;

        if (!publicId) {
          this.isBuildActionLoading = false;
          return;
        }

        const projectData = {
          clientEnquryId: publicId,
          projectName: this.matchedProjectName,
          projectId: this.matchedProjectId
        };

        sessionStorage.setItem('projectData', JSON.stringify(projectData));

        this.router.navigate(['/bd_loader'], {
          queryParams: {
            id: this.matchedProjectId,
            publicEnquiryId: publicId
          },
          skipLocationChange: true
        });
      },
      error: () => {
        this.isBuildActionLoading = false;
      }
    });
  }

  private pushAiMessage(text: string, variant: 'default' | 'error' = 'default'): void {
    const normalizedText = text.trim();
    const lastMessage = this.chatMessages[this.chatMessages.length - 1];

    if (
      lastMessage?.sender === 'ai' &&
      lastMessage.variant === variant &&
      lastMessage.text.trim() === normalizedText
    ) {
      return;
    }

    this.chatMessages = [
      ...this.chatMessages,
      { sender: 'ai', text: normalizedText, variant }
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

  formatMessage(text: string): FormattedMessageLine[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        if (line.startsWith('-')) {
          return { type: 'bullet', text: line.slice(1).trim() };
        }

        return { type: 'text', text: line };
      });
  }
}
