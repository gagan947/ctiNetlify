import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { ProjectGenerationTabStateService } from '../../../../services/project-generation-tab-state.service';
import { io } from 'socket.io-client';
import { SubscriptionModalService } from '../../../../services/subscription-modal.service';
import { SpeechService } from '../../../../services/speech.service';
import { NzMessageService } from 'ng-zorro-antd/message';
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
  finalPrompt?: string;
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
  message?: string;
  data?: {
    public_id?: string;
  };
}

interface AiStreamPayload {
  blockId?: string;
  content?: string;
  done?: boolean;
}

interface ConversationResumePayload {
  conversationId?: string;
  source?: 'memory' | 'database' | 'fresh' | string;
  state?: Record<string, any> | null;
  messages?: any[];
}

@Component({
  selector: 'app-main-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main-ai-chatbot.component.html',
  styleUrl: './main-ai-chatbot.component.css'
})
export class MainAiChatbotComponent implements OnInit, OnDestroy {
  private readonly conversationStorageKey = 'conversationId';
  private readonly resumeFallbackDelayMs = 1500;
  @Input() initialPrompt = '';
  @Input() subsriptionPlan: any | null = null;
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('chatPromptInput') chatPromptInput?: ElementRef<HTMLTextAreaElement>;

  socket: any;
  readonly placeholderText = "Type your idea... we'll build it for you";
  promptText = '';
  voiceDraftText = '';
  isVoiceDraftActive = false;
  isVoiceUiVisible = false;
  isVoiceStarting = false;
  isSubmitting = false;
  isBuildActionLoading = false;
  isRestoringConversation = true;
  isFreshConversation = false;
  chatMessages: ChatMessage[] = [];
  currentLoaderText = '';
  showBuildProjectButton = false;
  matchedProjectId = '';
  matchedProjectName = 'My Creative Project';
  lastUserPrompt = '';
  matchedProject: ProjectMatchPayload['project'] | null = null;
  matchedProjectScore: number | null = null;
  isModelDropdownOpen = false;
  @Input() selectedDisplayModel = 'Claude 4.7 Opus';
  @Output() selectedDisplayModelChange = new EventEmitter<string>();

  aiModels = [
    { id: 'claude-4.7-opus', name: 'Claude 4.7 Opus', description: 'Advanced model for complex tasks', icon: 'claude', tag: '', internal: 'claude' },
    { id: 'claude-4.8-opus', name: 'Claude 4.8 Opus', description: 'Frontier Performance', icon: 'claude', tag: '', internal: 'claude' },
    { id: 'claude-4.5-sonnet', name: 'Claude 4.5 Sonnet', description: '200k Context', icon: 'claude', tag: '', internal: 'claude' },
    { id: 'claude-4.6-sonnet', name: 'Claude 4.6 Sonnet', description: 'Latest versatile model with fast exe...', icon: 'claude', tag: '', internal: 'claude' },
    { id: 'claude-4.6-opus', name: 'Claude 4.6 Opus', description: 'Capable and Robust Model', icon: 'claude', tag: '', internal: 'claude' },
    { id: 'claude-4.5-opus', name: 'Claude 4.5 Opus', description: 'Anthropic\'s Advanced Model', icon: 'claude', tag: '', internal: 'claude' },
    { id: 'gpt-5.5', name: 'GPT 5.5', description: 'OpenAI\'s Latest Model', icon: 'gpt', tag: '', internal: 'openai' },
    { id: 'gpt-5.4', name: 'GPT 5.4', description: 'OpenAI\'s Model', icon: 'gpt', tag: '', internal: 'openai' },
    { id: 'gpt-5.4-1m', name: 'GPT 5.4 - 1M', description: '1 Million Context', icon: 'gpt', tag: 'Pro', internal: 'openai' },
    { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex', description: 'OpenAI\'s Flagship Model', icon: 'gpt', tag: '', internal: 'openai' },
    { id: 'claude-4.7-opus-1m', name: 'Claude 4.7 Opus - 1M', description: '1 Million Context', icon: 'claude', tag: '', internal: 'claude' },
    { id: 'claude-4.6-opus-1m', name: 'Claude 4.6 Opus...', description: '1 Million Context', icon: 'claude', tag: 'Standard', internal: 'claude' },
    { id: 'claude-4.6-sonnet-1m', name: 'Claude 4.6 So...', description: '1 Million Context', icon: 'claude', tag: 'Standard', internal: 'claude' },
    { id: 'claude-4.8-opus-fast', name: 'Claude 4.8 Opus - ...', description: 'Anthropic\'s Fast Model (2x costlier)', icon: 'claude', tag: 'Pro', internal: 'claude' },
    { id: 'claude-4.7-opus-fast', name: 'Claude 4.7 Opus - ...', description: 'Anthropic\'s Fast Model (6x costlier)', icon: 'claude', tag: 'Pro', internal: 'claude' },
    { id: 'claude-4.7-opus-1m-fast', name: 'Claude 4.7 Opus 1...', description: '1 Million Context (6x costlier)', icon: 'claude', tag: 'Pro', internal: 'claude' },
    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', description: 'Google\'s Latest Model', icon: 'gemini', tag: '', internal: 'claude' },
    { id: 'gemini-3.5-flash', name: 'gemini-3.5-flash', description: 'gemini-3.5-flash', icon: 'gemini', tag: '', internal: 'claude' },
  ];

  private pendingInitialPrompt = '';
  private resumeFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private navigationSubscription?: Subscription;
  private activeVoiceSessionId = 0;
  projectMatchPayload?: ProjectMatchPayload;
  constructor(
    private apiService: ApiService,
    private projectGenerationTabState: ProjectGenerationTabStateService,
    private router: Router,
    private ngZone: NgZone,
    public subscriptionModalService: SubscriptionModalService,
    public speechService: SpeechService,
    public toaster: NzMessageService
  ) { }

  get selectedAiModel(): string {
    return this.apiService._aiModel();
  }

  set selectedAiModel(value: string) {
    this.apiService.setAiModel(value);
  }

  selectModel(model: any) {
    this.selectedDisplayModel = model.name;
    this.selectedDisplayModelChange.emit(this.selectedDisplayModel);
    this.selectedAiModel = model.internal;
    this.isModelDropdownOpen = false;
  }

  ngOnInit(): void {
    this.pendingInitialPrompt = this.initialPrompt.trim();
    this.socket = io(this.apiService.apiUrl, {
      auth: {
        token: localStorage.getItem('tokenCTi'),
        conversationId: this.getStoredConversationId()
      }
    });
    this.registerSocketHandlers();
    this.startResumeFallback();
    this.watchPageChange();
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
    this.cancelVoiceDraft();
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
    if (this.isRestoringConversation) {
      return;
    }

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
    this.voiceDraftText = '';
    this.isVoiceDraftActive = false;
    this.isVoiceUiVisible = false;
    this.isVoiceStarting = false;
    sessionStorage.removeItem('publicEnquiryId');
    this.promptText = '';
    this.scrollChatToBottom();

    this.socket?.emit('chatMessage', prompt);
  }

  private registerSocketHandlers(): void {
    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        this.startResumeFallback();
      });
    });

    this.socket.on('conversationResumed', (payload: ConversationResumePayload) => {
      console.log('conversationResumed', payload);
      this.ngZone.run(() => {
        this.handleConversationResumed(payload);
      });
    });

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
              ...(this.projectMatchPayload?.finalPrompt ? { finalPrompt: this.projectMatchPayload.finalPrompt } : {}), ...(this.projectMatchPayload?.finalSummary ? { finalSummary: this.projectMatchPayload.finalSummary } : {})
            },
            skipLocationChange: true
          });
        }
      });
    });

    this.socket.on('projectReady', (payload: ProjectMatchPayload) => {
      console.log("projectReady====>>", payload);
      this.lastUserPrompt = payload?.finalPrompt?.trim() || this.lastUserPrompt;

      this.projectMatchPayload = payload;
      this.ngZone.run(() => {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        this.applyProjectMatch(data);
        this.showBuildProjectButton = true;
        this.isBuildActionLoading = false;
        this.completeLoadingState();
      });
    });

    // this.socket.on('triggerBuildProject', (payload: TriggerBuildProjectPayload) => {
    //   this.ngZone.run(() => {
    //     const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    //     if (data?.projectMatch) {
    //       this.applyProjectMatch(data.projectMatch);
    //     }

    //     this.lastUserPrompt =
    //       data?.description?.trim() ||
    //       data?.finalIdea?.trim() ||
    //       this.lastUserPrompt;

    //     this.showBuildProjectButton = false;
    //     this.currentLoaderText = 'Starting your project build...';
    //     this.scrollChatToBottom();
    //     // this.buildMatchedProject();
    //   });
    // });

    // this.socket.on('showBuildButton', (_show: boolean) => {
    //   this.ngZone.run(() => {
    //     this.showBuildProjectButton = true;
    //     this.completeLoadingState();
    //   });
    // });

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
    this.clearResumeFallback();

    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  private handleConversationResumed(payload?: ConversationResumePayload | null): void {
    this.clearResumeFallback();
    this.isRestoringConversation = false;
    this.isFreshConversation = payload?.source === 'fresh';

    this.saveConversationId(payload?.conversationId);
    this.chatMessages = this.normalizeConversationMessages(payload?.messages);
    this.restoreConversationState(payload?.state ?? null);
    this.isSubmitting = false;

    if (this.pendingInitialPrompt && this.isFreshConversation && this.chatMessages.length === 0) {
      const initialPrompt = this.pendingInitialPrompt;
      this.pendingInitialPrompt = '';
      this.submitPrompt(initialPrompt);
      return;
    }

    this.pendingInitialPrompt = '';
    this.focusInput();
    this.scrollChatToBottom();
  }

  private startResumeFallback(): void {
    this.clearResumeFallback();

    this.resumeFallbackTimer = setTimeout(() => {
      this.ngZone.run(() => {
        if (!this.isRestoringConversation) {
          return;
        }

        this.isRestoringConversation = false;
        this.isFreshConversation = !this.getStoredConversationId();

        if (this.pendingInitialPrompt) {
          const initialPrompt = this.pendingInitialPrompt;
          this.pendingInitialPrompt = '';
          this.submitPrompt(initialPrompt);
          return;
        }

        this.focusInput();
      });
    }, this.resumeFallbackDelayMs);
  }

  private clearResumeFallback(): void {
    if (!this.resumeFallbackTimer) {
      return;
    }

    clearTimeout(this.resumeFallbackTimer);
    this.resumeFallbackTimer = null;
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
    this.isRestoringConversation = false;
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
        if (!response?.success) {
          this.isBuildActionLoading = false;
          this.toaster.warning(response.message || ''); // instant
          return;
        }
        const publicId = response?.data?.public_id;

        if (!publicId) {
          this.isBuildActionLoading = false;
          return;
        }

        const projectData = {
          ...this.buildProjectData(this.matchedProjectId, publicId)
        };

        sessionStorage.setItem('projectData', JSON.stringify(projectData));
        this.projectGenerationTabState.createOrUpdateTab({
          inquiryId: publicId,
          projectId: this.matchedProjectId,
          projectName: projectData.projectName,
          projectData,
          finalPrompt: this.projectMatchPayload?.finalPrompt ?? this.lastUserPrompt,
          status: 'generating'
        });
        this.projectGenerationTabState.setActiveInquiryId(publicId);

        sessionStorage.removeItem('conversationId');
        this.router.navigate(['/bd_loader'], {
          queryParams: {
            id: this.matchedProjectId,
            publicEnquiryId: publicId,
            finalPrompt: this.projectMatchPayload?.finalPrompt ?? undefined,
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
      this.projectGenerationTabState.createOrUpdateTab({
        inquiryId: publicEnquiryId,
        projectId,
        projectName: projectData.projectName,
        projectData,
        finalPrompt: this.projectMatchPayload?.finalPrompt ?? this.lastUserPrompt,
        status: 'generating'
      });
      this.projectGenerationTabState.setActiveInquiryId(publicEnquiryId);
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

  startVoiceTyping(): void {
    if (this.isVoiceStarting || this.isRestoringConversation) {
      return;
    }

    if (this.speechService.isListening) {
      this.cancelVoiceDraft();
      return;
    }

    const sessionId = ++this.activeVoiceSessionId;

    this.voiceDraftText = '';
    this.isVoiceDraftActive = true;
    this.isVoiceUiVisible = true;
    this.isVoiceStarting = true;

    const didStart = this.speechService.start({
      onText: (text: string) => {
        if (!this.isVoiceDraftActive || sessionId !== this.activeVoiceSessionId) {
          return;
        }

        this.voiceDraftText = text;
        this.isVoiceUiVisible = true;
      },
      onListeningChange: (isListening: boolean) => {
        if (!this.isVoiceDraftActive || sessionId !== this.activeVoiceSessionId) {
          return;
        }

        this.isVoiceStarting = false;

        if (isListening) {
          this.isVoiceUiVisible = true;
          return;
        }

        if (!isListening && !this.voiceDraftText.trim()) {
          this.isVoiceDraftActive = false;
          this.isVoiceUiVisible = false;
        }
      },
      onError: () => {
        if (sessionId !== this.activeVoiceSessionId) {
          return;
        }

        this.isVoiceDraftActive = false;
        this.isVoiceUiVisible = false;
        this.isVoiceStarting = false;
        this.voiceDraftText = '';
      }
    });

    if (!didStart && sessionId === this.activeVoiceSessionId) {
      this.isVoiceDraftActive = false;
      this.isVoiceUiVisible = false;
      this.isVoiceStarting = false;
      this.voiceDraftText = '';
    }
  }

  applyVoiceDraft(): void {
    const transcript = this.voiceDraftText.trim().replace(/\s+/g, ' ');

    if (!transcript) {
      return;
    }

    this.isVoiceDraftActive = false;
    this.isVoiceUiVisible = false;
    this.isVoiceStarting = false;
    this.activeVoiceSessionId += 1;

    if (this.speechService.isListening) {
      this.speechService.stop();
    }

    this.promptText = transcript;
    this.voiceDraftText = '';
    this.focusInput();
  }

  cancelVoiceDraft(): void {
    this.isVoiceDraftActive = false;
    this.isVoiceUiVisible = false;
    this.isVoiceStarting = false;
    this.activeVoiceSessionId += 1;

    if (this.speechService.isListening) {
      this.speechService.stop();
    }

    this.voiceDraftText = '';
    this.focusInput();
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

  private restoreConversationState(state?: Record<string, any> | null): void {
    if (!state) {
      return;
    }

    this.currentLoaderText = this.getStringStateValue(state, ['currentLoaderText', 'loadingText', 'loaderMessage']);
    this.showBuildProjectButton = this.getBooleanStateValue(state, ['showBuildProjectButton']);
    this.isBuildActionLoading = this.getBooleanStateValue(state, ['isBuildActionLoading']);
    this.matchedProjectId = this.getStringStateValue(state, ['matchedProjectId']);
    this.matchedProjectName =
      this.getStringStateValue(state, ['matchedProjectName']) || this.matchedProjectName;
    this.lastUserPrompt = this.getStringStateValue(state, ['lastUserPrompt']);
    this.matchedProject = this.getObjectStateValue<ProjectMatchPayload['project']>(state, ['matchedProject']);
    this.projectMatchPayload = this.getObjectStateValue<ProjectMatchPayload>(state, ['projectMatchPayload', 'projectMatch']);

    const restoredScore = this.getNumberStateValue(state, ['matchedProjectScore']);
    this.matchedProjectScore = restoredScore ?? null;
  }

  private normalizeConversationMessages(messages?: any[]): ChatMessage[] {
    if (!Array.isArray(messages)) {
      return [];
    }

    const normalizedMessages: ChatMessage[] = [];

    messages.forEach((message, index) => {
      const normalizedText = this.extractMessageText(message);
      if (!normalizedText) {
        return;
      }

      const sender = this.normalizeMessageSender(message?.sender ?? message?.role);
      const createdAt = this.normalizeMessageTimestamp(
        message?.createdAt ?? message?.timestamp ?? message?.time,
        index
      );

      normalizedMessages.push({
        sender,
        text: normalizedText,
        variant: message?.variant === 'error' ? 'error' : 'default',
        streamBlockId: this.getOptionalString(message?.streamBlockId ?? message?.blockId),
        createdAt
      });
    });

    return normalizedMessages;
  }

  private extractMessageText(message: any): string {
    const textCandidate =
      typeof message === 'string'
        ? message
        : message?.text ?? message?.content ?? message?.message ?? '';

    return typeof textCandidate === 'string' ? textCandidate.trim() : '';
  }

  private normalizeMessageSender(sender: string): 'user' | 'ai' {
    const normalizedSender = (sender || '').toLowerCase();
    return ['user', 'you', 'human'].includes(normalizedSender) ? 'user' : 'ai';
  }

  private normalizeMessageTimestamp(value: unknown, fallbackIndex: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return Date.now() + fallbackIndex;
  }

  private saveConversationId(conversationId?: string): void {
    const normalizedId = conversationId?.trim();
    if (!normalizedId || typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(this.conversationStorageKey, normalizedId);
  }

  private getStoredConversationId(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    return sessionStorage.getItem(this.conversationStorageKey);
  }

  private getStringStateValue(state: Record<string, any>, keys: string[]): string {
    for (const key of keys) {
      const value = state[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return '';
  }

  private getBooleanStateValue(state: Record<string, any>, keys: string[]): boolean {
    for (const key of keys) {
      if (typeof state[key] === 'boolean') {
        return state[key];
      }
    }

    return false;
  }

  private getNumberStateValue(state: Record<string, any>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = state[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }

    return undefined;
  }

  private getObjectStateValue<T>(state: Record<string, any>, keys: string[]): T | undefined {
    for (const key of keys) {
      const value = state[key];
      if (value && typeof value === 'object') {
        return value as T;
      }
    }

    return undefined;
  }

  private getOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
