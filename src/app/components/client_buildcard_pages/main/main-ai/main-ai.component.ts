import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainAiChatbotComponent } from '../main-ai-chatbot/main-ai-chatbot.component';
import { WorkspaceHeaderComponent } from "../../workspace-header/workspace-header.component";
import { SubcriptionService } from '../../../../services/subcription.service';
import { SubscriptionResponse } from '../../../../models/subcription';
import { Subscription } from 'rxjs';
import { SubscriptionModalService } from '../../../../services/subscription-modal.service';
import { ApiService } from '../../../../services/api.service';
import { io } from 'socket.io-client';
import { SpeechService } from '../../../../services/speech.service';
declare let fbq: any;

@Component({
  selector: 'app-main-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, MainAiChatbotComponent, WorkspaceHeaderComponent],
  templateUrl: './main-ai.component.html',
  styleUrl: './main-ai.component.css'
})
export class MainAiComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly conversationStorageKey = 'conversationId';
  private readonly resumeProbeDelayMs = 1500;
  @ViewChild('promptInput') promptInput?: ElementRef<HTMLTextAreaElement>;

  promptIdeas = [
    'What can I ask you to do?',
    'Which one of my projects is performing the best?',
    'What projects should I be concerned about right now?'
  ];

  placeholderSuggestions = [
    'Build a SaaS admin dashboard with analytics',
    'Create a clean food delivery app flow',
    'Generate an e-commerce website for a fashion brand',
    'Build a portfolio website for a photographer',
    'Design a dashboard for a project management tool'
  ];
  subscriptionPlan!: SubscriptionResponse;
  activePlaceholder = '';
  promptText = '';
  voiceDraftText = '';
  isVoiceDraftActive = false;
  isVoiceUiVisible = false;
  isVoiceStarting = false;
  isChatMode = false;
  submittedPrompt = '';
  isModelDropdownOpen = false;
  selectedDisplayModel = 'Claude 4.7 Opus';

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

  private subscriptionStateSub?: Subscription;
  private newChatSubscription?: Subscription;
  private placeholderTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeProbeTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeProbeSocket: any = null;
  private activePlaceholderIndex = 0;
  private activeVoiceSessionId = 0;
  SUGGESTIONS = [
    {
      label: "Food Delivery App",
      prompt:
        "Design a premium food delivery mobile app focused on a fast and delightful ordering experience. Include beautiful restaurant discovery, curated menus, smart search, personalized recommendations, a seamless cart, secure checkout, real-time order tracking, favorites, and a clean order history. Prioritize an elegant user experience and a polished MVP suitable for launch."
    },
    {
      label: "CRM Dashboard",
      prompt:
        "Create a modern CRM workspace that helps sales teams organize leads, manage customer relationships, track deals, schedule follow-ups, and visualize sales performance. Focus on an intuitive workflow, clean data organization, insightful analytics, and a productivity-first MVP rather than a complex enterprise system."
    },
    {
      label: "Hospital Management System",
      prompt:
        "Build a modern hospital management platform focused on improving the patient journey. Include appointment booking, doctor discovery, patient records, prescriptions, visit history, and treatment tracking with a calm, trustworthy interface. Deliver a practical MVP that simplifies everyday healthcare interactions."
    },
    {
      label: "Fitness Platform",
      prompt:
        "Design a premium fitness platform that helps users build healthy habits through personalized workout plans, progress tracking, activity insights, goal setting, nutrition guidance, and motivational challenges. Create an inspiring, modern experience centered around engagement and long-term consistency."
    },
    {
      label: "Marketplace App",
      prompt:
        "Create a beautifully designed online marketplace where people can discover, explore, and purchase unique products from independent sellers. Focus on immersive product browsing, rich product pages, search, collections, favorites, secure checkout, messaging, and order tracking while keeping the experience clean, premium, and MVP-focused."
    }
  ];
  constructor(
    private subscriptionService: SubcriptionService,
    private subscriptionModalService: SubscriptionModalService,
    private apiService: ApiService,
    public speechService: SpeechService,
    private ngZone: NgZone
  ) {
    this.promptText = localStorage.getItem('prompt') || '';
  } get selectedAiModel(): string {
    return this.apiService._aiModel();
  }

  set selectedAiModel(value: string) {
    this.apiService.setAiModel(value);
  }

  get selectedAiModelVersion(): string {
    return this.apiService._aiModelVersion();
  }

  set selectedAiModelVersion(value: string) {
    this.apiService.setAiModelVersion(value);
  }

  selectModel(model: any) {
    this.selectedDisplayModel = model.name;
    this.selectedAiModel = model.internal;
    this.selectedAiModelVersion = model.id;
    this.isModelDropdownOpen = false;
  }

  ngOnInit(): void {
    if (typeof fbq === 'function') {
      fbq('track', 'CompleteRegistration');
    }

    const savedModelVersion = this.selectedAiModelVersion;
    if (savedModelVersion) {
      const found = this.aiModels.find(m => m.id === savedModelVersion);
      if (found) {
        this.selectedDisplayModel = found.name;
      }
    }

    this.resolveInitialChatMode();
    this.playPlaceholderTypewriter();
    this.subscriptionService.loadSubscription();
    this.subscriptionStateSub = this.subscriptionService.subscription$.subscribe(subscription => {
      if (subscription) {
        this.subscriptionPlan = subscription;
      }
    });
    this.newChatSubscription = this.apiService.newChat$.subscribe(() => {
      this.resetToFreshChat();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
  }

  ngOnDestroy(): void {
    if (this.placeholderTimer) {
      clearTimeout(this.placeholderTimer);
      this.placeholderTimer = null;
    }

    this.subscriptionStateSub?.unsubscribe();
    this.newChatSubscription?.unsubscribe();
    this.clearResumeProbe();
    this.disconnectResumeProbeSocket();
  }

  handlePromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitPrompt();
    }
  }

  submitPrompt(): void {
    if (this.subscriptionPlan?.allowProjectCreate === false) {
      this.subscriptionModalService.open();
      return;
    }

    const prompt = this.promptText.trim().replace(/\s+/g, ' ');
    if (!prompt) {
      return;
    }

    localStorage.removeItem('prompt')
    this.isChatMode = true;
    this.submittedPrompt = prompt;
    this.promptText = '';
  }

  usePromptIdea(idea: string): void {
    this.promptText = idea;
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
  }

  private playPlaceholderTypewriter(): void {
    const nextSuggestion = this.placeholderSuggestions[this.activePlaceholderIndex];
    let characterIndex = 0;
    this.activePlaceholder = '';

    const typeNextCharacter = () => {
      if (characterIndex < nextSuggestion.length) {
        this.activePlaceholder += nextSuggestion[characterIndex];
        characterIndex += 1;
        this.placeholderTimer = setTimeout(typeNextCharacter, 45);
        return;
      }

      this.placeholderTimer = setTimeout(() => {
        this.activePlaceholderIndex =
          (this.activePlaceholderIndex + 1) % this.placeholderSuggestions.length;
        this.playPlaceholderTypewriter();
      }, 1500);
    };

    typeNextCharacter();
  }

  private hasSavedConversation(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }

    return !!sessionStorage.getItem(this.conversationStorageKey)?.trim();
  }

  private resolveInitialChatMode(): void {
    this.isChatMode = false;

    if (!this.hasSavedConversation()) {
      return;
    }

    this.resumeProbeSocket = io(this.apiService.apiUrl, {
      auth: {
        token: localStorage.getItem('tokenCTi'),
        conversationId: this.getStoredConversationId()
      }
    });

    this.resumeProbeSocket.on('connect', () => {
      this.startResumeProbeFallback();
    });

    this.resumeProbeSocket.on('conversationResumed', (payload: any) => {
      this.ngZone.run(() => {
        this.clearResumeProbe();
        this.isChatMode = !!(payload?.messages && payload.messages.length > 0);
        this.disconnectResumeProbeSocket();
      });
    });
  }

  private startResumeProbeFallback(): void {
    this.clearResumeProbe();

    this.resumeProbeTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.isChatMode = false;
        this.disconnectResumeProbeSocket();
      });
    }, this.resumeProbeDelayMs);
  }

  private clearResumeProbe(): void {
    if (!this.resumeProbeTimer) {
      return;
    }

    clearTimeout(this.resumeProbeTimer);
    this.resumeProbeTimer = null;
  }

  private disconnectResumeProbeSocket(): void {
    if (!this.resumeProbeSocket) {
      return;
    }

    this.resumeProbeSocket.removeAllListeners();
    this.resumeProbeSocket.disconnect();
    this.resumeProbeSocket = null;
  }

  private getStoredConversationId(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    return sessionStorage.getItem(this.conversationStorageKey);
  }

  private resetToFreshChat(): void {
    this.clearResumeProbe();
    this.disconnectResumeProbeSocket();
    this.isChatMode = false;
    this.submittedPrompt = '';
    this.promptText = '';
    this.voiceDraftText = '';
    this.isVoiceDraftActive = false;
    this.isVoiceUiVisible = false;
    this.isVoiceStarting = false;
    this.activeVoiceSessionId += 1;
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
  }


  startVoiceTyping(): void {

    if (this.isVoiceStarting) {
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
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
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
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
  }
}
