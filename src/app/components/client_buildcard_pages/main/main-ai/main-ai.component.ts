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
  selectedDisplayModel = '';
  showWordLimitError = false;

  aiModels: any[] = [];

  private subscriptionStateSub?: Subscription;
  private newChatSubscription?: Subscription;
  private placeholderTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeProbeTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeProbeSocket: any = null;
  private activePlaceholderIndex = 0;
  private activeVoiceSessionId = 0;

  SUGGESTIONS = [
    {
      label: "Food Delivery Website",
      iconClass: "fa-solid fa-motorcycle me-2",
      iconColor: "#e4773b",
      prompt: "Design a premium food delivery platform focused on a fast and delightful ordering experience. Include restaurant discovery, curated menus, smart search, personalized recommendations, a seamless cart, secure checkout, real-time order tracking, favorites, user profiles, notifications, and order history. Prioritize a modern, intuitive interface with scalable architecture, excellent performance, and a polished user experience."
    },
    {
      label: "Premium Unisex Salon",
      iconClass: "fa-solid fa-scissors me-2",
      iconColor: "#7f78d2",
      prompt: "Create a premium unisex salon and barbering platform with service discovery, pricing, master barber profiles, grooming lookbook, memberships, favorites, salon information, and VIP appointment booking.Include service/add-on selection, barber and time-slot selection, digital booking confirmation, before/after transformations, notifications, and responsive cinematic interactions with a sophisticated dark luxury design."
    },
    {
      label: "Hospital Management System",
      iconClass: "fa-solid fa-square-plus me-2",
      iconColor: "#ff4d4d",
      prompt: "Build a modern hospital management platform focused on improving the patient journey. Include appointment booking, doctor discovery, patient records, prescriptions, visit history, and treatment tracking with a calm, trustworthy interface. Deliver a practical MVP that simplifies everyday healthcare interactions."
    },
    {
      label: "Fitness Platform",
      iconClass: "fa-solid fa-dumbbell me-2",
      iconColor: "#2ecc71",
      prompt: "Design a premium fitness platform that helps users build healthy habits through personalized workout plans, progress tracking, activity insights, goal setting, nutrition guidance, and motivational challenges. Create an inspiring, modern experience centered around engagement and long-term consistency."
    },
    {
      label: "Marketplace Website",
      iconClass: "fa-solid fa-bag-shopping me-2",
      iconColor: "#9b59b6",
      prompt: "Create a modern online marketplace where people can discover, explore, and purchase products from independent sellers. Include advanced search, categories, collections, rich product pages, seller profiles, wishlists, secure checkout, messaging, reviews, ratings, order tracking, and account management. Focus on a clean, premium experience with scalable design, high usability, and smooth user interactions."
    }
  ];

  FEATURES = [
    {
      icon: "🚀",
      title: "AI-Powered Generation",
      description: "Smart AI that understands your ideas deeply"
    },
    {
      icon: "⚡",
      title: "Real-Time Preview",
      description: "See your product come to life instantly"
    },
    {
      icon: "🛡️",
      title: "Secure & Private",
      description: "Your ideas are safe with enterprise-grade security"
    },
    {
      icon: "☁️",
      title: "Deploy Anywhere",
      description: "One-click deployment to the cloud"
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
    localStorage.setItem('modelExplicitlySelected', 'true');
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

    this.loadAiModels();
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

  loadAiModels(): void {
    this.apiService.getAllAiModels().subscribe({
      next: (response: any) => {
        let modelsList: any[] = [];
        if (Array.isArray(response)) {
          modelsList = response;
        } else if (response && Array.isArray(response.data)) {
          modelsList = response.data;
        } else if (response && Array.isArray(response.models)) {
          modelsList = response.models;
        }

        if (modelsList.length > 0) {
          this.aiModels = modelsList.map(m => ({
            id: m.model_id || m.id || m._id || m.modelId || m.value,
            name: m.name || m.modelName || m.displayName || m.label,
            description: m.description || m.desc || '',
            icon: m.icon || m.modelIcon || (m.internal || m.provider || '').toLowerCase() || 'gpt',
            tag: m.tag || m.badge || '',
            internal: m.internal || m.provider || m.internalName || 'openai',
            isDefault: m.is_default || false
          }));

          const defaultModel = this.aiModels.find(m => m.isDefault);
          const isExplicit = localStorage.getItem('modelExplicitlySelected') === 'true';
          const savedModelVersion = isExplicit ? localStorage.getItem('selectedAiModelVersion') : null;
          let modelToSelect = null;

          if (savedModelVersion) {
            modelToSelect = this.aiModels.find(m => m.id === savedModelVersion);
          }

          if (!modelToSelect && defaultModel) {
            modelToSelect = defaultModel;
            this.apiService._aiModel.set(defaultModel.internal);
            this.apiService._aiModelVersion.set(defaultModel.id);
          }

          if (modelToSelect) {
            this.selectedDisplayModel = modelToSelect.name;
          }
        }
      },
      error: (err) => {
        console.error('Error fetching AI models:', err);
      }
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

  get wordCount(): number {
    if (!this.promptText || !this.promptText.trim()) return 0;
    return this.promptText.trim().split(/\s+/).length;
  }

  onPromptChange(newValue: string): void {
    this.promptText = newValue;
    if (this.wordCount <= 1000) {
      this.showWordLimitError = false;
    }
  }

  submitPrompt(): void {
    if (this.wordCount > 1000) {
      this.showWordLimitError = true;
      return;
    }

    if (this.subscriptionPlan?.allowProjectCreate === false) {
      this.subscriptionModalService.open();
      return;
    }

    const prompt = this.promptText.trim();
    if (!prompt) {
      return;
    }

    localStorage.removeItem('prompt')
    this.isChatMode = true;
    this.submittedPrompt = prompt;
    this.promptText = '';
  }

  usePromptIdea(idea: string): void {
    this.onPromptChange(idea);
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
        conversationId: this.getStoredConversationId(),
        socketType: 'chat-v2'
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

    this.onPromptChange(transcript);
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
