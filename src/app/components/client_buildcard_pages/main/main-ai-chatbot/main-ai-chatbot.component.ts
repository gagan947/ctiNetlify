import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { io } from 'socket.io-client';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  variant: 'default' | 'error';
  streamBlockId?: string;
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

interface AiStreamPayload {
  blockId?: string;
  content?: string;
  done?: boolean;
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
  readonly placeholderText = 'Describe the project you want to build';
  promptText = '';
  isSubmitting = false;
  isBuildActionLoading = false;
  chatMessages: ChatMessage[] = [];
  currentLoaderText = '';
  showBuildProjectButton = false;
  matchedProjectId = '';
  matchedProjectName = 'My Creative Project';
  lastUserPrompt = '';
  private buildButtonRequested = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private ngZone: NgZone
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
    this.currentLoaderText = '';
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
    this.socket.on('ai:stream', (payload: AiStreamPayload) => {
      this.ngZone.run(() => {
        this.handleAiStream(payload);
      });
    });

    this.socket.on('loader_message', (message: string) => {
      this.ngZone.run(() => {
        this.currentLoaderText = message || '';
        this.scrollChatToBottom();
      });
    });

    this.socket.on('botReply', (message: string) => {
      this.ngZone.run(() => {
        this.isSubmitting = false;
        this.currentLoaderText = '';
        this.pushAiMessage(message);
        this.focusInput();
        this.scrollChatToBottom();
      });
    });

    this.socket.on('navigateToBuilder', (payload: any) => {
      this.ngZone.run(() => {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

        if (data?.projectId) {
          this.router.navigate(['/bd_loader'], {
            queryParams: { id: data.projectId },
            skipLocationChange: true
          });
        }
      });
    });

    this.socket.on('projectMatch', (payload: ProjectMatchPayload) => {
      this.ngZone.run(() => {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const project = data?.project;

        this.matchedProjectId = String(project?._id ?? project?.id ?? '');
        this.matchedProjectName = project?.projectName ?? project?.name ?? 'My Creative Project';
        this.showBuildProjectButton = this.buildButtonRequested && !!this.matchedProjectId;
      });
    });

    this.socket.on('showBuildButton', (show: boolean) => {
      this.ngZone.run(() => {
        this.buildButtonRequested = !!show;
        this.showBuildProjectButton = this.buildButtonRequested && !!this.matchedProjectId;
        this.completeLoadingState();
      });
    });

    this.socket.on('botDone', () => {
      this.ngZone.run(() => {
        this.completeLoadingState();
      });
    });

    this.socket.on('loader_done', () => {
      this.ngZone.run(() => {
        this.completeLoadingState();
      });
    });

    this.socket.on('chat_complete', () => {
      this.ngZone.run(() => {
        this.completeLoadingState();
      });
    });
  }

  private completeLoadingState(): void {
    this.isSubmitting = false;
    this.currentLoaderText = '';
    this.scrollChatToBottom();
  }

  private handleAiStream(payload: AiStreamPayload): void {
    const blockId = payload?.blockId?.trim();
    const content = payload?.content ?? '';

    this.isSubmitting = false;
    this.currentLoaderText = '';

    if (!blockId) {
      if (content) {
        this.pushAiMessage(content);
      }
      return;
    }

    let targetMessageIndex = this.chatMessages.findIndex(
      (message) => message.sender === 'ai' && message.streamBlockId === blockId
    );

    if (targetMessageIndex === -1) {
      if (!content) {
        return;
      }

      this.chatMessages = [
        ...this.chatMessages,
        { sender: 'ai', text: content, variant: 'default', streamBlockId: blockId }
      ];
      targetMessageIndex = this.chatMessages.length - 1;
    } else if (content) {
      this.chatMessages = this.chatMessages.map((message, index) =>
        index === targetMessageIndex
          ? { ...message, text: content }
          : message
      );
    }

    if (payload?.done && targetMessageIndex !== -1) {
      this.chatMessages = this.chatMessages.map((message, index) =>
        index === targetMessageIndex
          ? { ...message, streamBlockId: undefined }
          : message
      );
    }

    this.focusInput();
    this.scrollChatToBottom();
  }

  skipBuildProject(): void {
    this.showBuildProjectButton = false;
    this.buildButtonRequested = false;

    this.pushAiMessage(
      `No problem. We can keep refining ${this.matchedProjectName} here until it feels right. ` +
      `Share any changes you want in features, flow, design style, or target users, and I will help shape it further.`
    );
    this.focusInput();
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
