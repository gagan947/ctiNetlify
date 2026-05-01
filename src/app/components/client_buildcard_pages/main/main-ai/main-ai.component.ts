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
  isChatMode = false;
  submittedPrompt = '';
  private subscriptionStateSub?: Subscription;
  private placeholderTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeProbeTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeProbeSocket: any = null;
  private activePlaceholderIndex = 0;
  constructor(
    private subscriptionService: SubcriptionService,
    private subscriptionModalService: SubscriptionModalService,
    private apiService: ApiService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    if (typeof fbq === 'function') {
      fbq('track', 'CompleteRegistration');
    }

    this.resolveInitialChatMode();
    this.playPlaceholderTypewriter();
    this.subscriptionService.loadSubscription();
    this.subscriptionStateSub = this.subscriptionService.subscription$.subscribe(subscription => {
      if (subscription) {
        this.subscriptionPlan = subscription;
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
}
