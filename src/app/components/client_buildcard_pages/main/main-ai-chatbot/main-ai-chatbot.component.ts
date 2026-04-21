import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, input, Input, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { io } from 'socket.io-client';
import { SubscriptionModalService } from '../../../../services/subscription-modal.service';
declare var bootstrap: any;
interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  variant: 'default' | 'error';
  streamBlockId?: string;
  createdAt: number;
}

interface FormattedMessageLine {
  type: 'text' | 'bullet';
  text: string;
}

interface ProjectMatchPayload {
  match?: boolean;
  score?: number;
  finalSummary?: string;
  project?: {
    _id?: string;
    id?: string | number;
    projectName?: string;
    name?: string;
    description?: string;
    projectDescription?: string;
    descriptions?: string;
    type?: string;
    projectType?: string;
    tags?: string[];
    features?: any[];
    contain?: any[];
    projectImage?: string;
  };
}

interface TriggerBuildProjectPayload {
  finalIdea?: string;
  features?: any[];
  ideaType?: string;
  category?: string;
  description?: string;
  projectMatch?: ProjectMatchPayload;
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

interface PendingWorkspaceProjectTab {
  inquiryId: string;
  projectId?: string;
  projectName: string;
}

@Component({
  selector: 'app-main-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main-ai-chatbot.component.html',
  styleUrl: './main-ai-chatbot.component.css'
})
export class MainAiChatbotComponent implements OnInit, OnDestroy {
  private readonly pendingWorkspaceTabStorageKey = 'pendingWorkspaceProjectTab';
  @Input() initialPrompt = '';
  @Input() subsriptionPlan: any | null = null;
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('chatPromptInput') chatPromptInput?: ElementRef<HTMLTextAreaElement>;

  socket: any;
  readonly placeholderText = "Type your idea... we'll build it for you";
  promptText = '';
  isSubmitting = false;
  isBuildActionLoading = false;
  chatMessages: ChatMessage[] = [];
  currentLoaderText = '';
  showBuildProjectButton = false;
  matchedProjectId = '';
  matchedProjectName = 'My Creative Project';
  lastUserPrompt = '';
  matchedProject: ProjectMatchPayload['project'] | null = null;
  matchedProjectScore: number | null = null;
  private navigationSubscription?: Subscription;
  projectMatchPayload?: ProjectMatchPayload;
  constructor(
    private apiService: ApiService,
    private router: Router,
    private ngZone: NgZone,
    public subscriptionModalService: SubscriptionModalService
  ) { }

  ngOnInit(): void {
    this
    this.socket = io(this.apiService.apiUrl);
    this.registerSocketHandlers();
    this.watchPageChange();

    if (this.initialPrompt.trim()) {
      this.submitPrompt(this.initialPrompt);
      return;
    }

    this.focusInput();
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
    this.disconnectSocket();
  }

  @HostListener('window:beforeunload')
  handleWindowUnload(): void {
    this.disconnectSocket();
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
      { sender: 'user', text: prompt, variant: 'default', createdAt: Date.now() }
    ];
    this.lastUserPrompt = prompt;
    this.showBuildProjectButton = false;
    this.matchedProjectId = '';
    this.matchedProjectName = 'My Creative Project';
    this.matchedProject = null;
    this.matchedProjectScore = null;
    sessionStorage.removeItem('publicEnquiryId');
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
      console.log('navigateToBuilder', payload);
      this.ngZone.run(() => {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const projectId = String(data?.projectId ?? this.matchedProjectId ?? '');
        const publicEnquiryId = String(
          data?.publicEnquiryId ??
          data?.clientEnquryId ??
          data?.clientInquiryId ??
          data?.public_id ??
          ''
        );

        if (projectId) {
          this.persistMatchedProjectData(projectId, publicEnquiryId);
          this.router.navigate(['/bd_loader'], {
            queryParams: {
              id: projectId,
              ...(publicEnquiryId ? { publicEnquiryId } : {}),
              ...(this.projectMatchPayload?.finalSummary ? { finalSummary: this.projectMatchPayload.finalSummary } : {})
            },
            skipLocationChange: true
          });
        }
      });
    });

    this.socket.on('projectMatch', (payload: ProjectMatchPayload) => {
      console.log('projectMatch', payload);

      this.projectMatchPayload = payload;
      this.ngZone.run(() => {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        this.applyProjectMatch(data);
        this.showBuildProjectButton = true;
        this.isBuildActionLoading = false;
      });
    });

    this.socket.on('triggerBuildProject', (payload: TriggerBuildProjectPayload) => {
      this.ngZone.run(() => {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

        if (data?.projectMatch) {
          this.applyProjectMatch(data.projectMatch);
        }

        this.lastUserPrompt =
          data?.description?.trim() ||
          data?.finalIdea?.trim() ||
          this.lastUserPrompt;

        this.showBuildProjectButton = false;
        this.currentLoaderText = 'Starting your project build...';
        this.scrollChatToBottom();
        this.buildMatchedProject();
      });
    });

    this.socket.on('showBuildButton', (_show: boolean) => {
      this.ngZone.run(() => {
        this.showBuildProjectButton = true;
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

  private watchPageChange(): void {
    this.navigationSubscription = this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe(() => {
        this.disconnectSocket();
      });
  }

  private disconnectSocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  private completeLoadingState(): void {
    this.isSubmitting = false;
    this.currentLoaderText = '';
    this.scrollChatToBottom();
  }

  getCurrentCreditBalance(): number {
    return Number((this.subsriptionPlan as any)?.creditBalance || 0);
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
        { sender: 'ai', text: content, variant: 'default', streamBlockId: blockId, createdAt: Date.now() }
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
    if (!this.socket || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.currentLoaderText = 'Refining your project direction...';
    this.showBuildProjectButton = false;
    this.scrollChatToBottom();
    this.socket.emit('skipBuild');
  }

  buildMatchedProject(): void {

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
          ...this.buildProjectData(this.matchedProjectId, publicId)
        };

        sessionStorage.setItem('projectData', JSON.stringify(projectData));
        this.storePendingWorkspaceTab({
          inquiryId: publicId,
          projectId: this.matchedProjectId,
          projectName: projectData.projectName
        });

        this.router.navigate(['/bd_loader'], {
          queryParams: {
            id: this.matchedProjectId,
            publicEnquiryId: publicId,
            finalSummary: this.projectMatchPayload?.finalSummary ?? undefined
          },
          skipLocationChange: true
        });
      },
      error: (err) => {
        this.isBuildActionLoading = false;
        if (err?.error?.type === 'INSUFFICIENT_BALANCE') {
          this.openBootstrapModal('insufficientCreditsModal', { backdrop: 'static', keyboard: true });
        }
      }
    });
  }

  private persistMatchedProjectData(projectId: string, publicEnquiryId?: string): void {
    const projectData = this.buildProjectData(projectId, publicEnquiryId);
    sessionStorage.setItem('projectData', JSON.stringify(projectData));

    if (publicEnquiryId) {
      this.storePendingWorkspaceTab({
        inquiryId: publicEnquiryId,
        projectId,
        projectName: projectData.projectName
      });
    }
  }

  private buildProjectData(projectId: string, publicEnquiryId?: string) {
    const project = this.matchedProject ?? {};
    const projectDescription =
      project.projectDescription ??
      project.description ??
      project.descriptions ??
      '';
    const projectType = project.projectType ?? project.type ?? '';
    const selectedFeatures = Array.isArray(project.features)
      ? project.features
      : Array.isArray(project.contain)
        ? project.contain
        : [];

    return {
      clientEnquryId: publicEnquiryId || sessionStorage.getItem('publicEnquiryId') || '',
      projectId,
      projectName: project.projectName ?? project.name ?? this.matchedProjectName,
      projectDescription,
      description: projectDescription,
      projectType,
      type: projectType,
      projectLogo: project.projectImage ?? null,
      selectdFeature: selectedFeatures,
      features: selectedFeatures,
      no_of_features: selectedFeatures.length,
      matchedTags: Array.isArray(project.tags) ? project.tags : [],
      projectMatchScore: this.matchedProjectScore,
      matchedProject: project
    };
  }

  private storePendingWorkspaceTab(tab: PendingWorkspaceProjectTab): void {
    sessionStorage.setItem(this.pendingWorkspaceTabStorageKey, JSON.stringify(tab));
  }

  private applyProjectMatch(payload?: ProjectMatchPayload | null): void {
    const project = payload?.project;

    this.matchedProjectId = String(project?._id ?? project?.id ?? '');
    this.matchedProjectName = project?.projectName ?? project?.name ?? '';
    this.matchedProject = project ?? null;
    this.matchedProjectScore = typeof payload?.score === 'number' ? payload.score : null;
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
      { sender: 'ai', text: normalizedText, variant, createdAt: Date.now() }
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

  formatMessageTime(timestamp: number): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(timestamp);
  }

  private openBootstrapModal(modalId: string, options?: { backdrop?: boolean | 'static'; keyboard?: boolean }) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      return;
    }

    bootstrap.Modal.getOrCreateInstance(modalElement, {
      backdrop: options?.backdrop ?? true,
      keyboard: options?.keyboard ?? true
    }).show();
  }
}
