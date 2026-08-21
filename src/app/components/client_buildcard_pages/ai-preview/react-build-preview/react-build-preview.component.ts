import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, OnDestroy, ViewChild, OnInit, AfterViewInit, AfterViewChecked, HostListener } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, ActivatedRoute, NavigationStart } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';
import { SubscriptionResponse } from '../../../../models/subcription';
import { AiSocketService } from '../../../../services/ai-socket.service';
import { ApiService } from '../../../../services/api.service';
import { ProjectGenerationPreviewData, ProjectGenerationTabStateService } from '../../../../services/project-generation-tab-state.service';
import { ReactCodeEditorComponent } from '../react-code-editor/react-code-editor.component';
import { AiDevRendererComponent } from '../ai-dev-renderer/ai-dev-renderer.component';
import { SubscriptionModalService } from '../../../../services/subscription-modal.service';
import { SubcriptionService } from '../../../../services/subcription.service';
import { SpeechService } from '../../../../services/speech.service';
import { WorkspaceHeaderComponent } from "../../workspace-header/workspace-header.component";
import { AiLoaderComponent } from '../ai-loader/ai-loader.component';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { io } from 'socket.io-client';

interface DesignSnapshot {
  id: string;
  label: string;
  pages: any;
  loginRedirect: any;
  createdAt: Date;
}

interface ReactFile {
  id: string;
  name: string;          // ProductListing.jsx
  language: 'javascript' | 'css';
  fullCode: string;
}

type BuildFlowType = 'initial' | 'restore' | 'regenerate' | 'switch' | 'repair' | 'customize';

interface BuildProgressStep {
  pendingIconClass: string;
  label: string;
}

interface CallbackPhoneNumber {
  number?: string;
  dialCode?: string;
}

interface CustomizationHistoryEntry {
  id: number;
  prompt: string;
  ai_response?: string | null;
  build_status: number;
  created_at: string;
  updated_at?: string;
}

interface PendingCustomizationRequest {
  prompt: string;
  requestVersion: number;
  templatePublicId: string;
  botReplyReceived: boolean;
  restTriggered: boolean;
}

interface CustomizationProgressBlock {
  type: 'ai-progress';
  data: {
    historyId: number | null;
    step: string;
    stepLabel: string;
    message: string;
    percentage: number;
    logs: string[];
  };
}

export interface CustomizationOption {
  id: string;
  label: string;
}

export interface PendingQuestion {
  id: string;
  type: string;
}

export interface CustomizationAnswer {
  questionId: string;
  optionId: string;
  optionLabel: string;
}

export enum CustomizationMessageType {
  EDITOR_ELEMENT_EDIT = 'editor-element-edit',
  CHAT_MESSAGE = 'chat-message',
  OPTION_SELECTION = 'option-selection',
  MULTI_OPTION_SELECTION = 'multi-option-selection',
  QUESTION_ANSWER = 'question-answer'
}

export interface CustomizationMessagePayload {
  templatePublicId: string;
  type: CustomizationMessageType | string;
  requestId: string | null;
  message: string | null;
  elements: any[];
  attachments: any[];
  optionId?: string;
  optionLabel?: string;
  questionId?: string | null;
  answers?: CustomizationAnswer[];
}

export interface CustomizationSubQuestion {
  questionId: string;
  message: string;
  options: CustomizationOption[];
}

export interface CustomizationChatMessage {
  sender: 'user' | 'ai';
  message: string;
  replyType?: 'message' | 'question' | 'options';
  attachments?: any[];
  editComments?: any[];
  questionId?: string;
  pendingQuestion?: PendingQuestion;
  options?: CustomizationOption[];
  questions?: CustomizationSubQuestion[];
  answered?: boolean;
  selectedOptionId?: string;
  selectedOptionsMap?: { [optionId: string]: boolean };
  userInputAnswer?: string;
  questionTitle?: string;
  currentQuestionIndex?: number;
  totalQuestions?: number;
}

export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '');
  return value.trim().length === 0 ? { whitespace: true } : null;
}

declare var bootstrap: any;
@Component({
  selector: 'app-react-build-preview',
  standalone: true,
  imports: [CommonModule, NgxIntlTelInputModule, ReactCodeEditorComponent, FormsModule, ReactiveFormsModule, AiDevRendererComponent, WorkspaceHeaderComponent, AiLoaderComponent],
  templateUrl: './react-build-preview.component.html',
  styleUrl: './react-build-preview.component.css'
})
export class ReactBuildPreviewComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  private readonly deployCreditsRequired = 60;
  private readonly downloadCodeCreditsRequired = 100;
  private readonly minChatPanelWidth = 320;
  private readonly maxChatPanelWidth = 720;
  socket: any;
  customizationSocket: any;

  private readonly customizationConversationStorageKey =
    'customizationConversationId';

  private customizationConversationId: string | null = null;

  isCustomizationRestoring = true;
  private readonly mobileBreakpoint = 991;
  private readonly buildErrorPreviewLineLimit = 6;
  private readonly buildErrorPreviewCharLimit = 700;
  private readonly generateProjectFailureGraceMs = 100;
  private readonly generateProjectInternal = 12000;
  private readonly maxBuildRepairAttempts = 10;
  private readonly buildRepairAttemptMessages = [
    {
      phase: 'Initial preview build hit an issue. Starting automated repair attempt 1.',
      support: 'I am reviewing the failed build output, correcting the most likely file and configuration issues, and preparing a clean retry.'
    },
    {
      phase: 'Repair attempt 2 is now running after the first recovery pass did not fully stabilize the preview.',
      support: 'This pass focuses on unresolved import, dependency, and environment-level build blockers before I retry the preview.'
    },
    {
      phase: 'Repair attempt 3 is in progress with a deeper validation pass across the generated build.',
      support: 'I am rechecking generated code paths, fixing remaining build-time conflicts, and trying another preview recovery.'
    },
    {
      phase: 'Repair attempt 4 is underway. I am narrowing down the remaining build issues before the next retry.',
      support: 'This pass targets stubborn configuration mismatches, invalid references, and deployment preparation issues that may still be blocking the preview.'
    },
    {
      phase: 'Repair attempt 5 is in progress before I surface a failure message.',
      support: 'I am applying one last recovery pass, revalidating the build artifacts, and retrying the preview with the latest fixes.'
    },
    {
      phase: 'Repair attempt 6 is now running with an extended recovery pass across the preview build pipeline.',
      support: 'I am tracing deeper build and deployment dependencies, resolving lingering conflicts, and retrying the preview with another stabilization pass.'
    },
    {
      phase: 'Repair attempt 7 is in progress as the final automated recovery pass before I mark the preview as failed.',
      support: 'I am performing a last end-to-end validation of generated files, build configuration, and deployment output to give the preview one final recovery attempt.'
    },
  ];
  private aiProcessingInterval?: ReturnType<typeof setInterval>;
  private aiProcessingPhaseVersion = 0;
  private pendingFinalBuildSection: any = null;
  private repairAttemptVersion = 0;
  private customizationRequestVersion = 0;
  private pendingCustomizationRequest: PendingCustomizationRequest | null = null;
  private activeCustomizationProgressBlock: CustomizationProgressBlock | null = null;
  private initialFlowRunId = 0;
  private hasRepairFlowTakenOver = false;
  private runningBuildResumeVersion = 0;
  private isRunningBuildSyncInProgress = false;

  safePreviewUrl: SafeResourceUrl | null = null;
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('chatScroll') chatScroll!: ElementRef<HTMLDivElement>;
  private lastChatScrollElement: HTMLDivElement | null = null;
  @ViewChild('customizeInput') customizeInput!: ElementRef<HTMLTextAreaElement>;
  suggestionsMap = new Map<string, any>();
  isSuggestionsLoading = false;
  suggestionsError: string | null = null;
  currentSuggestions: any = null;
  expandedCategoriesMap = new Map<string, Set<string>>();
  isSuggestionsDismissedMap = new Map<string, boolean>();
  previewWidth = 100; // desktop default
  blocks: any[] = [];
  projectsData: any;
  files: ReactFile[] = [];
  isTyping = true;
  private buildStepTimeouts: ReturnType<typeof setTimeout>[] = [];
  designMap = new Map<string, DesignSnapshot>();
  designOrder: any[] = [];   // keeps tab order
  fullScreen: boolean = false;
  designCount = 0;
  selected_template_id = '';
  activeCustomizationRequestId: string | null = null;
  selectedElementMetadata: any = null;
  selectedProjectId = '';
  subscriptionPlan!: SubscriptionResponse;
  isIframeLoading = true;
  selectedDeviceType: string = 'desktop';
  SearchCountryField = SearchCountryField;
  selectedCountry = CountryISO.India;
  isReactBuilding = true;
  loaderProgress = 0;
  loaderStepIndex = 1;
  loaderStatusText = 'Building...';
  buildStep = 0;
  templateExists = false;
  templates: any[] = [];
  buildFlowType: BuildFlowType = 'initial';
  editorMode = false;
  showDiscardConfirm = false;
  showDiscardConfirm2 = false
  isMobilePreview = false;
  fileUrls: any = []
  elementEdits: any[] = [];
  editorToolbarCollapsed = false;

  pendingElementEdit: any = null;
  chatInput = '';

  customizationMessages: CustomizationChatMessage[] = [];
  editCommentsArray: any = [];
  get loaderStepTitles(): string[] {
    if (this.buildFlowType === 'customize') {
      return [
        'Analyzing customization',
        'Planning modifications',
        'Applying code changes',
        'Updating preview'
      ];
    } else if (this.buildFlowType === 'restore' || this.buildFlowType === 'switch' || this.buildFlowType === 'regenerate') {
      return [
        'Fetching project data',
        'Restoring structure',
        'Rebuilding React app',
        'Preparing your preview'
      ];
    }
    return [
      'Understanding your idea',
      'Generating application structure',
      'Building your React application',
      'Preparing your preview'
    ];
  }

  get loaderHeading1(): string {
    if (this.buildFlowType === 'customize') return 'AI is modifying';
    if (this.buildFlowType === 'restore' || this.buildFlowType === 'switch' || this.buildFlowType === 'regenerate') return 'AI is loading';
    return 'AI is building';
  }

  get loaderHeading2(): string {
    return 'your project';
  }

  get loaderSubheading(): string {
    if (this.buildFlowType === 'customize') return 'Applying your requested changes';
    if (this.buildFlowType === 'restore' || this.buildFlowType === 'switch' || this.buildFlowType === 'regenerate') return 'Fetching and restoring your project';
    return 'Turning your idea into a working product';
  }

  buildSteps: BuildProgressStep[] = [
    { pendingIconClass: 'fa-solid fa-download', label: 'Installing dependencies' },
    { pendingIconClass: 'fa-solid fa-gear', label: 'Building React app' },
    { pendingIconClass: 'fa-solid fa-rocket', label: 'Deploying preview' }
  ];
  usedVariations: any[] = [];
  pendingPreviewUrl: string | null = null;
  private hasAutoOpenedCurrentMobilePreview = false;
  private hasDismissedCurrentMobilePreview = false;
  private deployHeaderActionTimer: ReturnType<typeof setTimeout> | null = null;
  finalPrompt: any = null;
  selectedPublishOption: 'creative-ai-domain' | 'custom-domain' = 'creative-ai-domain';
  customDomain = '';
  customDomainTouched = false;
  deploymentSuccessMessage = '';
  successModalAction: 'navigate-dashboard' | 'close-only' = 'navigate-dashboard';
  showDeployHeaderAction = false;
  insufficientCreditsRequired = this.deployCreditsRequired;
  insufficientCreditsActionLabel = 'project publishing';
  buildGenerationErrorMessage = '';
  isBuildGenerationErrorExpanded = false;
  callbackRequestForm = new FormGroup({
    fullName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), noWhitespaceValidator] }),
    businessEmail: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email, noWhitespaceValidator] }),
    phoneNumber: new FormControl<CallbackPhoneNumber | string | null>(null, Validators.required),
    companyName: new FormControl<string>('', { nonNullable: true }),
    description: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
  });

  feedbackForm = new FormGroup({
    rating: new FormControl<number>(0, [Validators.required, Validators.min(1)]),
    feedback_text: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, noWhitespaceValidator] })
  });

  predefinedFeedbackOptions = [
    { label: "I was just exploring", icon: "fa-regular fa-compass", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
    { label: "I don't need it right now", icon: "fa-regular fa-clock", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
    { label: "I couldn't create what I wanted", icon: "fa-solid fa-wand-magic-sparkles", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
    { label: "It was difficult to use", icon: "fa-regular fa-face-frown", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
    { label: "I need more free credits", icon: "fa-solid fa-gift", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" },
    { label: "The pricing doesn't suit me", icon: "fa-solid fa-tag", color: "#F97316", bg: "rgba(249, 115, 22, 0.1)" },
    { label: "I'm comparing other tools", icon: "fa-solid fa-scale-balanced", color: "#0EA5E9", bg: "rgba(14, 165, 233, 0.1)" },
    { label: "Other (Please specify)", icon: "fa-regular fa-comment-dots", color: "#9CA3AF", bg: "rgba(156, 163, 175, 0.1)" }
  ];
  isFeedbackModalOpen = false;
  isFeedbackSubmitted = false;
  private previewReadyTimer: any;
  isCallbackSubmitting = false;
  isRetryBuildGenerationSubmitting = false;
  userInfo: any = {};
  voiceDraftText = '';
  isVoiceDraftActive = false;
  isVoiceUiVisible = false;
  isVoiceStarting = false;
  private shouldDeferPreviewApply = false;
  private hasInitialFlowCompleted = false;
  private pendingPreviewResponse: { res: any; socketId: string | null } | null = null;
  private pendingPreviewFailure = false;
  private hasInitialBuildCompletionUi = false;
  private generateProjectFailureTimer: ReturnType<typeof setTimeout> | null = null;
  private activePageBuildSection: { type: 'build-section'; data: { title: string; icon: string; done: boolean; items: Array<{ label: string; status: 'active' | 'done' }> } } | null = null;
  private queuedSocketPages: string[] = [];
  private hasCompletedPageGeneration = false;
  private currentTemplateId: string | null = null;
  private pageGenerationCompletionResolver: (() => void) | null = null;
  private continueProjectGenerationInterval: ReturnType<typeof setInterval> | null = null;
  private isContinueProjectGenerationRequestInFlight = false;
  private routeChangeVersion = 0;
  private socketInquiryId = '';
  private customizationSocketInquiryId = '';
  private activeVoiceSessionId = 0;
  draftMessages: any[] = []
  today = new Date();
  chatSectionWidth = 550;
  isChatResizing = false;
  private removeResizeListeners: Array<() => void> = [];
  // Redirect page for login action

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer,
    private aiService: AiSocketService,
    private projectGenerationTabState: ProjectGenerationTabStateService,
    private router: Router,
    private toster: NzMessageService,
    public subscriptionModalService: SubscriptionModalService,
    public speechService: SpeechService,
    private subscriptionService: SubcriptionService,
    private route: ActivatedRoute
  ) {
    effect(() => {
      this.finalPrompt = this.apiService._finalPrompt() || sessionStorage.getItem('finalPrompt');
    });
  }

  get selectedAiModel(): string {
    return this.apiService._aiModel();
  }

  set selectedAiModel(value: string) {
    this.apiService.setAiModel(value);
  }

  async ngOnInit() {
    window.addEventListener('message', this.handlePreviewMessage);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (this.hasUsablePreviewState() && !this.isFeedbackSubmitted && this.previewReadyTimer) {
          this.showFeedbackModal();
        }
      }
    });
    this.hideDeployHeaderAction();
    this.getUserSubscriptionPlan();
    this.userInfo = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    this.initializeCallbackRequestForm();

    this.getUserSubscriptionPlan();

    this.blocks = [];

    // 🔹 Store preview temporarily (IMPORTANT)
    this.pendingPreviewUrl = null;

    // ============================================
    // ✅ 1. LOAD DRAFT TEMPLATES FIRST
    // ============================================

    this.route.paramMap.subscribe(async (res: any) => {
      const inquiryId = String(res.params['id'] || '').trim();
      await this.handleProjectRouteChange(inquiryId);
      this.ensureCustomizationSocket(
        inquiryId
      );
    });

  }

  private async handleProjectRouteChange(inquiryId: string) {
    const routeChangeVersion = ++this.routeChangeVersion;

    this.prepareForProjectRouteChange(inquiryId);
    if (!inquiryId) {
      return;
    }

    if (this.selectedProjectId) {
      const existingDraftIndex = this.draftMessages.findIndex((msg: any) => msg.id === this.selectedProjectId);
      const currentInput = this.customizeInput?.nativeElement?.value || "";

      if (existingDraftIndex > -1) {
        this.draftMessages[existingDraftIndex].message = currentInput;
      } else {
        this.draftMessages.push({
          message: currentInput,
          id: this.selectedProjectId,
        });
      }
    }

    const draftMsg = this.draftMessages.find((msg: any) => msg.id === inquiryId);
    if (this.customizeInput?.nativeElement) {
      this.customizeInput.nativeElement.value = draftMsg?.message || "";
    }

    this.selectedProjectId = inquiryId;
    this.projectGenerationTabState.setActiveInquiryId(inquiryId);
    this.refreshProjectContext(inquiryId);
    this.ensureBuildSocket(inquiryId);

    const templates = await this.getUserTemplates();
    if (!this.isCurrentRouteChange(routeChangeVersion, inquiryId)) {
      return;
    }

    const existingTemplate = templates.find((template: any) => template.inquiryId === inquiryId);
    if (existingTemplate) {
      await this.showDraftWelcomeMessages(false, existingTemplate.user_prompt);
      if (!this.isCurrentRouteChange(routeChangeVersion, inquiryId)) {
        return;
      }

      await this.appendCustomizationHistory(inquiryId, routeChangeVersion);
      if (!this.isCurrentRouteChange(routeChangeVersion, inquiryId)) {
        return;
      }

      await this.loadDraftTemplates(templates);
      if (!this.isCurrentRouteChange(routeChangeVersion, inquiryId)) {
        return;
      }

      this.projectGenerationTabState.markCompleted(inquiryId, {
        templateId: existingTemplate.templateId,
        pages: existingTemplate.pages,
        login_redirect: existingTemplate.login_redirect,
        reactBuildUrl: existingTemplate.reactBuildUrl,
        variation: existingTemplate.variation
      });
      this.fetchCustomizationSuggestions(inquiryId);
      this.scrollToBottom(true);
      return;
    }

    const generationTab = this.projectGenerationTabState.getTabState(inquiryId);
    if (generationTab?.status === 'completed' && generationTab.previewData?.templateId) {
      this.applyStoredCompletedPreview(generationTab.previewData);
      this.fetchCustomizationSuggestions(inquiryId);
      this.scrollToBottom(true);
      return;
    }

    if (generationTab?.status === 'error') {
      this.setBuildGenerationError(generationTab.errorMessage || 'Failed to generate preview');
      this.queueBuildGenerationFailure(true);
      return;
    }

    if (generationTab?.jobId) {
      this.projectGenerationTabState.markGenerating(inquiryId);
      this.restoreRunningBuildBlocks();
      this.startContinueProjectGenerationPolling(inquiryId, generationTab.jobId);
      return;
    }

    if (this.shouldStartInitialGeneration(inquiryId, generationTab)) {
      await this.runInitialBuildSequence();
      return;
    }

    this.isReactBuilding = false;
    this.isIframeLoading = false;
  }

  private prepareForProjectRouteChange(inquiryId: string) {
    this.runningBuildResumeVersion++;
    this.isRunningBuildSyncInProgress = false;
    this.clearContinueProjectGenerationInterval();
    this.clearGenerateProjectFailureTimer();
    this.stopAiProcessingPhase();
    this.clearBuildStepTimers();
    this.resetActivePageBuildSection();
    this.pendingFinalBuildSection = null;
    this.pendingPreviewResponse = null;
    this.pendingPreviewFailure = false;
    this.pendingCustomizationRequest = null;
    this.activeCustomizationProgressBlock = null;
    this.hasInitialFlowCompleted = false;
    this.shouldDeferPreviewApply = false;
    this.hasInitialBuildCompletionUi = false;
    this.hasRepairFlowTakenOver = false;
    this.repairAttemptVersion++;
    this.customizationRequestVersion++;
    this.initialFlowRunId++;
    this.isContinueProjectGenerationRequestInFlight = false;
    this.blocks = [];
    this.designMap.clear();
    this.designOrder = [];
    this.designCount = 0;
    this.usedVariations = [];
    this.currentTemplateId = null;
    this.selected_template_id = '';
    this.pendingPreviewUrl = null;
    this.safePreviewUrl = null;
    this.hasAutoOpenedCurrentMobilePreview = false;
    this.hasDismissedCurrentMobilePreview = false;
    this.resetBuildGenerationError();
    this.closeBuildGenerationFailureModal();
    this.hideDeployHeaderAction();
    this.isTyping = !!inquiryId;
    this.isReactBuilding = !!inquiryId;
    this.isIframeLoading = !!inquiryId;
    this.currentSuggestions = null;
    this.suggestionsError = null;
  }

  private isCurrentRouteChange(routeChangeVersion: number, inquiryId: string): boolean {
    return this.routeChangeVersion === routeChangeVersion && this.selectedProjectId === inquiryId;
  }

  private shouldStartInitialGeneration(inquiryId: string, generationTab: any): boolean {
    return this.projectsData?.clientEnquryId === inquiryId
      || !!generationTab;
  }

  private ensureBuildSocket(inquiryId: string) {
    if (!inquiryId || this.socketInquiryId === inquiryId) {
      return;
    }

    this.socket?.off?.('page-created');
    this.socket?.off?.('pages-generation-complete');
    this.socket?.disconnect?.();

    this.socket = io(this.apiService.apiUrl, {
      auth: {
        token: localStorage.getItem('tokenCTi'),
        inquiryPublicId: inquiryId,
        socketType: 'chat-v2'
      }
    });
    this.socketInquiryId = inquiryId;
    this.registerBuildSocketListeners();
  }

  private ensureCustomizationSocket(
    inquiryId: string
  ): void {


    if (!inquiryId) {
      return;
    }

    const storedConversationId =
      this.getStoredCustomizationConversationId();

    if (
      this.customizationSocket?.connected &&
      this.customizationSocketInquiryId === inquiryId &&
      this.customizationConversationId ===
      storedConversationId
    ) {
      this.emitResumeCustomizationConversation();
      return;
    }

    this.customizationSocket?.removeAllListeners?.();
    this.customizationSocket?.disconnect?.();

    this.customizationSocket = io(
      this.apiService.apiUrl,
      {
        auth: {
          token:
            localStorage.getItem('tokenCTi'),

          customizationConversationId:
            storedConversationId || null,

          inquiryId,
          socketType: 'customize'
        }
      }
    );

    this.customizationConversationId =
      storedConversationId;
    this.customizationSocketInquiryId = inquiryId;

    this.registerCustomizationSocketListeners();
  }

  private emitResumeCustomizationConversation(): void {
    const conversationId = this.getStoredCustomizationConversationId() || this.customizationConversationId;
    console.log('[Customize] Checking emitResumeCustomizationConversation. Stored ID:', conversationId, 'Connected:', this.customizationSocket?.connected);

    if (conversationId && this.customizationSocket?.connected) {
      console.log('[Customize] >>> EMITTING resumeCustomizationConversation to backend:', { conversationId });
      this.customizationSocket.emit('resumeCustomizationConversation', { conversationId });
    }
  }

  private registerCustomizationSocketListeners(): void {
    this.customizationSocket.on('connect', () => {
      console.log('[ANGULAR CUSTOMIZE] CONNECTED:', this.customizationSocket.id);
      this.emitResumeCustomizationConversation();
    });

    this.customizationSocket.on('conversationResumed', (payload: any) => {
      console.log('[Customize] conversationResumed:', payload);
      this.isCustomizationRestoring = false;

      const conversationId = String(payload?.conversationId || '').trim();
      if (conversationId) {
        this.customizationConversationId = conversationId;
        this.saveCustomizationConversationId(conversationId);
      }

      if (Array.isArray(payload?.messages)) {
        this.customizationMessages = payload.messages.map((m: any) => this.normalizeCustomizationChatMessage(m));
      }
    });

    this.customizationSocket.on('customizationConversationResumed', (payload: any) => {
      console.log('[Customize] customizationConversationResumed:', payload);
      this.isCustomizationRestoring = false;

      const conversationId = String(payload?.conversationId || '').trim();
      if (conversationId) {
        this.customizationConversationId = conversationId;
        this.saveCustomizationConversationId(conversationId);
      }

      if (Array.isArray(payload?.messages)) {
        this.customizationMessages = payload.messages.map((m: any) => this.normalizeCustomizationChatMessage(m));
      }
    });

    this.customizationSocket.on('customizationResponse', (payload: any) => {
      console.log('[Customize] customizationResponse (payload):', payload);
      this.handleCustomizationResponse(payload);
    });

    this.customizationSocket.on('customizationError', (payload: any) => {
      this.hideLoader();
      this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('status'));
      this.isTyping = false;

      this.blocks.push({
        id: `ai-message-${Date.now()}`,
        text: payload.message,
        done: true,
        timestamp: new Date()
      });

      console.error('[Customize] customizationError:', payload);
      this.isCustomizationRestoring = false;
    });

    this.customizationSocket.on('disconnect', (reason: any) => {
      console.log('[Customize] disconnect:', reason);
    });
  }


  private saveCustomizationConversationId(
    conversationId: string
  ): void {

    const normalizedId =
      conversationId?.trim();

    if (
      !normalizedId ||
      typeof localStorage === 'undefined'
    ) {
      return;
    }

    localStorage.setItem(
      this.customizationConversationStorageKey,
      normalizedId
    );
  }

  buildCustomizationPayload(
    type: CustomizationMessageType | string,
    data: Partial<CustomizationMessagePayload>
  ): CustomizationMessagePayload {
    const templatePublicId = this.currentTemplateId || this.selected_template_id || '';
    const reqId = data.requestId !== undefined ? data.requestId : (this.activeCustomizationRequestId || null);

    return {
      templatePublicId,
      type,
      requestId: reqId,
      message: data.message ?? null,
      elements: data.elements ?? [],
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      ...(data.optionId !== undefined ? { optionId: data.optionId } : {}),
      ...(data.optionLabel !== undefined ? { optionLabel: data.optionLabel } : {}),
      ...(data.questionId !== undefined ? { questionId: data.questionId } : {}),
      ...(Array.isArray(data.answers) ? { answers: data.answers } : {})
    };
  }

  sendCustomizationMessage(payload: CustomizationMessagePayload): void {
    if (!payload.templatePublicId) {
      payload.templatePublicId = this.currentTemplateId || this.selected_template_id || '';
    }

    if (!this.customizationSocket?.connected) {
      this.toster?.error('Customization chat is not connected right now. Please try again.');
      return;
    }

    console.log('[Customize] emitting customizationMessage:', payload);

    this.customizationSocket.emit(
      'customizationMessage',
      payload
    );
  }

  handleCustomizationResponse(payload: any): void {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    // Capture backend-generated active requestId
    const returnedRequestId = payload.activeRequest?.requestId || payload.requestId || payload.activeRequestId || null;
    if (returnedRequestId) {
      this.activeCustomizationRequestId = returnedRequestId;
    }

    // Clear active requestId if task completed
    if (payload.status === 'completed' || payload.isCompleted || payload.done || payload.completed) {
      this.activeCustomizationRequestId = null;
    }

    this.hideLoader();
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('status'));
    this.isTyping = false;

    const response = payload;

    switch (response.replyType) {
      case 'message':
        if (response.message) {
          this.blocks.push({
            id: `ai-message-${Date.now()}`,
            text: response.message,
            done: true,
            timestamp: new Date()
          });
        }
        break;

      case 'question':
        if (response.options && response.options.length > 0) {
          const parsedOptions = response.options.map((opt: any) => ({
            id: String(opt.id || opt.value || opt.label || ''),
            label: String(opt.label || opt.text || opt.title || opt.id || '')
          }));
          const defaultMap: { [key: string]: boolean } = {};

          this.blocks.push({
            id: `customization-card-${Date.now()}`,
            type: 'customization-card',
            data: {
              requestId: returnedRequestId || this.activeCustomizationRequestId || null,
              questionId: response.questionId || response.pendingQuestion?.id || null,
              message: response.message || 'Please answer the question below:',
              questionTitle: response.questionTitle || 'Agent has questions for you',
              options: parsedOptions,
              selectedOptionsMap: defaultMap,
              currentQuestionIndex: response.currentQuestionIndex || 0,
              totalQuestions: response.totalQuestions || 1,
              answered: false
            }
          });
        } else if (response.message) {
          this.blocks.push({
            id: `ai-message-${Date.now()}`,
            text: response.message,
            done: true,
            timestamp: new Date()
          });
        }
        break;

      case 'options':
        const parsedOptions = Array.isArray(response.options) ? response.options.map((opt: any) => ({
          id: String(opt.id || opt.value || opt.label || ''),
          label: String(opt.label || opt.text || opt.title || opt.id || '')
        })) : [];

        const parsedQuestions = Array.isArray(response.questions) ? response.questions.map((q: any) => ({
          questionId: String(q.questionId || q.id || ''),
          message: String(q.message || q.title || ''),
          options: Array.isArray(q.options) ? q.options.map((opt: any) => ({
            id: String(opt.id || opt.value || opt.label || ''),
            label: String(opt.label || opt.text || opt.title || opt.id || '')
          })) : []
        })) : [];

        const defaultMap: { [key: string]: boolean } = {};
        const defaultMultiMap: { [key: string]: string } = {};

        this.blocks.push({
          id: `customization-card-${Date.now()}`,
          type: 'customization-card',
          data: {
            requestId: returnedRequestId || this.activeCustomizationRequestId || null,
            questionId: response.questionId || null,
            message: response.message || 'Please select your options:',
            questionTitle: response.questionTitle || response.title || 'Agent has questions for you',
            options: parsedOptions,
            questions: parsedQuestions,
            selectedOptionsMap: defaultMap,
            selectedMultiOptionsMap: defaultMultiMap,
            currentQuestionIndex: response.currentQuestionIndex || 0,
            totalQuestions: response.totalQuestions || (parsedQuestions.length > 0 ? parsedQuestions.length : 1),
            answered: false
          }
        });
        break;

      case 'customization-completed':
      case 'customization_completed':
        const summaryObj = response.summary || {};
        const summaryTitle = summaryObj.summary || response.message || 'Customization completed';
        const changesList = Array.isArray(summaryObj.changes) ? summaryObj.changes : [];

        this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('inline-cta'));

        this.blocks.push({
          id: `customization-completed-${Date.now()}`,
          type: 'customization-completed',
          data: {
            title: summaryTitle,
            changes: changesList,
            buttonLabel: 'Deploy',
            actionId: 'deploy_template',
            buttonLabel2: 'Download',
            actionId2: 'download_code'
          },
          done: true,
          timestamp: new Date()
        });
        break;

      default:
        if (response.message) {
          this.blocks.push({
            id: `ai-message-${Date.now()}`,
            text: response.message,
            done: true,
            timestamp: new Date()
          });
        }
        break;
    }
    setTimeout(() => this.scrollToBottom(true), 50);
  }

  addCustomizationMessage(msg: CustomizationChatMessage): void {
    this.customizationMessages.push(msg);
    if (msg.sender === 'user' && (msg.message || (msg.attachments && msg.attachments.length > 0) || (msg.editComments && msg.editComments.length > 0))) {
      this.blocks.push({
        id: `user-message-${Date.now()}`,
        text: msg.message || '',
        attachments: msg.attachments || [],
        editComments: msg.editComments || [],
        done: true,
        timestamp: new Date()
      });
    }
    setTimeout(() => this.scrollToBottom(true), 50);
  }

  toggleCustomizationOptionCheckbox(chat: CustomizationChatMessage, optionId: string): void {
    if (chat.answered) {
      return;
    }

    if (!chat.selectedOptionsMap) {
      chat.selectedOptionsMap = {};
    }

    chat.selectedOptionsMap[optionId] = !chat.selectedOptionsMap[optionId];
  }

  isCustomizationOptionChecked(chat: CustomizationChatMessage, optionId: string): boolean {
    return !!(chat.selectedOptionsMap && chat.selectedOptionsMap[optionId]);
  }

  hasAnyCustomizationOptionSelected(chat: CustomizationChatMessage): boolean {
    if (!chat.selectedOptionsMap) {
      return false;
    }
    return Object.values(chat.selectedOptionsMap).some(val => !!val);
  }

  submitCustomizationOptions(chat: CustomizationChatMessage): void {
    if (chat.answered || !chat.options) {
      return;
    }

    const selectedOptions = chat.options.filter(opt => this.isCustomizationOptionChecked(chat, opt.id));
    if (selectedOptions.length === 0) {
      return;
    }

    chat.answered = true;

    const selectedLabels = selectedOptions.map(opt => opt.label).join(', ');
    chat.userInputAnswer = selectedLabels;

    this.addCustomizationMessage({
      sender: 'user',
      message: selectedLabels,
      replyType: 'message'
    });

    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('status'));
    this.isTyping = true;
    this.showLoader('Thinking...');

    const firstOpt = selectedOptions[0];
    const payload = this.buildCustomizationPayload(CustomizationMessageType.OPTION_SELECTION, {
      requestId: this.activeCustomizationRequestId,
      message: selectedLabels,
      elements: [],
      attachments: [],
      optionId: firstOpt?.id || '',
      optionLabel: selectedLabels,
      questionId: chat.questionId || chat.pendingQuestion?.id || null
    });

    this.sendCustomizationMessage(payload);
  }

  autoAnswerCustomizationQuestion(chat: CustomizationChatMessage): void {
    if (chat.answered || !chat.options || chat.options.length === 0) {
      return;
    }

    if (!this.hasAnyCustomizationOptionSelected(chat)) {
      if (!chat.selectedOptionsMap) {
        chat.selectedOptionsMap = {};
      }
      chat.selectedOptionsMap[chat.options[0].id] = true;
    }

    this.submitCustomizationOptions(chat);
  }

  selectCustomizationOption(chat: CustomizationChatMessage, option: CustomizationOption): void {
    if (chat.answered) {
      return;
    }

    chat.answered = true;
    chat.selectedOptionId = option.id;

    this.addCustomizationMessage({
      sender: 'user',
      message: option.label,
      replyType: 'message'
    });

    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('status'));
    this.isTyping = true;
    this.showLoader('Thinking...');

    const payload = this.buildCustomizationPayload(CustomizationMessageType.OPTION_SELECTION, {
      requestId: this.activeCustomizationRequestId,
      message: option.label,
      elements: [],
      attachments: [],
      optionId: option.id,
      optionLabel: option.label,
      questionId: chat.questionId || chat.pendingQuestion?.id || null
    });

    this.sendCustomizationMessage(payload);
  }

  submitCustomizationQuestionAnswer(chat: CustomizationChatMessage, answerValue: string): void {
    const trimmed = answerValue?.trim();
    if (!trimmed || chat.answered) {
      return;
    }

    chat.answered = true;
    chat.userInputAnswer = trimmed;

    this.addCustomizationMessage({
      sender: 'user',
      message: trimmed,
      replyType: 'message'
    });

    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('status'));
    this.isTyping = true;
    this.showLoader('Thinking...');

    const payload = this.buildCustomizationPayload(CustomizationMessageType.QUESTION_ANSWER, {
      requestId: this.activeCustomizationRequestId,
      message: trimmed,
      elements: [],
      attachments: [],
      questionId: chat.questionId || chat.pendingQuestion?.id || null
    });

    this.sendCustomizationMessage(payload);
  }

  trackByChatMessage(index: number, item: CustomizationChatMessage): any {
    return item.questionId || index;
  }

  private normalizeCustomizationChatMessage(raw: any): CustomizationChatMessage {
    if (!raw || typeof raw !== 'object') {
      return {
        sender: 'ai',
        message: String(raw || ''),
        replyType: 'message'
      };
    }

    const sender = raw.sender === 'user' || raw.role === 'user' ? 'user' : 'ai';
    const replyType = raw.replyType || 'message';

    return {
      sender,
      message: raw.message || raw.text || '',
      replyType,
      questionId: raw.questionId || raw.pendingQuestion?.id,
      pendingQuestion: raw.pendingQuestion ? {
        id: raw.pendingQuestion.id || raw.questionId || '',
        type: raw.pendingQuestion.type || 'text'
      } : undefined,
      options: Array.isArray(raw.options) ? raw.options.map((opt: any) => ({
        id: String(opt.id || opt.value || opt.label || ''),
        label: String(opt.label || opt.text || opt.title || opt.id || '')
      })) : [],
      questions: Array.isArray(raw.questions) ? raw.questions.map((q: any) => ({
        questionId: String(q.questionId || q.id || ''),
        message: String(q.message || q.title || ''),
        options: Array.isArray(q.options) ? q.options.map((opt: any) => ({
          id: String(opt.id || opt.value || opt.label || ''),
          label: String(opt.label || opt.text || opt.title || opt.id || '')
        })) : []
      })) : [],
      answered: !!raw.answered,
      selectedOptionId: raw.selectedOptionId,
      userInputAnswer: raw.userInputAnswer
    };
  }


  private getStoredCustomizationConversationId():
    string | null {

    if (
      typeof localStorage === 'undefined'
    ) {
      return null;
    }

    return localStorage.getItem(
      this.customizationConversationStorageKey
    );
  }

  private applyStoredCompletedPreview(previewData: ProjectGenerationPreviewData) {
    if (!previewData?.templateId) {
      return;
    }

    this.queueGeneratedPreview({ data: previewData }, null, true);
  }

  private startContinueProjectGenerationPolling(inquiryId: string, jobId: string) {
    if (!jobId || !this.isInquiryActive(inquiryId)) {
      return;
    }

    this.clearContinueProjectGenerationInterval();
    this.continueProjectGeneration(jobId, inquiryId);
    this.continueProjectGenerationInterval = setInterval(() => {
      if (!this.isInquiryActive(inquiryId)) {
        this.clearContinueProjectGenerationInterval();
        return;
      }

      const latestJobId = this.projectGenerationTabState.getTabState(inquiryId)?.jobId?.trim();
      if (!latestJobId) {
        this.clearContinueProjectGenerationInterval();
        return;
      }

      this.continueProjectGeneration(latestJobId, inquiryId);
    }, this.generateProjectInternal);
  }

  private isInquiryActive(inquiryId: string): boolean {
    return !!inquiryId && this.selectedProjectId === inquiryId;
  }

  clearContinueProjectGenerationInterval() {
    if (!this.continueProjectGenerationInterval) {
      return;
    }

    clearInterval(this.continueProjectGenerationInterval);
    this.continueProjectGenerationInterval = null;
  }

  async getUserTemplates(): Promise<any[]> {
    const res = await firstValueFrom(
      this.apiService.getApi<any>(
        'api/user/fetchClientAllProjects',
      )
    );
    if (res.success) {
      this.templates = res.data;
      this.templateExists = res.data.length > 0;
      return res.data;
    }

    return [];
  }
  ngAfterViewInit() {
    this.scrollToBottom(true);
  }

  ngAfterViewChecked() {
    if (this.chatScroll?.nativeElement && this.chatScroll.nativeElement !== this.lastChatScrollElement) {
      this.lastChatScrollElement = this.chatScroll.nativeElement;
      this.scrollToBottom(true);
    }
  }
  onUserScroll() {
  }

  startPreview(socket_id: string | null) {
    const inquiryId = this.selectedProjectId;
    const ai_model = this.apiService._aiModel();
    if (!inquiryId) {
      return;
    }

    this.suggestionsMap.delete(inquiryId);
    this.isSuggestionsDismissedMap.set(inquiryId, false);

    if (socket_id) {
      this.setBuildFlow('initial');
      this.startBuildProgressTimers();
    }
    this.projectGenerationTabState.markGenerating(inquiryId);
    const payload = this.buildPreviewPayload(socket_id, ai_model);

    this.apiService
      .postAPI<any, any>('api/ai/generateProject', payload)
      .subscribe({
        next: (res: any) => {
          const shouldApplyUi = this.isSelectedProjectContext(inquiryId);

          if (!res?.success) {
            const errorMessage = res?.data?.message || 'Failed to generate preview';
            this.projectGenerationTabState.markError(inquiryId, errorMessage);
            if (!shouldApplyUi) {
              return;
            }
            this.deferGenerateProjectFailure(errorMessage);
            return;
          }

          if (res.success && res.data?.templateId) {
            this.persistCompletedGeneration(inquiryId, res?.data);
            if (!shouldApplyUi) {
              return;
            }
            this.clearGenerateProjectFailureTimer();
            this.queueGeneratedPreview(res, null, false);
            return;
          }

          this.projectGenerationTabState.setJobId(inquiryId, res.data.jobId);
          if (!shouldApplyUi) {
            return;
          }
          this.startContinueProjectGenerationPolling(inquiryId, res.data.jobId);
          return;
        },
        error: (error: any) => {
          this.projectGenerationTabState.markError(inquiryId, this.extractBuildGenerationErrorMessage(error));
          if (!this.isSelectedProjectContext(inquiryId)) {
            return;
          }
          this.deferGenerateProjectFailure(error);
        }
      });
  }

  continueProjectGeneration(jobId: string, inquiryId: string) {
    if (!jobId || !inquiryId || this.isContinueProjectGenerationRequestInFlight) {
      return;
    }

    this.isContinueProjectGenerationRequestInFlight = true;
    this.apiService
      .getApi<any>(`api/ai/generateProject/status/${jobId}`)
      .subscribe({
        next: (res: any) => {
          this.isContinueProjectGenerationRequestInFlight = false;
          const shouldApplyUi = this.isSelectedProjectContext(inquiryId);
          const runningPages = Array.isArray(res?.data?.pages) ? res.data.pages : [];
          const statusCode = Number(res?.status ?? res?.data?.statusCode ?? res?.data?.status ?? 200);
          if (statusCode === 202) {
            if (shouldApplyUi) {
              if (this.shouldDeferPreviewApply) {
                for (const page of runningPages) {
                  const label = this.extractPageLabel(page);
                  if (label) {
                    if (this.activePageBuildSection) {
                      this.appendSocketPageToBuildSection(label);
                    } else if (!this.hasCompletedPageGeneration) {
                      if (!this.queuedSocketPages.includes(label)) {
                        this.queuedSocketPages.push(label);
                      }
                    }
                  }
                }
              } else {
                this.syncRunningBuildBlocks(runningPages);
              }
            }
            return;
          }

          this.finalizeContinueProjectGenerationPolling(inquiryId);
          if (!res?.success) {
            const errorMessage = res?.data?.message || 'Failed to generate preview';
            this.projectGenerationTabState.markError(inquiryId, errorMessage);
            if (!shouldApplyUi) {
              return;
            }
            this.setBuildGenerationError(errorMessage);
            this.queueBuildGenerationFailure(true);
            return;
          }
          this.persistCompletedGeneration(inquiryId, res?.data);
          if (!shouldApplyUi) {
            return;
          }
          this.clearGenerateProjectFailureTimer();
          this.queueGeneratedPreview(res, null, false);
          return;
        },
        error: (error: any) => {
          this.isContinueProjectGenerationRequestInFlight = false;
          this.finalizeContinueProjectGenerationPolling(inquiryId);
          const shouldApplyUi = this.isSelectedProjectContext(inquiryId);
          if (error.error.status === 422 && error.error.data.canRepairBuild) {
            this.clearGenerateProjectFailureTimer();
            this.projectGenerationTabState.markRepairing(inquiryId, this.extractBuildGenerationErrorMessage(error));
            if (!shouldApplyUi) {
              return;
            }
            const repairPayload = this.buildRepairPayload(error);
            this.currentTemplateId = error.error.data.templatePublicId;
            void this.attemptBuildRepair(repairPayload, error);
            return;
          }
          this.projectGenerationTabState.markError(inquiryId, this.extractBuildGenerationErrorMessage(error));
          if (!shouldApplyUi) {
            return;
          }
          this.setBuildGenerationError(error);
          this.queueBuildGenerationFailure(true);
        }
      });

  }

  private finalizeContinueProjectGenerationPolling(inquiryId: string) {
    this.clearContinueProjectGenerationInterval();
    this.projectGenerationTabState.clearJobId(inquiryId);
  }

  private persistCompletedGeneration(inquiryId: string, data: any) {
    if (!inquiryId || !data?.templateId) {
      return;
    }

    this.projectGenerationTabState.markCompleted(inquiryId, {
      templateId: data.templateId,
      pages: data.pages,
      login_redirect: data.login_redirect,
      reactBuildUrl: data.reactBuildUrl,
      variation: data.variation
    });
  }

  private isSelectedProjectContext(inquiryId: string): boolean {
    return !!inquiryId && this.selectedProjectId === inquiryId;
  }

  private buildPreviewPayload(socketId: string | null, ai_model: string) {
    return {
      prompt: this.finalPrompt,
      project_id: this.projectsData.projectId,
      inquiryPublicId: this.projectsData.clientEnquryId,
      socket_id: socketId,
      ai_model: ai_model,
      ai_model_version: this.apiService._aiModelVersion(),
      excludeVariations: this.usedVariations
    };
  }

  private buildRepairPayload(error: any, fallbackTemplatePublicId?: string) {
    const buildStage = error?.error?.data?.buildStage ?? null;
    return {
      templatePublicId: error?.error?.data?.templatePublicId || fallbackTemplatePublicId,
      inquiryPublicId: this.projectsData.clientEnquryId,
      errorsMessage: error?.error?.data?.errorsMessage ?? error?.error?.message,
      buildStage,
      isPreBuild: buildStage === 'syntax_scan',
    };
  }

  private async attemptBuildRepair(payload: any, buildFailureSource?: any, attemptNumber = 1) {
    this.setBuildGenerationError(buildFailureSource);
    if (this.selectedProjectId) {
      this.projectGenerationTabState.markRepairing(
        this.selectedProjectId,
        this.extractBuildGenerationErrorMessage(buildFailureSource)
      );
    }
    this.clearBuildStepTimers();
    this.hasRepairFlowTakenOver = true;
    this.hideLoader();
    this.setBuildFlow('repair');
    const repairAttemptVersion = ++this.repairAttemptVersion;
    await this.announceRepairAttempt(repairAttemptVersion, attemptNumber);
    if (repairAttemptVersion !== this.repairAttemptVersion) {
      return;
    }

    this.apiService
      .postAPI<any, any>('api/ai/repairBuild', payload)
      .subscribe({
        next: (res: any) => {
          if (!res?.success || !res?.data?.templateId) {
            if (attemptNumber >= this.maxBuildRepairAttempts) {
              this.appendBuildActionPrompt();
            }
            this.setBuildGenerationError(res.data?.message || 'Failed to generate preview');
            if (this.selectedProjectId) {
              this.projectGenerationTabState.markError(this.selectedProjectId, res.data?.message || 'Failed to generate preview');
            }
            this.queueBuildGenerationFailure();
            return;
          }

          if (this.selectedProjectId) {
            this.persistCompletedGeneration(this.selectedProjectId, res?.data);
          }
          this.appendBuildActionPrompt();
          this.queueGeneratedPreview(res, payload.socket_id ?? null);
        },
        error: (error: any) => {
          console.log('Build repair attempt failed:', error);
          if (error.error.status === 422 && error.error.data.canRepairBuild) {
            if (attemptNumber < this.maxBuildRepairAttempts) {
              payload.errorsMessage = error?.error?.data?.errorsMessage ?? error?.error?.message;
              payload.buildStage = error?.error?.data?.buildStage ?? null;
              payload.isPreBuild = payload.buildStage === 'syntax_scan';
              void this.attemptBuildRepair(payload, error, attemptNumber + 1);
              return;
            }
          }
          if (attemptNumber >= this.maxBuildRepairAttempts) {
            this.appendBuildActionPrompt();
          }
          if (this.selectedProjectId) {
            this.projectGenerationTabState.markError(this.selectedProjectId, this.extractBuildGenerationErrorMessage(error));
          }
          this.setBuildGenerationError(error);
          this.queueBuildGenerationFailure();
        }
      });
  }

  private async announceRepairAttempt(repairAttemptVersion: number, attemptNumber: number) {
    this.isReactBuilding = true;
    this.isTyping = true;
    this.setBuildStep(1);
    const repairAttemptMessage =
      this.buildRepairAttemptMessages[attemptNumber - 1] ||
      this.buildRepairAttemptMessages[this.buildRepairAttemptMessages.length - 1];

    await this.addParagraphBlock(
      `${repairAttemptMessage.phase} (Attempt ${attemptNumber}/${this.maxBuildRepairAttempts})`,
      500,
      'phase'
    );
    if (repairAttemptVersion !== this.repairAttemptVersion) {
      return;
    }

    await this.addParagraphBlock(
      repairAttemptMessage.support,
      600,
      'support'
    );
    if (repairAttemptVersion !== this.repairAttemptVersion) {
      return;
    }

    await this.showLoader('Inspecting failed build output...');
    this.setBuildStep(2);
    await this.addBuildSection(
      `Repairing build${attemptNumber > 1 ? ` (attempt ${attemptNumber}/${this.maxBuildRepairAttempts})` : '...'}`,
      '🔧',
      [
        `Reviewing failure diagnostics for attempt ${attemptNumber}`,
        'Repairing generated files and build configuration',
        `Retrying preview generation after repair pass ${attemptNumber}`
      ],
      1200,
      600
    );
    this.hideLoader();
    if (repairAttemptVersion !== this.repairAttemptVersion) {
      return;
    }

    this.setBuildStep(3);
    this.showLoader('Repair build is in progress...');
  }

  private handleBuildGenerationFailure() {

    if (this.hasUsablePreviewState()) {
      this.isRetryBuildGenerationSubmitting = false;
      this.repairAttemptVersion++;
      this.clearBuildStepTimers();
      this.stopAiProcessingPhase();
      this.pendingFinalBuildSection = null;
      this.isReactBuilding = false;
      this.isIframeLoading = false;
      this.isTyping = false;
      this.toster.error('We hit an issue while refreshing the preview. Your last available preview is still loaded.');
      return;
    }

    this.isRetryBuildGenerationSubmitting = false;
    this.repairAttemptVersion++;
    this.clearBuildStepTimers();
    this.stopAiProcessingPhase();
    this.pendingFinalBuildSection = null;
    this.isReactBuilding = false;
    this.isIframeLoading = false;
    this.isTyping = false;
    this.safePreviewUrl = null;
    this.pendingPreviewUrl = null;

    const modalElement = document.getElementById('buildGenerationFailedModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement, {
      backdrop: 'static',
      keyboard: false
    });
    modalInstance.show();
  }

  private queueGeneratedPreview(res: any, socketId: string | null, forceImmediate = false) {
    this.clearGenerateProjectFailureTimer();
    this.completeActivePageBuildSection(res?.data?.pages);
    if (!forceImmediate && this.shouldDeferPreviewApply && !this.hasInitialFlowCompleted) {
      this.pendingPreviewResponse = { res, socketId };
      return;
    }
    this.resetBuildGenerationError();
    this.closeBuildGenerationFailureModal();
    this.scrollToBottom();
    this.applyGeneratedPreview(res, socketId);
  }

  private applyGeneratedPreview(res: any, socketId: string | null) {
    this.isRetryBuildGenerationSubmitting = false;
    this.repairAttemptVersion++;
    this.subscriptionService.loadSubscription();
    this.stopAiProcessingPhase();
    this.isReactBuilding = true;

    const templateId = res.data.templateId;
    this.currentTemplateId = templateId;
    this.selected_template_id = templateId;
    const previewUrl = this.getPreviewUrlFromResponse(res.data, templateId);

    if (res.data.variation) {
      this.usedVariations.push(res.data.variation);
    }

    this.designCount++;

    const designId = `design-${this.designCount}`;

    const snapshot: DesignSnapshot = {
      id: designId,
      label: `Template ${this.designCount}`,
      pages: res.data.pages,
      loginRedirect: res.data.login_redirect,
      createdAt: new Date()
    };

    this.designMap.set(designId, snapshot);

    this.designOrder.push({
      designId,
      url: previewUrl,
      user_template_id: res.data.templateId || null,
      variation_no: res.data.variation
    });

    if (socketId) {
      this.pendingPreviewUrl = previewUrl;
      this.preparePreviewLoadState();
    } else {
      this.setSafePreviewUrl(previewUrl);
    }

    this.isReactBuilding = false;
    this.isTyping = false;
    if (this.buildFlowType === 'initial') {
      this.completeInitialBuildUi();
      this.fetchCustomizationSuggestions(this.selectedProjectId);
    } else {
      this.appendBuildActionPrompt();
      this.fetchCustomizationSuggestions(this.selectedProjectId);
    }

    if (this.previewReadyTimer) {
      clearTimeout(this.previewReadyTimer);
    }
    this.previewReadyTimer = setTimeout(() => {
      if (!this.isFeedbackSubmitted) {
        this.showFeedbackModal();
      }
    }, 30000);
  }

  private queueBuildGenerationFailure(forceImmediate = false) {

    this.clearGenerateProjectFailureTimer();
    this.completeActivePageBuildSection();
    if (!forceImmediate && this.shouldDeferPreviewApply && !this.hasInitialFlowCompleted) {
      this.pendingPreviewFailure = true;
      return;
    }

    this.handleBuildGenerationFailure();
  }

  private flushDeferredPreviewState() {
    if (this.pendingPreviewFailure) {
      this.pendingPreviewFailure = false;
      this.handleBuildGenerationFailure();
      return;
    }

    if (this.pendingPreviewResponse) {
      const pendingResponse = this.pendingPreviewResponse;
      this.pendingPreviewResponse = null;
      this.applyGeneratedPreview(pendingResponse.res, pendingResponse.socketId);
    }
  }

  private async runInitialBuildSequence() {
    this.isReactBuilding = true;
    this.shouldDeferPreviewApply = true;
    this.hasInitialFlowCompleted = false;
    this.pendingPreviewResponse = null;
    this.pendingPreviewFailure = false;
    this.hasInitialBuildCompletionUi = false;
    this.hasRepairFlowTakenOver = false;
    this.clearGenerateProjectFailureTimer();
    this.stopAiProcessingPhase();

    this.startPreview(null);
    await this.startFlow();

    this.hasInitialFlowCompleted = true;
    this.shouldDeferPreviewApply = false;
    this.flushDeferredPreviewState();

    if (!this.hasRepairFlowTakenOver && !this.hasInitialBuildCompletionUi && this.isReactBuilding) {
      await this.showRealAiProcessingPhase();
    }
  }

  private restoreRunningBuildBlocks(): void {
    this.stopAiProcessingPhase();
    this.blocks = [];
    this.resetActivePageBuildSection();
    this.pendingFinalBuildSection = null;
    this.hasInitialBuildCompletionUi = false;
    this.hasRepairFlowTakenOver = false;
    this.isReactBuilding = true;
    this.isTyping = true;
    this.isIframeLoading = true;
    this.setBuildFlow('initial');
    this.setBuildStep(3);

    this.blocks.push(this.createUserMessageBlock(this.finalPrompt));

    // this.blocks.push(this.createCompletedParagraphBlock('Analyzing your prompt...', 'phase'));
    this.blocks.push(this.createCompletedBuildSection(
      'Analyzing your prompt...',
      '🧠',
      [
        'Understanding project direction',
        'Mapping the main screens and user flow',
        'Defining overall product specification'
      ]
    ));
    this.blocks.push(this.createCompletedParagraphBlock(
      'The scope is clear now, so I’m moving into the actual build flow with structure first and code generation right after that.',
      'support'
    ));
    this.blocks.push(this.createCompletedParagraphBlock('Initializing project...', 'phase'));
    this.blocks.push(this.createCompletedBuildSection(
      'Initializing project...',
      '⚙️',
      [
        'Preparing workspace',
        'Initializing React project shell',
        'Setting up the base environment'
      ]
    ));
    this.blocks.push(this.createCompletedParagraphBlock('Creating structure...', 'phase'));
    this.blocks.push(this.createCompletedBuildSection(
      'Creating structure...',
      '📁',
      [
        'src/',
        'components/',
        'pages/',
        'services/',
        'hooks/',
        'context/'
      ]
    ));
    this.setBuildStep(2);
    this.blocks.push(this.createCompletedParagraphBlock('Creating core files...', 'phase'));
    this.blocks.push(this.createCompletedBuildSection(
      'Creating core files...',
      '📦',
      [
        'package.json',
        'vite.config.js',
        'index.html',
        'src/main.jsx',
        'src/App.jsx'
      ]
    ));
    this.blocks.push(this.createCompletedParagraphBlock('Building UI...', 'phase'));
    this.blocks.push(this.createCompletedBuildSection(
      'Building UI...',
      '🧩',
      [
        'Navbar.jsx',
        'Footer.jsx',
        'AppContext.jsx',
        'useProjectData.js',
        'api.js'
      ]
    ));
    this.blocks.push(this.createCompletedParagraphBlock('Creating pages...', 'phase'));
    this.showLoader('Generating screen-level page code...');
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private async syncRunningBuildBlocks(pages: any[] = []): Promise<void> {
    if (!pages.length || this.pendingFinalBuildSection || this.isRunningBuildSyncInProgress) {
      return;
    }

    const resumeVersion = this.runningBuildResumeVersion;
    this.isRunningBuildSyncInProgress = true;
    this.hideLoader();

    const pagesBlock = {
      type: 'build-section' as const,
      data: {
        title: 'Creating pages...',
        icon: '📄',
        done: false,
        items: [] as Array<{ label: string; status: 'active' | 'done' }>
      }
    };

    this.blocks.push(pagesBlock);
    setTimeout(() => this.scrollToBottom(true), 0);

    const restoredPages = this.getRestoredPageGenerationItems(pages);
    for (const pageLabel of restoredPages) {
      if (!this.shouldContinueRunningBuildResume(resumeVersion)) {
        this.isRunningBuildSyncInProgress = false;
        return;
      }

      pagesBlock.data.items.push({
        label: pageLabel,
        status: 'active'
      });
      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(320);

      pagesBlock.data.items[pagesBlock.data.items.length - 1].status = 'done';
      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(180);
    }

    if (!this.shouldContinueRunningBuildResume(resumeVersion)) {
      this.isRunningBuildSyncInProgress = false;
      return;
    }

    pagesBlock.data.done = true;
    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(250);

    if (!this.shouldContinueRunningBuildResume(resumeVersion)) {
      this.isRunningBuildSyncInProgress = false;
      return;
    }

    this.blocks.push(this.createCompletedParagraphBlock('Finalizing...', 'phase'));

    const finalBuildSection = this.createActiveBuildSection(
      'Finalizing...',
      '🚀',
      [
        { label: 'Installing dependencies', status: 'done' },
        { label: 'Building preview bundle', status: 'done' },
        { label: 'Deploying preview', status: 'active' }
      ]
    );

    this.pendingFinalBuildSection = finalBuildSection;
    this.blocks.push(finalBuildSection);
    this.blocks.push(this.createCompletedParagraphBlock('Final preview processing is still running...', 'phase'));
    this.blocks.push(this.createCompletedParagraphBlock('This may take 2–5 minutes depending on project complexity.', 'support'));
    this.startAiProcessingPhase();
    this.isRunningBuildSyncInProgress = false;
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  retryBuildGeneration() {
    if (this.isRetryBuildGenerationSubmitting) {
      return;
    }

    this.isRetryBuildGenerationSubmitting = true;
    const modalElement = document.getElementById('buildGenerationFailedModal');
    if (modalElement) {
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }

    this.resetBuildGenerationError();
    this.isReactBuilding = true
    this.runInitialBuildSequence();
  }


  contachSupport() {
    this.closeBuildGenerationFailureModal();
    this.openCallbackModal();
  }

  closeBuildGenerationFailedModal() {
    this.resetBuildGenerationError();
    this.closeFailedGenerationWorkspaceAndNavigateHome();
  }

  get hasBuildGenerationErrorMessage(): boolean {
    return !!this.buildGenerationErrorMessage.trim();
  }

  get displayedBuildGenerationErrorMessage(): string {
    const message = this.buildGenerationErrorMessage.trim();
    if (!message) {
      return '';
    }

    if (this.isBuildGenerationErrorExpanded) {
      return message;
    }

    const lines = message
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line, index, arr) => line.length > 0 || (index > 0 && arr[index - 1].length > 0));

    const previewLines = lines.slice(0, this.buildErrorPreviewLineLimit);
    let preview = previewLines.join('\n').trim();

    if (preview.length > this.buildErrorPreviewCharLimit) {
      preview = `${preview.slice(0, this.buildErrorPreviewCharLimit).trimEnd()}...`;
    }

    if (!preview) {
      preview = message.slice(0, this.buildErrorPreviewCharLimit).trimEnd();
    }

    return preview;
  }

  get shouldShowBuildGenerationErrorToggle(): boolean {
    const message = this.buildGenerationErrorMessage.trim();
    if (!message) {
      return false;
    }

    const lines = message.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.length > this.buildErrorPreviewLineLimit || message.length > this.buildErrorPreviewCharLimit;
  }

  toggleBuildGenerationErrorExpanded() {
    this.isBuildGenerationErrorExpanded = !this.isBuildGenerationErrorExpanded;
  }

  private resetBuildGenerationError() {
    this.buildGenerationErrorMessage = '';
    this.isBuildGenerationErrorExpanded = false;
  }

  private closeBuildGenerationFailureModal() {
    const modalElement = document.getElementById('buildGenerationFailedModal');
    if (!modalElement) {
      return;
    }

    bootstrap.Modal.getOrCreateInstance(modalElement).hide();
  }

  private setBuildGenerationError(source?: any) {
    const message = this.extractBuildGenerationErrorMessage(source);
    this.buildGenerationErrorMessage = message;
    this.isBuildGenerationErrorExpanded = false;
  }

  private extractBuildGenerationErrorMessage(source?: any): string {
    const candidate = source?.error?.message
      || source?.error?.error?.message
      || source?.error?.data?.message
      || source?.data?.message;

    if (typeof candidate !== 'string') {
      return '';
    }

    return candidate
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
      .join('\n')
      .trim();
  }

  private hasUsablePreviewState(): boolean {
    return !!this.safePreviewUrl || !!this.pendingPreviewUrl || this.designOrder.length > 0;
  }

  private getPreviewUrlFromResponse(data: any, templateId: string) {
    const previewUrl = typeof data?.preview === 'string' ? data.preview.trim() : '';
    return previewUrl || this.getPreviewProxyUrl(templateId);
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

  private closeBootstrapModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      return;
    }

    bootstrap.Modal.getOrCreateInstance(modalElement).hide();
  }

  getCurrentCreditBalance(): number {
    return Number((this.subscriptionPlan as any)?.creditBalance || 0);
  }

  get isFreePlan(): boolean {
    if (!this.subscriptionPlan) return true;
    return this.subscriptionPlan.planType === 'FREE' || (this.subscriptionPlan as any).planName === 'FREE_PLAN';
  }

  private openInsufficientCreditsModal(requiredCredits: number, actionLabel: string) {
    this.insufficientCreditsRequired = requiredCredits;
    this.insufficientCreditsActionLabel = actionLabel;
    this.openBootstrapModal('insufficientCreditsModal', { backdrop: 'static', keyboard: true });
  }

  openDownloadCodeModal() {
    this.openBootstrapModal('downloadCodeConfirmModal', { backdrop: 'static', keyboard: true });
  }

  confirmDownloadCode() {
    this.closeBootstrapModal('downloadCodeConfirmModal');

    if (this.getCurrentCreditBalance() < this.downloadCodeCreditsRequired) {
      this.openInsufficientCreditsModal(this.downloadCodeCreditsRequired, 'downloading code');
      return;
    }

    this.downloadCurrentCodeFiles();
  }

  private async downloadCurrentCodeFiles() {

    const templates = await this.getUserTemplates();
    const activeDesign = templates.find((t: any) => t.inquiryId === this.selectedProjectId);

    if (!activeDesign.templateId) {
      console.error("No active design found");
      return;
    }

    this.apiService.getBlob('api/ai/download-project', { templatePublicId: activeDesign.templateId }).subscribe(res => {
      console.log('Download response:', res);
      if (!res) {
        this.toster.error('Failed to download code files. Please try again later.');
        return;
      }
      const pdfUrl = window.URL.createObjectURL(res);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${activeDesign.projectName}.zip`;
      link.click();
      window.URL.revokeObjectURL(pdfUrl);
    });
  }

  onCustomDomainInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.customDomain = (input?.value || '').trim();
    this.customDomainTouched = true;
  }

  get isCustomDomainValid(): boolean {
    if (!this.customDomain) {
      return false;
    }

    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.customDomain);
  }



  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showLoader(text = 'Thinking…') {
    // remove old loader if any
    this.blocks = this.blocks.filter(b => b.id !== 'status');

    this.blocks.push({
      id: 'status',
      text,
      done: false,
      timestamp: new Date()
    });
  }

  hideLoader() {
    this.blocks = this.blocks.filter(b => b.id !== 'status');
  }

  startChatResize(event: MouseEvent): void {
    if (this.isMobileView() || this.fullScreen) {
      return;
    }

    event.preventDefault();
    this.stopChatResize();
    this.isChatResizing = true;

    const onMouseMove = (moveEvent: MouseEvent) => this.resizeChatSection(moveEvent);
    const onMouseUp = () => this.stopChatResize();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    this.removeResizeListeners = [
      () => window.removeEventListener('mousemove', onMouseMove),
      () => window.removeEventListener('mouseup', onMouseUp)
    ];

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  resizeChatSection(event: MouseEvent): void {
    if (!this.isChatResizing || typeof window === 'undefined') {
      return;
    }

    const viewportWidth = window.innerWidth || 0;
    const dynamicMaxWidth = Math.max(this.minChatPanelWidth, viewportWidth - 320);
    const nextWidth = Math.min(
      this.maxChatPanelWidth,
      Math.max(this.minChatPanelWidth, Math.min(event.clientX, dynamicMaxWidth))
    );

    this.chatSectionWidth = nextWidth;
  }

  stopChatResize(): void {
    this.isChatResizing = false;
    this.removeResizeListeners.forEach(removeListener => removeListener());
    this.removeResizeListeners = [];
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  ngOnDestroy() {
    this.stopChatResize();
    this.cancelVoiceDraft();
    this.blocks = [];
    this.clearContinueProjectGenerationInterval();
    this.clearGenerateProjectFailureTimer();
    this.stopAiProcessingPhase();
    this.socket?.off?.('page-created');
    this.socket?.off?.('pages-generation-complete');
    this.socket?.off?.('botReply');
    this.socket?.off?.('customization-progress');
    this.socket?.off?.('triggerCustomizationAPI');
    this.socket?.disconnect?.();
    this.customizationSocket?.removeAllListeners?.();
    this.customizationSocket?.disconnect?.();
    this.aiService.stop();

  }

  scrollToBottom(_force = false) {
    if (!this.chatScroll) return;
    const el = this.chatScroll.nativeElement;
    const doScroll = () => {
      if (el) {
        el.scrollTop = el.scrollHeight + 500;
        const asideEl = el.closest('aside') || el.closest('.ct_project_ai_chat_section');
        if (asideEl) {
          asideEl.scrollTop = asideEl.scrollHeight + 500;
        }
        if (window.innerWidth <= 991 || this.isMobileView()) {
          window.scrollTo(0, 999999);
        }
      }
    };
    requestAnimationFrame(() => {
      doScroll();
      setTimeout(doScroll, 50);
      setTimeout(doScroll, 150);
      setTimeout(doScroll, 350);
      setTimeout(doScroll, 650);
      setTimeout(doScroll, 1000);
      setTimeout(doScroll, 1500);
    });
  }



  clearFirstBlockMinHeight() {
    const first = this.blocks.find(b => b.isFirstOfRegenerate);
    if (!first || !this.chatScroll) return;

    const el = this.chatScroll.nativeElement;

    const prevScrollTop = el.scrollTop;
    const prevScrollHeight = el.scrollHeight;

    first.isFirstOfRegenerate = false;

    setTimeout(() => {
      const newScrollHeight = el.scrollHeight;
      el.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
    }, 0);
  }



  onIframeLoad() {
    this.clearBuildStepTimers();
    this.stopFakeProgressLoop();
    this.loaderProgress = 100;
    setTimeout(() => {
      this.isIframeLoading = false;
    }, 200);
    this.scheduleDeployHeaderAction();

    if (this.isMobileView() && !this.hasAutoOpenedCurrentMobilePreview && !this.hasDismissedCurrentMobilePreview) {
      this.fullScreen = true;
      this.hasAutoOpenedCurrentMobilePreview = true;
    }

    this.fetchCustomizationSuggestions(this.selectedProjectId);
  }

  blockPreviewInteraction(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  private handlePreviewMessage = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    // console.log(
    //   '[CreativeAI Angular] Preview message:',
    //   event.data
    // );

    switch (event.data.type) {

      case 'creative-ai-element-hover':
        // console.log(
        //   '[CreativeAI Angular] Hovered:',
        //   event.data
        // );
        break;

      case 'creative-ai-element-select':
        // console.log(
        //   '[CreativeAI Angular] Selected:',
        //   event.data
        // );

        this.openElementEditor(event.data);
        break;

      /**
       * React editor-runtime
       * sends this when user submits:
       *
       * "change the image of this"
       */
      case 'creative-ai-element-edit':
        // console.log(
        //   '[CreativeAI Angular] ELEMENT EDIT:',
        //   event.data
        // );

        this.handleElementEdit(event.data);
        break;
    }
  };

  openElementEditor(data: any) {
    this.selectedElementMetadata = data?.element || data || null;
  }

  handleElementEdit(data: any) {
    this.selectedElementMetadata = data?.element || data || null;
    if (data?.element) {
      this.editCommentsArray?.push({
        id: data?.element?.id,
        instruction: data?.instruction,
        element: data.element,
      });
    }
  }

  removeEditComment(id: string) {
    this.editCommentsArray = this.editCommentsArray.filter((x: any) => x.id != id)
  }


  getUserSubscriptionPlan() {
    this.subscriptionService.loadSubscription();
    this.subscriptionService.subscription$.subscribe((res: SubscriptionResponse) => {
      if (!res) {
        return;
      }

      this.subscriptionPlan = res;
    });
  }

  // open modal

  openCallbackModal() {
    this.callbackRequestForm.reset({
      fullName: this.userInfo?.name || '',
      businessEmail: this.userInfo?.email || '',
      phoneNumber: this.userInfo?.phoneNumber || '',
      companyName: this.userInfo?.companyName || '',
      description: ''
    });
    const modal = new bootstrap.Modal(
      document.getElementById('callbackModal')!
    );
    modal.show();
  }

  openDeployModal() {
    // this.selectedTemplateName = templateName;

    const modal = new bootstrap.Modal(
      document.getElementById('deployConfirmModal')!
    );
    modal.show();
  };



  openFullPreview() {
    if (this.isReactBuilding) return
    this.fullScreen = !this.fullScreen;
  }

  handleMobileViewToggle(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.isReactBuilding) {
      return;
    }

    if (this.fullScreen) {
      this.showChatSection();
      return;
    }

    this.hasDismissedCurrentMobilePreview = true;
    this.fullScreen = true;
  }

  isMobileView(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= this.mobileBreakpoint;
  }

  startVoiceTyping(): void {
    if (this.isVoiceStarting || this.isReactBuilding) {
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
        this.syncVoiceDraftToTextarea(text);
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

        if (!this.voiceDraftText.trim()) {
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
        this.syncVoiceDraftToTextarea('');
      }
    });

    if (!didStart && sessionId === this.activeVoiceSessionId) {
      this.isVoiceDraftActive = false;
      this.isVoiceUiVisible = false;
      this.isVoiceStarting = false;
      this.voiceDraftText = '';
      this.syncVoiceDraftToTextarea('');
    }
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
    this.focusCustomizeInput();
  }

  showChatSection() {
    this.hasDismissedCurrentMobilePreview = true;
    this.fullScreen = false;
    this.scrollToBottom(true);
  }

  fakeProgressInterval: any;

  private startFakeProgressLoop() {
    this.stopFakeProgressLoop();
    if (this.buildFlowType !== 'switch' && this.buildFlowType !== 'restore' && this.buildFlowType !== 'customize') {
      return;
    }

    if (this.loaderProgress >= 100 || this.loaderProgress === 0) {
      this.loaderProgress = 5;
    }

    this.loaderStepIndex = 1;
    this.loaderStatusText = this.buildFlowType === 'customize' ? 'Analyzing customization...' : 'Fetching project data...';

    this.fakeProgressInterval = setInterval(() => {
      if (!this.isIframeLoading && !this.isReactBuilding) {
        this.stopFakeProgressLoop();
        return;
      }

      if (this.loaderProgress < 25) {
        this.loaderProgress += 0.8;
      } else if (this.loaderProgress < 50) {
        this.loaderProgress += 0.6;
        this.loaderStepIndex = 2;
        this.loaderStatusText = this.buildFlowType === 'customize' ? 'Planning modifications...' : 'Restoring structure...';
      } else if (this.loaderProgress < 85) {
        this.loaderProgress += 0.25;
        this.loaderStepIndex = 3;
        this.loaderStatusText = this.buildFlowType === 'customize' ? 'Applying code changes...' : 'Rebuilding React app...';
      } else if (this.loaderProgress < 98) {
        this.loaderProgress += 0.1;
        this.loaderStepIndex = 4;
        this.loaderStatusText = this.buildFlowType === 'customize' ? 'Updating preview...' : 'Preparing your preview...';
      }
    }, 150);
  }

  private stopFakeProgressLoop() {
    if (this.fakeProgressInterval) {
      clearInterval(this.fakeProgressInterval);
      this.fakeProgressInterval = null;
    }
  }

  private preparePreviewLoadState() {
    this.isIframeLoading = true;
    this.hideDeployHeaderAction();
    this.hasAutoOpenedCurrentMobilePreview = false;
    this.hasDismissedCurrentMobilePreview = false;
    this.loaderProgress = 0;
    this.startFakeProgressLoop();
  }

  private setSafePreviewUrl(url: string) {
    this.preparePreviewLoadState();
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }


  onDeviceTypeChange(deviceType: string) {
    switch (deviceType) {
      case 'desktop':
        this.selectedDeviceType = deviceType
        this.previewWidth = 100
        break;
      case 'tablet':
        this.selectedDeviceType = deviceType;
        this.previewWidth = 768
        break;
      case 'mobile':
        this.selectedDeviceType = deviceType;
        this.previewWidth = 400
        break;
    }
  }


  setBuildStep(step: number) {
    this.buildStep = step;
  }

  setBuildFlow(flowType: BuildFlowType) {
    this.buildFlowType = flowType;
    this.buildSteps = this.getBuildSteps(flowType);
  }

  getBuildSteps(flowType: BuildFlowType): BuildProgressStep[] {
    switch (flowType) {
      case 'repair':
        return [
          { pendingIconClass: 'fa-solid fa-magnifying-glass', label: 'Reviewing failure diagnostics' },
          { pendingIconClass: 'fa-solid fa-screwdriver-wrench', label: 'Repairing generated build' },
          { pendingIconClass: 'fa-solid fa-rotate-right', label: 'Retrying preview generation' }
        ];
      case 'restore':
        return [
          { pendingIconClass: 'fa-regular fa-folder-open', label: 'Fetching saved project' },
          { pendingIconClass: 'fa-regular fa-image', label: 'Loading draft preview' },
          { pendingIconClass: 'fa-solid fa-arrow-up-right-from-square', label: 'Opening selected project' }
        ];
      case 'switch':
        return [
          { pendingIconClass: 'fa-regular fa-hand-pointer', label: 'Switching to selected template' },
          { pendingIconClass: 'fa-regular fa-image', label: 'Loading preview frame' },
          { pendingIconClass: 'fa-solid fa-arrow-up-right-from-square', label: 'Opening selected preview' }
        ];
      case 'regenerate':
        return [
          { pendingIconClass: 'fa-solid fa-wand-magic-sparkles', label: 'Preparing new template variation' },
          { pendingIconClass: 'fa-solid fa-gear', label: 'Building refreshed React app' },
          { pendingIconClass: 'fa-solid fa-rocket', label: 'Deploying updated preview' }
        ];
      case 'customize':
        return [
          { pendingIconClass: 'fa-solid fa-sliders', label: 'Reviewing requested changes' },
          { pendingIconClass: 'fa-solid fa-wand-magic-sparkles', label: 'Applying template customization' },
          { pendingIconClass: 'fa-solid fa-rocket', label: 'Refreshing preview' }
        ];
      case 'initial':
      default:
        return [
          { pendingIconClass: 'fa-solid fa-download', label: 'Installing dependencies' },
          { pendingIconClass: 'fa-solid fa-gear', label: 'Building React app' },
          { pendingIconClass: 'fa-solid fa-rocket', label: 'Deploying preview' }
        ];
    }
  }

  startBuildProgressTimers() {
    this.clearBuildStepTimers();
    this.setBuildStep(1);
    this.buildStepTimeouts.push(setTimeout(() => this.setBuildStep(2), 10000));
    this.buildStepTimeouts.push(setTimeout(() => this.setBuildStep(3), 15000));
  }

  startQuickBuildProgress(flowType: BuildFlowType, secondStepDelay = 350, thirdStepDelay = 900) {
    this.clearBuildStepTimers();
    this.setBuildFlow(flowType);
    this.setBuildStep(1);
    this.buildStepTimeouts.push(setTimeout(() => this.setBuildStep(2), secondStepDelay));
    this.buildStepTimeouts.push(setTimeout(() => this.setBuildStep(3), thirdStepDelay));
  }

  clearBuildStepTimers() {
    this.buildStepTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.buildStepTimeouts = [];
  }


  async loadDraftTemplates(templates: any[]) {
    if (!this.selectedProjectId) {
      return;
    }

    const selectedProject = (templates || []).find((t: any) => t.inquiryId === this.selectedProjectId);
    const templateId = selectedProject?.templateId;

    if (!templateId) {
      this.safePreviewUrl = null;
      this.pendingPreviewUrl = null;
      this.hideDeployHeaderAction();

      if (this.projectsData?.clientEnquryId === this.selectedProjectId) {
        this.isReactBuilding = true;
        this.isIframeLoading = true;
        return;
      }

      this.isReactBuilding = false;
      this.isIframeLoading = false;
      return;
    }

    this.startQuickBuildProgress('restore');
    this.currentTemplateId = templateId;
    this.selected_template_id = templateId;
    this.setSafePreviewUrl(this.getPreviewProxyUrl(templateId));
    this.isReactBuilding = false;
    this.isTyping = false;
  }

  private async appendCustomizationHistory(inquiryPublicId: string, routeChangeVersion: number): Promise<void> {
    const history = await this.fetchCustomizationHistory(inquiryPublicId);

    if (!this.isCurrentRouteChange(routeChangeVersion, inquiryPublicId) || !history.length) {
      return;
    }

    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('input-prompt-customize'));

    let previousHistoryItem: CustomizationHistoryEntry | null = null;

    for (const item of history) {
      if (this.shouldSkipDuplicateHistoryPrompt(item, previousHistoryItem)) {
        previousHistoryItem = item;
        continue;
      }

      this.blocks.push({
        id: `user-message-history-${item.id}`,
        text: item.prompt,
        done: true,
        timestamp: new Date(item.created_at)
      });

      const aiResponseBlocks = this.extractCustomizationHistoryResponseBlocks(item);
      for (const aiResponseBlock of aiResponseBlocks) {
        this.blocks.push(aiResponseBlock);
      }

      previousHistoryItem = item;
    }

    this.appendBuildActionPrompt();
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private async fetchCustomizationHistory(inquiryPublicId: string): Promise<CustomizationHistoryEntry[]> {
    if (!inquiryPublicId) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.apiService.getApi<any>(
          `api/ai/customization/history?inquiryPublicId=${encodeURIComponent(inquiryPublicId)}`
        )
      );

      const history = Array.isArray(response?.data?.history) ? response.data.history : [];

      return history
        .filter((item: CustomizationHistoryEntry) => typeof item?.prompt === 'string' && item.prompt.trim().length > 0)
        .sort((a: CustomizationHistoryEntry, b: CustomizationHistoryEntry) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    } catch (error) {
      console.error('Failed to fetch customization history', error);
      return [];
    }
  }

  private extractCustomizationHistoryResponseBlocks(item: CustomizationHistoryEntry): any[] {
    const aiResponse = item.ai_response;
    const response = typeof aiResponse === 'string' ? aiResponse.trim() : '';
    if (!response) {
      return [];
    }

    try {
      const parsedResponse = JSON.parse(response);
      if (parsedResponse && typeof parsedResponse === 'object' && !Array.isArray(parsedResponse)) {
        return this.createCustomizationHistoryProgressBlocks(parsedResponse, item);
      }
    } catch {
      return [
        this.createCompletedParagraphBlock(
          response,
          'default',
          new Date(item.created_at)
        )
      ];
    }

    return [
      this.createCompletedParagraphBlock(
        response,
        'default',
        new Date(item.created_at)
      )
    ];
  }

  private createCustomizationHistoryProgressBlocks(parsedResponse: any, item: CustomizationHistoryEntry): CustomizationProgressBlock[] {
    const phaseKeys = this.getCustomizationHistoryPhaseKeys(item.build_status);

    return phaseKeys
      .map((phaseKey) => this.createCustomizationHistoryProgressBlock(phaseKey, parsedResponse?.[phaseKey], item))
      .filter((block): block is CustomizationProgressBlock => !!block);
  }

  private getCustomizationHistoryPhaseKeys(buildStatus: number): string[] {
    const basePhases = ['started', 'ai_processing', 'compiling', 'deploying'];

    if (buildStatus === 0) {
      return [...basePhases, 'completed'];
    }

    return [...basePhases, 'failed'];
  }

  private createCustomizationHistoryProgressBlock(
    phaseKey: string,
    phaseResponse: any,
    item: CustomizationHistoryEntry
  ): CustomizationProgressBlock | null {
    if (!phaseResponse) {
      return null;
    }

    const message = typeof phaseResponse === 'string'
      ? phaseResponse.trim()
      : String(phaseResponse?.message || '').trim();

    if (!message) {
      return null;
    }

    const percentage = this.normalizeCustomizationHistoryPercentage(phaseResponse?.percentage, phaseKey);
    const logs = Array.isArray(phaseResponse?.console_logs)
      ? phaseResponse.console_logs.map((log: any) => String(log || '').trim()).filter(Boolean).slice(-5)
      : [];

    return {
      type: 'ai-progress',
      data: {
        historyId: item.id,
        step: phaseKey,
        stepLabel: this.getCustomizationProgressStepLabel(phaseKey),
        message,
        percentage,
        logs
      }
    };
  }

  private normalizeCustomizationHistoryPercentage(value: any, phaseKey: string): number {
    const percentage = Number(value);
    if (Number.isFinite(percentage)) {
      return Math.max(0, Math.min(100, Math.round(percentage)));
    }

    switch (phaseKey) {
      case 'started':
        return 10;
      case 'ai_processing':
        return 40;
      case 'compiling':
        return 70;
      case 'deploying':
        return 90;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  private shouldSkipDuplicateHistoryPrompt(
    item: CustomizationHistoryEntry,
    previousItem: CustomizationHistoryEntry | null
  ): boolean {
    if (!previousItem || item.ai_response) {
      return false;
    }

    const currentPrompt = item.prompt.trim().toLowerCase();
    const previousPrompt = previousItem.prompt.trim().toLowerCase();
    if (currentPrompt !== previousPrompt || !previousItem.ai_response) {
      return false;
    }

    const currentCreatedAt = new Date(item.created_at).getTime();
    const previousUpdatedAt = new Date(previousItem.updated_at || previousItem.created_at).getTime();
    return Math.abs(currentCreatedAt - previousUpdatedAt) <= 5 * 60 * 1000;
  }

  async showDraftWelcomeMessages(streamMessages = true, user_prompt: string) {

    const now = new Date();
    const introMessage = `I found saved design directions for this project, and I'm bringing them back into your workspace so you can pick up exactly where you left off.`;
    const closingMessage = `Everything is back in place now. You can review each saved direction, request a new variation, refine the current one with AI, or move ahead when you're ready to deploy.`;
    const restoredWorkspaceBlock = {
      type: 'file',
      data: {
        title: 'AI workspace restored',
        file: 'saved creative session',
        summary: 'Recovered your saved variations, reopened the active preview, and rebuilt the workspace context for continued review.'
      }
    };

    this.blocks = [];
    this.isReactBuilding = true;
    this.setBuildFlow('restore');
    this.setBuildStep(1);

    if (!streamMessages) {
      this.setBuildStep(3);
      this.blocks = [
        {
          id: `user-message-history-0`,
          text: user_prompt,
          done: true,
          timestamp: now

        },
        {
          id: `paragraph-${Date.now()}-0`,
          text: introMessage,
          done: true,
          timestamp: now
        },
        {
          type: 'terminal',
          data: {
            lines: ['Scanning saved design history'],
            done: true
          }
        },
        {
          type: 'terminal',
          data: {
            lines: ['Rehydrating saved preview directions'],
            done: true
          }
        },
        {
          type: 'terminal',
          data: {
            lines: ['Rebuilding your AI workspace view'],
            done: true
          }
        },
        restoredWorkspaceBlock,
        {
          id: `paragraph-${Date.now()}-1`,
          text: closingMessage,
          done: true,
          timestamp: now
        },
        {
          type: 'summary',
          data: {
            meta: 'Restore completed',
            title: 'Your saved workspace is ready to explore again.',
            description: 'I reconnected the available preview directions, restored the active view, and prepared the session so you can continue iterating without starting over.',
            highlights: ['Saved directions reloaded', 'Preview set restored', 'Workspace ready for AI edits']
          }
        }
      ];

      this.appendBuildActionPrompt();
      setTimeout(() => this.scrollToBottom(true), 0);
      return;
    }

    await this.addParagraphBlock(
      introMessage,
      600
    );

    await this.addTerminal([
      'Scanning saved design history'
    ], 500, 600);

    this.setBuildStep(2);
    await this.addTerminal([
      'Rehydrating saved preview directions'
    ], 500, 600);

    this.setBuildStep(3);
    await this.addTerminal([
      'Rebuilding your AI workspace view'
    ], 500, 600);

    this.blocks.push(restoredWorkspaceBlock);
    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(200);

    await this.addParagraphBlock(
      closingMessage,
      600
    );

    await this.addSummary({
      meta: 'Restore completed',
      title: 'Your saved workspace is ready to explore again.',
      description: 'I reconnected the available preview directions, restored the active view, and prepared the session so you can continue iterating without starting over.',
      highlights: ['Saved directions reloaded', 'Preview set restored', 'Workspace ready for AI edits']
    });

    this.appendBuildActionPrompt();
    setTimeout(() => this.scrollToBottom(true), 0);
    this.isReactBuilding = false;
    return;
  }

  appendBuildActionPrompt() {
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('input-prompt-customize'));
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('inline-cta'));

    this.blocks.push({
      id: `inline-cta-success-${Date.now()}`,
      text: {
        variant: 'project-ready',
        title: 'Your project is ready!',
        message: 'You can now download the code or deploy it directly.',
        buttonLabel: 'Download Code',
        actionId: 'download_code',
        buttonLabel2: 'Deploy Project',
        actionId2: 'deploy_template',
      },
      done: true,
      timestamp: new Date()
    });

    this.blocks.push({
      id: `input-prompt-customize-${Date.now()}`,
      text: {
        message: 'Shape This Template Your Way',
        placeholder: 'Type your custom requirements, design ideas, or functionality...',
      },
      done: true,
      timestamp: new Date()
    });

    setTimeout(() => this.scrollToBottom(true), 100);
  }

  appendCreditLimitPrompt() {
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('input-prompt-customize'));
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('inline-cta'));

    if (this.subscriptionPlan.planType === 'FREE') {
      this.blocks.push({
        id: `inline-cta-customize-${Date.now()}`,
        text: {
          variant: 'credit-limit',
          title: 'You’ve used all your free credits for now.',
          message: `Upgrade to the Standard Plan to get more monthly credits and continue customizing, generating, and deploying without interruptions. You can also purchase additional credits anytime whenever you need them.`,
          buttonLabel: 'Upgrade Plan',
          actionId: 'upgrade_plan',
        },
        done: true,
        timestamp: new Date()
      });

    } else {
      this.blocks.push({
        id: `inline-cta-customize-${Date.now()}`,
        text: {
          variant: 'credit-limit',
          title: 'You’re running low on credits.',
          message: `Buy more credits to continue customizing, generating, and deploying without interruptions. Want higher monthly limits and more included credits? You can upgrade your plan anytime.`,
          buttonLabel: 'Buy credits',
          actionId: 'buy_credits',
          buttonLabel2: 'Upgrade Plan',
          actionId2: 'upgrade_plan'
        },
        done: true,
        timestamp: new Date()
      });
    }

    setTimeout(() => this.scrollToBottom(true), 0);
  }

  handleChatAction(actionId: string) {
    if (actionId === 'dismiss_cta') {
      this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('inline-cta'));
      return;
    }

    if (actionId === 'customize_template') {
      this.appendBuildActionPrompt();
      setTimeout(() => this.scrollToBottom(true), 0);
      return;
    }

    if (actionId === 'deploy_template') {
      this.openDeployModal();
      return;
    }

    if (actionId === 'download_code') {
      this.openDownloadCodeModal();
      return;
    }

    if (actionId === 'upgrade_plan') {
      this.subscriptionModalService.open();
      return;
    }

    if (actionId === 'buy_credits') {
      this.subscriptionModalService.openBuyMoreCreditsModal();
      return;
    }

    if (actionId === 'Request_callback') {
      this.openCallbackModal();
      return;
    }

    if (actionId.startsWith('submit_customization_options:')) {
      try {
        const payloadStr = actionId.replace('submit_customization_options:', '');
        const data = JSON.parse(payloadStr);
        const selectedOptions = data.selectedOptions || [];
        const selectedLabels = selectedOptions.map((opt: any) => opt.label).join(', ');
        const firstOpt = selectedOptions[0];

        this.blocks.push({
          id: `user-message-${Date.now()}`,
          text: selectedLabels,
          done: true,
          timestamp: new Date()
        });

        this.showLoader('Thinking...');

        const isMultiOption = selectedOptions.some((opt: any) => !!opt.questionId);

        let socketPayload: CustomizationMessagePayload;

        if (isMultiOption) {
          const answers: CustomizationAnswer[] = selectedOptions.map((opt: any) => ({
            questionId: String(opt.questionId || ''),
            optionId: String(opt.id || opt.optionId || ''),
            optionLabel: String(opt.label || opt.optionLabel || '')
          }));

          socketPayload = this.buildCustomizationPayload(CustomizationMessageType.MULTI_OPTION_SELECTION, {
            requestId: data.requestId || this.activeCustomizationRequestId || null,
            answers: answers,
            message: null,
            elements: [],
            attachments: []
          });
        } else {
          socketPayload = this.buildCustomizationPayload(CustomizationMessageType.OPTION_SELECTION, {
            requestId: data.requestId || this.activeCustomizationRequestId || null,
            message: selectedLabels,
            elements: [],
            attachments: [],
            optionId: firstOpt?.id || '',
            optionLabel: selectedLabels,
            questionId: data.questionId || null
          });
        }

        this.sendCustomizationMessage(socketPayload);
      } catch (err) {
        console.error('[Customize] Error submitting options:', err);
      }
      return;
    }
  }

  handlePromptKeydown(event: KeyboardEvent, block: any, value: string): void {

    if (event.key === 'Enter' && !event.shiftKey) {
      if (this.isReactBuilding) {
        event.preventDefault();
        return;
      }
      this.customizeInput.nativeElement.value = '';
      event.preventDefault();
      this.handlePromptSubmitted({ blockId: block, value });
    }
  }

  private syncVoiceDraftToTextarea(text: string): void {
    if (!this.customizeInput?.nativeElement) {
      return;
    }

    this.customizeInput.nativeElement.value = text;
  }

  private focusCustomizeInput(): void {
    setTimeout(() => this.customizeInput?.nativeElement.focus(), 0);
  }

  async handlePromptSubmitted(event: Event | { blockId: string; value: string }) {
    const promptEvent = event as { blockId?: string; value?: string };
    const prompt = promptEvent?.value?.trim() || '';

    const attachments = (this as any).pendingAttachments || [];
    const hasEditComments = this.editCommentsArray.length > 0;
    const hasAttachments = attachments.length > 0 || this.previewFiles.length > 0;

    if (!prompt && !hasEditComments && !hasAttachments) {
      return;
    }

    if (this.selectedProjectId) {
      this.isSuggestionsDismissedMap.set(this.selectedProjectId, false);
      this.isSuggestionsCollapsedMap.set(this.selectedProjectId, true);
    }

    if (this.speechService.isListening) {
      this.speechService.stop();
    }

    this.isVoiceDraftActive = false;
    this.isVoiceUiVisible = false;
    this.isVoiceStarting = false;
    this.voiceDraftText = '';
    if (this.getCurrentCreditBalance() <= 5) {
      this.appendCreditLimitPrompt();
      return;
    }

    const templates = await this.getUserTemplates();
    const templatePublicId = templates.find((t: any) => t.inquiryId === this.selectedProjectId)?.templateId || this.currentTemplateId;

    if (!templatePublicId) {
      this.toster.error('No template is available yet for customization.');
      return;
    }

    this.blocks = this.blocks.filter(block => block?.id !== promptEvent.blockId);
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('inline-cta'));
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('status'));

    const currentAttachments = [...this.previewFiles];
    const currentEditComments = [...this.editCommentsArray];
    this.addCustomizationMessage({
      sender: 'user',
      message: prompt || '',
      attachments: currentAttachments,
      editComments: currentEditComments,
      replyType: 'message'
    });

    this.showLoader('Thinking...');
    this.isTyping = true;
    this.resetBuildGenerationError();
    const customizationRequestVersion = ++this.customizationRequestVersion;
    this.pendingCustomizationRequest = {
      prompt: prompt || (currentEditComments.length > 0 ? 'Edit element' : 'Upload attachment'),
      requestVersion: customizationRequestVersion,
      templatePublicId,
      botReplyReceived: false,
      restTriggered: false
    };
    this.activeCustomizationProgressBlock = null;

    let socketPayload: CustomizationMessagePayload;
    if (this.selectedElementMetadata || hasEditComments) {
      const element = this.editCommentsArray.map((item: any) => ({
        ...item.element,
        instruction: item.instruction
      }));
      socketPayload = this.buildCustomizationPayload(CustomizationMessageType.EDITOR_ELEMENT_EDIT, {
        requestId: this.activeCustomizationRequestId,
        message: prompt || null,
        elements: element,
        attachments: attachments
      });
    } else {
      socketPayload = this.buildCustomizationPayload(CustomizationMessageType.CHAT_MESSAGE, {
        requestId: this.activeCustomizationRequestId,
        message: prompt || null,
        elements: [],
        attachments: attachments
      });
    }

    if (!this.customizationSocket?.emit) {
      this.pendingCustomizationRequest = null;
      this.customizationRequestVersion++;
      this.toster.error('Customization chat is not connected right now. Please try again.');
      return;
    }

    this.sendCustomizationMessage(socketPayload);

    this.editCommentsArray = [];
    // this.previewFiles.forEach(item => {
    //   if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
    //     URL.revokeObjectURL(item.previewUrl);
    //   }
    // });
    this.previewFiles = [];
    this.fileUrls = [];
    (this as any).pendingAttachments = [];
    setTimeout(() => this.scrollToBottom(true), 0);
  }


  private getCustomizationProgressStepLabel(step: any): string {
    const normalizedStep = String(step || '').trim().replace(/[_-]+/g, ' ');
    if (!normalizedStep) {
      return 'Customizing your preview';
    }

    return normalizedStep.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  deployProgressSteps = [
    'Building Package...',
    'Migrate Database',
    'Export Secrets',
    'Deploy',
    'Run Health Check'
  ];
  deployStepDurations = [61, 15, 10, 45, 10]; // seconds per step (61s -> 01:01)
  currentDeployStep = 1;
  deployTimerDisplay = '01:01';
  deployTimerInterval: any;
  deployTimerSeconds = 61;

  startDeploySteps() {
    this.currentDeployStep = 1;
    this.deployTimerSeconds = this.deployStepDurations[0];
    this.updateDeployTimerDisplay();
    clearInterval(this.deployTimerInterval);

    this.deployTimerInterval = setInterval(() => {
      if (this.deployTimerSeconds > 0) {
        this.deployTimerSeconds--;
      }

      if (this.deployTimerSeconds === 0) {
        if (this.currentDeployStep < 5) {
          this.currentDeployStep++;
          this.deployTimerSeconds = this.deployStepDurations[this.currentDeployStep - 1];
        } else {
          // Countdown finished, call the API now
          clearInterval(this.deployTimerInterval);
          this.deployProject(this.selected_template_id, 'creativeai');
        }
      }
      this.updateDeployTimerDisplay();
    }, 100);
  }

  showDeploymentSuccess() {
    this.closeBootstrapModal('deploymentProgressModal');
    this.router.navigate(['/user-live-projects', this.selectedProjectId]);
  }

  updateDeployTimerDisplay() {
    const m = Math.floor(this.deployTimerSeconds / 60).toString().padStart(2, '0');
    const s = (this.deployTimerSeconds % 60).toString().padStart(2, '0');
    this.deployTimerDisplay = `${m}:${s}`;
  }

  closeDeploymentProgress() {
    clearInterval(this.deployTimerInterval);
    this.closeBootstrapModal('deploymentProgressModal');
  }

  async checkNDeploy() {
    const templates = await this.getUserTemplates();
    const activeDesign = templates.find((t: any) => t.inquiryId === this.selectedProjectId)?.templateId;

    if (!activeDesign) {
      console.error("No active design found");
      return;
    }

    this.selected_template_id = activeDesign;
    this.closeBootstrapModal('deployConfirmModal');

    if (this.getCurrentCreditBalance() >= this.deployCreditsRequired) {
      this.openBootstrapModal('deploymentProgressModal', { backdrop: 'static', keyboard: false });
      this.startDeploySteps();
      return;
    }

    this.openInsufficientCreditsModal(this.deployCreditsRequired, 'project publishing');

  }

  continuePublishProject() {
    if (this.selectedPublishOption === 'creative-ai-domain') {
      this.closeBootstrapModal('publishProjectModal');
      this.deployProject(this.selected_template_id, 'creativeai');
      return;
    }

    this.closeBootstrapModal('publishProjectModal');
    this.openBootstrapModal('customDomainModal', { backdrop: 'static', keyboard: true });
  }

  backToPublishProjectModal() {
    this.closeBootstrapModal('customDomainModal');
    this.openBootstrapModal('publishProjectModal', { backdrop: 'static', keyboard: true });
  }

  deployWithCustomDomain() {
    this.customDomainTouched = true;

    if (!this.isCustomDomainValid) {
      this.toster.error('Please enter a valid custom domain to continue.');
      return;
    }

    this.closeBootstrapModal('customDomainModal');
    this.deployProject(this.selected_template_id, 'custom', this.customDomain);
  }

  getPreviewProxyUrl(templateId: string) {
    const apiBaseUrl = this.apiService.apiUrl.replace(/\/$/, '');
    return `${apiBaseUrl}/api/user/generate/${templateId}`;
  }

  deployProject(selected_template_id: string, deploymentDomainType: 'creativeai' | 'custom', customDomain?: string) {
    const payload: any = {
      publicTemplateId: selected_template_id,
      publicInquiryId: this.projectsData.clientEnquryId,
      deploymentDomainType
    };

    if (deploymentDomainType === 'custom') {
      payload.customDomain = customDomain;
    }

    this.apiService
      .postAPI('api/user/tempalteDeployed', payload)
      .subscribe((res: any) => {
        if (res.success) {
          this.showDeploymentSuccess();
        }
      });
  }

  confirmDeploymentSuccess() {
    this.closeBootstrapModal('deploymentSuccessModal');

    if (this.successModalAction === 'navigate-dashboard') {
      this.router.navigate([`/dashboard`]);
    }
  }

  async submitCallbackRequest() {
    if (this.callbackRequestForm.invalid) {
      this.callbackRequestForm.markAllAsTouched();
      return;
    }

    this.isCallbackSubmitting = true;
    const raw = this.callbackRequestForm.getRawValue();
    const templates = await this.getUserTemplates();
    const activeDesign = templates.find((t: any) => t.inquiryId === this.selectedProjectId)?.templateId;

    if (!activeDesign) {
      console.error("No active design found");
      return;
    }
    this.selected_template_id = activeDesign;
    const phoneValue = raw.phoneNumber;
    const phoneNumber = typeof phoneValue === 'string'
      ? phoneValue.trim()
      : String(phoneValue?.number || '').trim();
    const countryCode = typeof phoneValue === 'string'
      ? ''
      : String(phoneValue?.dialCode || '').trim();
    const callbackPayload = {
      public_template_id: this.selected_template_id,
      date: new Date().toISOString(),
      full_name: String(raw.fullName || '').trim(),
      work_email: String(raw.businessEmail || '').trim(),
      company_name: String(raw.companyName || '').trim(),
      phone_number: phoneNumber,
      country_code: countryCode,
      description: String(raw.description || '').trim(),
    };

    this.apiService.postAPI('api/user/requestProjectCallback', callbackPayload).subscribe({
      next: (response: any) => {
        this.isCallbackSubmitting = false;

        if (!response?.success) {
          this.toster.error(response?.message || 'Failed to submit your callback request. Please try again.');
          return;
        }

        this.closeBootstrapModal('callbackModal');
        this.successModalAction = 'close-only';
        this.deploymentSuccessMessage = 'Your callback request has been saved successfully. Our team will get in touch with you shortly.';
        this.openBootstrapModal('deploymentSuccessModal', { backdrop: 'static', keyboard: false });
      },
      error: (error: any) => {
        this.isCallbackSubmitting = false;
        this.toster.error(error?.error?.message || 'Failed to submit your callback request. Please try again.');
      }
    });
  }

  isCallbackFieldInvalid(controlName: string): boolean {
    const control = this.callbackRequestForm?.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  async startFlow() {
    const flowRunId = ++this.initialFlowRunId;
    this.blocks = [];
    this.resetActivePageBuildSection();

    this.loaderProgress = 0;
    this.loaderStepIndex = 1;
    this.loaderStatusText = 'Understanding your idea...';

    this.setBuildFlow('initial');
    this.setBuildStep(1);
    this.blocks.push(this.createUserMessageBlock(this.finalPrompt));
    // await this.addParagraphBlock('Analyzing your prompt...', 700, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.loaderProgress = 10;
    this.loaderStatusText = 'Analyzing your prompt...';
    await this.showLoader('Thinking through product requirements...');
    await this.addBuildSection(
      'Analyzing your prompt...',
      '🧠',
      [
        'Understanding project direction',
        'Mapping the main screens and user flow',
        'Defining overall product specification'
      ],
      6000,
      4000
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Synthesizing prompt insights...', 3000);
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    await this.addParagraphBlock(
      `The scope is clear now, so I’m moving into the actual build flow with structure first and code generation right after that.`,
      2000,
      'support'
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.loaderProgress = 20;
    this.loaderStepIndex = 2;
    this.loaderStatusText = 'Initializing project...';
    await this.addParagraphBlock('Initializing project...', 2000, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Preparing base workspace...');
    await this.addBuildSection(
      'Initializing project...',
      '⚙️',
      [
        'Preparing workspace',
        'Initializing React project shell',
        'Setting up the base environment'
      ],
      6000,
      4000
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Thinking through system setup...', 3000);
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.loaderProgress = 35;
    this.loaderStatusText = 'Creating structure...';
    await this.addParagraphBlock('Creating structure...', 2000, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Creating project folders...');
    await this.addBuildSection(
      'Creating structure...',
      '📁',
      [
        'src/',
        'components/',
        'pages/',
        'services/',
        'hooks/',
        'context/'
      ],
      6000,
      3000
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Planning the first file generation batch...', 3000);
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.setBuildStep(2);
    this.loaderProgress = 45;
    this.loaderStatusText = 'Creating core files...';
    await this.addParagraphBlock('Creating core files...', 2000, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Generating foundation files...');
    await this.addBuildSection(
      'Creating core files...',
      '📦',
      [
        'package.json',
        'vite.config.js',
        'index.html',
        'src/main.jsx',
        'src/App.jsx'
      ],
      6000,
      3000
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Reviewing generated foundation files...', 3000);
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.loaderProgress = 55;
    this.loaderStatusText = 'Building UI...';
    await this.addParagraphBlock('Building UI...', 2000, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Designing UI system and reusable components...');
    await this.addBuildSection(
      'Building UI...',
      '🧩',
      [
        'Navbar.jsx',
        'Footer.jsx',
        'AppContext.jsx',
        'useProjectData.js',
        'api.js'
      ],
      6000,
      3000
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Refining shared UI building blocks...', 3000);
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.loaderStepIndex = 3;
    this.loaderProgress = 70;
    this.loaderStatusText = 'Generating screen-level page code...';
    await this.addParagraphBlock('Creating pages...', 2000, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Generating screen-level page code...');
    this.startSocketDrivenBuildSection(
      'Creating pages...',
      '📄',
    );

    // Smoothly animate progress from 70 to 80 while pages are generating
    const pageGenInterval = setInterval(() => {
      if (this.loaderProgress < 80) {
        this.loaderProgress++;
      }
    }, 3000);

    await this.waitForPageGenerationCompletion();
    clearInterval(pageGenInterval);
    this.loaderProgress = 80;

    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Checking page flow and navigation...', 3000);
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.setBuildStep(3);
    this.loaderStepIndex = 4;
    this.loaderProgress = 85;
    this.loaderStatusText = 'Finalizing project build...';
    await this.addParagraphBlock('Finalizing...', 2000, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Final checks and deployment prep...');
    await this.addBuildSectionKeepingLastActive(
      'Finalizing...',
      '🚀',
      [
        'Installing dependencies',
        'Building preview bundle',
        'Deploying preview'
      ],
      8000,
      4000
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();

    // Reached the end before opening preview
    this.loaderProgress = 100;
    this.loaderStatusText = 'Ready!';

    return;
  }

  private async addFileActivityBlock(file: string, summary: string, waitAfter = 320, title = 'Updated file') {
    const block = {
      type: 'file',
      data: {
        title,
        file,
        summary,
        pending: true
      }
    };

    this.blocks.push(block);

    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(waitAfter);
    block.data.pending = false;
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private async showRealAiProcessingPhase() {
    const phaseVersion = ++this.aiProcessingPhaseVersion;
    this.setBuildStep(3);
    await this.addParagraphBlock('Final preview processing is still running...', 300, 'phase');
    if (!this.shouldStartAiProcessingPhase(phaseVersion)) {
      return;
    }
    await this.addParagraphBlock('This may take 2–5 minutes depending on project complexity.', 500, 'support');
    if (!this.shouldStartAiProcessingPhase(phaseVersion)) {
      return;
    }
    this.startAiProcessingPhase();
  }

  private startAiProcessingPhase() {
    const steps = [
      'Installing project dependencies...',
      'Building preview bundle...',
      'Deploying preview workspace...',
      'Finalizing project build...'
    ];

    this.stopAiProcessingPhase();
    let stepIndex = 0;
    this.showLoader(steps[stepIndex]);
    setTimeout(() => this.scrollToBottom(true), 0);

    this.aiProcessingInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      const loaderBlock = this.blocks.find(block => block.id === 'status');
      if (!loaderBlock) {
        return;
      }

      loaderBlock.text = steps[stepIndex];
      setTimeout(() => this.scrollToBottom(true), 0);
    }, 6000);
  }

  private stopAiProcessingPhase() {
    this.aiProcessingPhaseVersion++;
    if (this.aiProcessingInterval) {
      clearInterval(this.aiProcessingInterval);
      this.aiProcessingInterval = undefined;
    }
    this.hideLoader();
  }

  private completeInitialBuildUi() {
    if (this.hasInitialBuildCompletionUi || this.buildFlowType !== 'initial') {
      return;
    }

    this.hasInitialBuildCompletionUi = true;
    this.stopAiProcessingPhase();
    this.setBuildStep(3);

    if (this.pendingFinalBuildSection?.data?.items?.length) {
      const lastIndex = this.pendingFinalBuildSection.data.items.length - 1;
      this.pendingFinalBuildSection.data.items[lastIndex].status = 'done';
      this.pendingFinalBuildSection.data.done = true;
      this.pendingFinalBuildSection = null;
      setTimeout(() => this.scrollToBottom(true), 0);
    }

    this.blocks.push({
      type: 'summary',
      data: {
        time: 'Ready',
        description: 'The real AI build is complete and the preview is now available in your workspace.',
        highlights: [
          'Prompt analyzed',
          'Project structured',
          'Core files generated',
          'Preview opened'
        ]
      }
    });

    this.appendBuildActionPrompt();
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private shouldStartAiProcessingPhase(phaseVersion: number): boolean {
    return phaseVersion === this.aiProcessingPhaseVersion
      && !this.hasInitialBuildCompletionUi
      && !this.hasRepairFlowTakenOver
      && this.isReactBuilding;
  }

  getProjectTypeDisplayName(): string {
    const rawProjectType = this.projectsData?.projectType;

    if (typeof rawProjectType !== 'string' || !rawProjectType.trim()) {
      return 'web';
    }

    return rawProjectType
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async addTerminal(lines: string[], lineDelay = 650, finishDelay = 1100) {
    const terminalBlock = {
      type: 'terminal',
      data: {
        lines: [] as string[],
        done: false
      }
    };

    this.blocks.push(terminalBlock);
    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(500);

    for (let line of lines) {
      terminalBlock.data.lines.push(line);
      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(lineDelay);
    }

    await this.delay(finishDelay);
    terminalBlock.data.done = true;
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  async addParagraphBlock(text: string, waitAfter = 600, variant: 'default' | 'phase' | 'support' = 'default') {
    const block = {
      id: `paragraph-${Date.now()}-${this.blocks.length}`,
      text: '',
      variant,
      done: false,
      timestamp: new Date()
    };

    this.blocks.push(block);
    setTimeout(() => this.scrollToBottom(true), 0);

    for (const char of text) {
      block.text += char;
      if (char === '\n' || block.text.length % 8 === 0) {
        setTimeout(() => this.scrollToBottom(true), 0);
      }
      await this.delay(char === '\n' ? 12 : 8);
    }

    block.done = true;
    setTimeout(() => this.scrollToBottom(true), 0);

    await this.delay(waitAfter);
  }

  private createUserMessageBlock(text: string, id?: string) {
    return {
      id: id || `user-message-history-${Date.now()}-${this.blocks.length}`,
      text,
      done: true,
      timestamp: new Date(),
      variant: 'default',
    };
  }

  private createCompletedParagraphBlock(
    text: string,
    variant: 'default' | 'phase' | 'support' = 'default',
    timestamp: Date = new Date()
  ) {
    return {
      id: `paragraph-${Date.now()}-${this.blocks.length}`,
      text,
      variant,
      done: true,
      timestamp
    };
  }

  private async pauseBetweenMajorSteps(text: string, waitAfter = 1400) {
    this.showLoader(text);
    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(waitAfter);
    this.hideLoader();
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  async addBuildSection(title: string, icon: string, items: string[], itemDelay = 4200, finishDelay = 1800) {
    const block = {
      type: 'build-section',
      data: {
        title,
        icon,
        done: false,
        items: [] as Array<{ label: string; status: 'active' | 'done' }>
      }
    };

    this.blocks.push(block);
    setTimeout(() => this.scrollToBottom(true), 0);

    for (const item of items) {
      block.data.items.push({
        label: item,
        status: 'active'
      });

      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(itemDelay);
      block.data.items[block.data.items.length - 1].status = 'done';
      setTimeout(() => this.scrollToBottom(true), 0);
    }

    await this.delay(finishDelay);
    block.data.done = true;
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private createCompletedBuildSection(title: string, icon: string, items: string[]) {
    return {
      type: 'build-section',
      data: {
        title,
        icon,
        done: true,
        items: items.map((label) => ({
          label,
          status: 'done' as const
        }))
      }
    };
  }

  private createActiveBuildSection(
    title: string,
    icon: string,
    items: Array<{ label: string; status: 'active' | 'done' }>
  ) {
    return {
      type: 'build-section' as const,
      data: {
        title,
        icon,
        done: false,
        items
      }
    };
  }

  private getRestoredPageGenerationItems(pages: any[] = []): string[] {
    const pageItems = [
      ...pages.map((page) => this.extractPageLabel(page)),
      ...this.queuedSocketPages,
      ...this.designOrder.map((designId) => this.designMap.get(designId)?.label || '')
    ]
      .map((label) => String(label || '').trim())
      .filter((label, index, items) => !!label && items.indexOf(label) === index);

    return pageItems.length ? pageItems : ['Generating page screens'];
  }

  private registerBuildSocketListeners() {
    if (!this.socket?.on) {
      return;
    }

    this.socket.off?.('page-created');
    this.socket.off?.('pages-generation-complete');
    this.socket.off?.('botReply');
    this.socket.off?.('triggerCustomizationAPI');
    this.socket.off?.('customization-progress');
    this.socket.on('page-created', (data: any) => {
      this.clearGenerateProjectFailureTimer();
      const pageLabel = this.extractPageLabel(data?.page);
      if (!pageLabel) {
        return;
      }

      if (!this.activePageBuildSection) {
        if (!this.queuedSocketPages.includes(pageLabel)) {
          this.queuedSocketPages.push(pageLabel);
        }
        return;
      }

      this.appendSocketPageToBuildSection(pageLabel);
    });

    this.socket.on('pages-generation-complete', () => {
      this.clearGenerateProjectFailureTimer();
      this.completeActivePageBuildSection();
    });

    // this.socket.on('botReply', (payload: any) => {
    //   console.log('Received bot reply:', payload);
    //   this.handleCustomizationBotReply(payload);
    // });

    // this.socket.on('triggerCustomizationAPI', (payload: any) => {
    //   console.log('Received triggerCustomizationAPI event:', payload);
    //   void this.handleCustomizationApiTrigger(payload);
    // });

    // this.socket.on('customization-progress', (payload: any) => {
    //   console.log('Received customization-progress event:', payload);
    //   this.handleCustomizationProgressReply(payload);
    // });
  }

  private deferGenerateProjectFailure(source?: any) {

    this.setBuildGenerationError(source);

    if (this.buildFlowType !== 'initial' || this.hasInitialFlowCompleted) {
      this.queueBuildGenerationFailure();
      return;
    }

    if (this.generateProjectFailureTimer) {
      return;
    }

    this.generateProjectFailureTimer = setTimeout(() => {
      this.generateProjectFailureTimer = null;
      this.queueBuildGenerationFailure();
    }, this.generateProjectFailureGraceMs);
  }

  private clearGenerateProjectFailureTimer() {
    if (!this.generateProjectFailureTimer) {
      return;
    }

    clearTimeout(this.generateProjectFailureTimer);
    this.generateProjectFailureTimer = null;
  }

  private extractPageLabel(page: any): string {
    if (typeof page === 'string') {
      return page.trim();
    }

    if (page && typeof page === 'object') {
      const candidate = page.name || page.fileName || page.pageName || page.title;
      return typeof candidate === 'string' ? candidate.trim() : '';
    }

    return '';
  }

  private startSocketDrivenBuildSection(title: string, icon: string) {
    const block = {
      type: 'build-section' as const,
      data: {
        title,
        icon,
        done: false,
        items: [] as Array<{ label: string; status: 'active' | 'done' }>
      }
    };

    this.activePageBuildSection = block;
    this.blocks.push(block);
    setTimeout(() => this.scrollToBottom(true), 0);

    if (this.queuedSocketPages.length) {
      const queuedPages = [...this.queuedSocketPages];
      this.queuedSocketPages = [];

      for (const pageLabel of queuedPages) {
        this.appendSocketPageToBuildSection(pageLabel);
      }
    }

    if (this.hasCompletedPageGeneration) {
      this.completeActivePageBuildSection();
    }
  }

  private appendSocketPageToBuildSection(pageLabel: string) {
    if (!this.activePageBuildSection || !pageLabel) {
      return;
    }

    const items = this.activePageBuildSection.data.items;
    const exists = items.some(item => item.label === pageLabel);
    if (exists) {
      return;
    }

    const lastItem = items[items.length - 1];

    if (lastItem?.status === 'active') {
      lastItem.status = 'done';
    }

    items.push({
      label: pageLabel,
      status: 'active'
    });

    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private waitForPageGenerationCompletion(): Promise<void> {
    if (this.hasCompletedPageGeneration) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.pageGenerationCompletionResolver = resolve;
    });
  }

  private completeActivePageBuildSection(pages?: any[]) {
    this.hasCompletedPageGeneration = true;

    if (!this.activePageBuildSection) {
      if (this.pageGenerationCompletionResolver) {
        this.pageGenerationCompletionResolver();
        this.pageGenerationCompletionResolver = null;
      }
      return;
    }

    const items = this.activePageBuildSection.data.items;

    // Fallback: If no pages were rendered yet, try to populate them from the pages array
    if (items.length === 0 && pages && pages.length > 0) {
      for (const page of pages) {
        const label = this.extractPageLabel(page);
        if (label) {
          this.appendSocketPageToBuildSection(label);
        }
      }
    }

    const lastItem = items[items.length - 1];

    if (lastItem?.status === 'active') {
      lastItem.status = 'done';
    }

    this.activePageBuildSection.data.done = true;
    this.activePageBuildSection = null;

    if (this.pageGenerationCompletionResolver) {
      this.pageGenerationCompletionResolver();
      this.pageGenerationCompletionResolver = null;
    }

    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private resetActivePageBuildSection() {
    this.activePageBuildSection = null;
    this.queuedSocketPages = [];
    this.hasCompletedPageGeneration = false;
    this.pageGenerationCompletionResolver = null;
  }

  async addBuildSectionKeepingLastActive(title: string, icon: string, items: string[], itemDelay = 4200, settleDelay = 1200) {
    const block = {
      type: 'build-section',
      data: {
        title,
        icon,
        done: false,
        items: [] as Array<{ label: string; status: 'active' | 'done' }>
      }
    };

    this.blocks.push(block);
    this.pendingFinalBuildSection = block;
    setTimeout(() => this.scrollToBottom(true), 0);

    for (let index = 0; index < items.length; index++) {
      block.data.items.push({
        label: items[index],
        status: 'active'
      });

      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(itemDelay);

      if (index < items.length - 1) {
        block.data.items[index].status = 'done';
        setTimeout(() => this.scrollToBottom(true), 0);
      }
    }

    await this.delay(settleDelay);
  }

  async addSummary(data: any) {
    await this.delay(600);
    this.blocks.push({
      type: 'summary',
      data
    });
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private shouldContinueInitialFlow(flowRunId: number): boolean {
    return !this.hasRepairFlowTakenOver && flowRunId === this.initialFlowRunId;
  }

  private shouldContinueRunningBuildResume(resumeVersion: number): boolean {
    return resumeVersion === this.runningBuildResumeVersion && this.isReactBuilding;
  }

  get previewOverlayTitle(): string {
    switch (this.buildFlowType) {
      case 'repair':
        return "I'm Repairing the Preview Build.";
      case 'restore':
        return "I'm Loading Your Saved Draft.";
      case 'customize':
        return "I'm Customizing the Preview.";
      case 'regenerate':
        return "I'm Generating a New Preview Variation.";
      case 'switch':
        return "I'm Loading the Selected Preview.";
      case 'initial':
      default:
        return "I'm Generating the Preview.";
    }
  }

  get previewOverlaySubtitle(): string {
    if (this.buildFlowType === 'customize' && this.activeCustomizationProgressBlock?.data?.message) {
      return this.activeCustomizationProgressBlock.data.message;
    }

    return 'This may take a few seconds';
  }

  get showPreviewOverlayProgressDetails(): boolean {
    return this.buildFlowType === 'customize' && !!this.activeCustomizationProgressBlock;
  }

  get activeCustomizationProgressPercentage(): number {
    return this.activeCustomizationProgressBlock?.data?.percentage ?? 0;
  }

  get activeCustomizationProgressLabel(): string {
    return this.activeCustomizationProgressBlock?.data?.stepLabel || 'AI Processing';
  }

  get activeCustomizationProgressMessage(): string {
    return this.activeCustomizationProgressBlock?.data?.logs?.slice(-1)[0]
      || this.activeCustomizationProgressBlock?.data?.message
      || 'Applying your requested changes...';
  }

  get previewOverlayLoaderText(): string {
    switch (this.buildFlowType) {
      case 'repair':
        return 'Repairing...';
      case 'restore':
        return 'Restoring...';
      case 'customize':
        return 'Customizing...';
      case 'regenerate':
        return 'Generating...';
      case 'switch':
        return 'Loading...';
      case 'initial':
      default:
        return 'Generating...';
    }
  }

  get previewOverlayLoaderLetters(): string[] {
    return this.previewOverlayLoaderText.split('');
  }

  private refreshProjectContext(inquiryId?: string) {
    const storedProjectData = sessionStorage.getItem('projectData');
    const parsedStoredProjectData = storedProjectData ? JSON.parse(storedProjectData) : null;
    const generatedProjectState = this.projectGenerationTabState.getTabState(inquiryId || this.selectedProjectId);
    const resolvedProjectData = generatedProjectState?.projectData || parsedStoredProjectData;

    this.projectsData = resolvedProjectData;
    if (resolvedProjectData) {
      sessionStorage.setItem('projectData', JSON.stringify(resolvedProjectData));
    }

    if (generatedProjectState?.finalPrompt?.trim()) {
      this.finalPrompt = generatedProjectState.finalPrompt.trim();
    }
  }

  private closeFailedGenerationWorkspaceAndNavigateHome() {
    const inquiryId = this.selectedProjectId?.trim();
    const generationTab = this.projectGenerationTabState.getTabState(inquiryId);

    if (inquiryId && generationTab && (!generationTab.previewData?.templateId || generationTab.projectName === 'New Project')) {
      this.projectGenerationTabState.clearTab(inquiryId);
    }

    this.projectGenerationTabState.setActiveInquiryId(null);
    this.selectedProjectId = '';
    this.apiService.resetWorkspaceChatState();
    this.router.navigate(['/main']);
  }

  private hideDeployHeaderAction() {
    this.showDeployHeaderAction = false;
    if (this.deployHeaderActionTimer) {
      clearTimeout(this.deployHeaderActionTimer);
      this.deployHeaderActionTimer = null;
    }
  }

  private scheduleDeployHeaderAction() {
    this.hideDeployHeaderAction();
    this.deployHeaderActionTimer = setTimeout(() => {
      if (!!this.safePreviewUrl && !this.isReactBuilding && !this.isIframeLoading) {
        this.showDeployHeaderAction = true;
        this.fetchCustomizationSuggestions(this.selectedProjectId);
        setTimeout(() => this.scrollToBottom(true), 50);
        setTimeout(() => this.scrollToBottom(true), 250);
      }
      this.deployHeaderActionTimer = null;
    }, 250);
  }

  private initializeCallbackRequestForm() {
    this.callbackRequestForm.reset({
      fullName: this.userInfo?.name || '',
      businessEmail: this.userInfo?.email || '',
      phoneNumber: this.userInfo?.phoneNumber || null,
      companyName: this.userInfo?.companyName || '',
      description: ''
    });
  }

  get showSupportCallbackButton(): boolean {
    return this.showDeployHeaderAction;
  }

  fetchCustomizationSuggestions(inquiryId: string) {
    if (!inquiryId) {
      return;
    }

    if (this.suggestionsMap.has(inquiryId)) {
      this.currentSuggestions = this.suggestionsMap.get(inquiryId);
      this.suggestionsError = null;
      return;
    }

    if (this.isSuggestionsLoading) {
      return;
    }

    this.isSuggestionsLoading = true;
    this.suggestionsError = null;

    this.apiService.postAPI<any, any>('api/ai/customization-suggestion', { inquiryPublicId: inquiryId })
      .subscribe({
        next: (res: any) => {
          this.isSuggestionsLoading = false;
          if (res && res.success && res.data) {
            this.suggestionsMap.set(inquiryId, res.data);
            if (this.selectedProjectId === inquiryId) {
              this.currentSuggestions = res.data;
              setTimeout(() => this.scrollToBottom(true), 100);
            }
          } else {
            this.suggestionsError = res?.message || 'Failed to load suggestions';
            setTimeout(() => this.scrollToBottom(true), 100);
          }
        },
        error: (err: any) => {
          this.isSuggestionsLoading = false;
          this.suggestionsError = err?.error?.message || 'Failed to load suggestions';
          setTimeout(() => this.scrollToBottom(true), 100);
        }
      });
  }

  isCategoryExpanded(catTitle: string): boolean {
    const inquiryId = this.selectedProjectId;
    if (!inquiryId) return false;
    if (!this.expandedCategoriesMap.has(inquiryId)) {
      this.expandedCategoriesMap.set(inquiryId, new Set<string>());
    }
    return this.expandedCategoriesMap.get(inquiryId)!.has(catTitle);
  }

  getCategoryIcon(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('design') || t.includes('theme') || t.includes('style') || t.includes('color')) {
      return '🎨';
    } else if (t.includes('content') || t.includes('copy') || t.includes('text')) {
      return '📝';
    } else if (t.includes('service') || t.includes('feature')) {
      return '⚡';
    } else if (t.includes('page') || t.includes('layout') || t.includes('structure')) {
      return '📄';
    }
    return '💡';
  }

  getCategorySubtitle(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('design')) return 'Improve visual hierarchy and UI consistency';
    if (t.includes('content')) return 'Improve website messaging and content';
    if (t.includes('service')) return 'Optimize service descriptions and offerings';
    if (t.includes('page')) return 'Enhance additional pages for better navigation';
    return 'Explore suggested enhancements';
  }

  toggleCategory(catTitle: string): void {
    const inquiryId = this.selectedProjectId;
    if (!inquiryId) return;
    if (!this.expandedCategoriesMap.has(inquiryId)) {
      this.expandedCategoriesMap.set(inquiryId, new Set<string>());
    }
    const expandedSet = this.expandedCategoriesMap.get(inquiryId)!;
    if (expandedSet.has(catTitle)) {
      expandedSet.delete(catTitle);
    } else {
      expandedSet.add(catTitle);
    }
  }

  isSuggestionsCollapsedMap = new Map<string, boolean>();

  isSuggestionsCollapsed(): boolean {
    const inquiryId = this.selectedProjectId;
    if (!inquiryId) return true;
    if (!this.isSuggestionsCollapsedMap.has(inquiryId)) {
      return true;
    }
    return !!this.isSuggestionsCollapsedMap.get(inquiryId);
  }

  toggleSuggestionsCollapse(): void {
    const inquiryId = this.selectedProjectId;
    if (inquiryId) {
      const current = this.isSuggestionsCollapsed();
      this.isSuggestionsCollapsedMap.set(inquiryId, !current);
      if (current) {
        setTimeout(() => this.scrollToBottom(true), 100);
      }
    }
  }

  hasVisibleSuggestions(): boolean {
    return (this.isSuggestionsLoading || !!this.suggestionsError || (!!this.currentSuggestions && !!this.currentSuggestions.categories && this.currentSuggestions.categories.length > 0));
  }

  isSuggestionsDismissed(): boolean {
    return false;
  }

  dismissSuggestions(): void {
    const inquiryId = this.selectedProjectId;
    if (inquiryId) {
      this.isSuggestionsCollapsedMap.set(inquiryId, true);
    }
  }

  selectSuggestion(suggestion: any) {
    if (this.customizeInput?.nativeElement && suggestion?.objective) {
      // this.customizeInput.nativeElement.value = suggestion.objective;
      // this.focusCustomizeInput();
      this.handlePromptSubmitted({ 'blockId': 'customize_template', 'value': suggestion.customization_prompt })
    }
  }

  showFeedbackModal(fromButton: boolean = false) {
    if (this.isFeedbackModalOpen) return;
    if (!fromButton && this.isFeedbackSubmitted) return;
    this.isFeedbackModalOpen = true;
    const modalElement = document.getElementById('feedbackModal');
    if (modalElement) {
      bootstrap.Modal.getOrCreateInstance(modalElement, {
        backdrop: 'static',
        keyboard: false
      }).show();
    }
  }

  isFeedbackSubmitAttempted = false;

  onFeedbackModalDismiss() {
    this.isFeedbackModalOpen = false;
    this.isFeedbackSubmitted = true;
    this.isFeedbackSubmitAttempted = false;
  }

  setRating(rating: number) {
    this.feedbackForm.patchValue({ rating });
    this.isFeedbackSubmitAttempted = false;
  }

  submitFeedback() {
    this.isFeedbackSubmitAttempted = true;
    if (this.feedbackForm.invalid || this.feedbackForm.value.rating === 0) {
      return;
    }

    const text = this.feedbackForm.value.feedback_text;

    const payload = {
      project_template_id: this.selectedProjectId,
      feedback_type: 'satisfaction_survey',
      rating: this.feedbackForm.value.rating,
      feedback_text: text
    };

    this.apiService.postAPI<any, any>('api/user/feedback', payload).subscribe({
      next: (res) => {
        this.toster.success('Thank you for your feedback!');
        this.isFeedbackSubmitted = true;
        this.feedbackForm.reset();
        const btn = document.getElementById('feedbackModalCloseBtn');
        if (btn) btn.click();
      },
      error: (err) => {
        this.toster.error('Failed to submit feedback.');
        console.error(err);
      }
    });
  }

  toggleEditorMode(): void {
    this.editorMode = !this.editorMode;

    this.sendEditorMode();
  }

  confirmDiscard() {
    this.toggleEditorMode();
    this.editCommentsArray = [];
    this.showDiscardConfirm = false;
  }

  private sendEditorMode(): void {

    const iframe =
      this.previewFrame?.nativeElement;

    if (!iframe?.contentWindow) {
      console.warn(
        '[CreativeAI] Preview iframe is not ready'
      );

      return;
    }

    iframe.contentWindow.postMessage(
      {
        type: 'creative-ai-editor-toggle',
        enabled: this.editorMode
      },
      '*'
    );

    console.log(
      '[CreativeAI] Editor:',
      this.editorMode
        ? 'ON'
        : 'OFF'
    );
  }

  applyElementEdits(): void {

    if (
      !this.elementEdits.length
    ) {
      return;
    }

    console.log(
      '================================'
    );

    console.log(
      '[CreativeAI] APPLYING ELEMENT EDITS'
    );

    console.log(
      JSON.stringify(
        this.elementEdits,
        null,
        2
      )
    );

    console.log(
      '================================'
    );

    /*
     * Existing AI/backend request
     * yahan connect karenge.
     */
  }

  toggleEditorToolbar(): void {
    this.editorToolbarCollapsed =
      !this.editorToolbarCollapsed;
  }


  previewFiles: {
    id?: string;
    file: File;
    previewUrl: string;
    previewType: 'image' | 'video' | 'audio' | 'pdf';
    fileName: string;
    isUploading?: boolean;
    asset?: any;
  }[] = [];

  handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const newFiles: File[] = Array.from(input.files);
    const newlyAddedItems: any[] = [];

    newFiles.forEach((file: File) => {
      let previewType: 'image' | 'video' | 'audio' | 'pdf' | null = null;

      if (file.type.startsWith('image/')) {
        previewType = 'image';
      } else if (file.type.startsWith('video/')) {
        previewType = 'video';
      } else if (file.type.startsWith('audio/')) {
        previewType = 'audio';
      } else if (file.type === 'application/pdf') {
        previewType = 'pdf';
      }

      if (!previewType) {
        console.warn('Unsupported file type:', file.type);
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      const item = {
        file: file,
        previewUrl: previewUrl,
        previewType: previewType,
        fileName: file.name,
        isUploading: true,
        asset: null
      };

      this.previewFiles.push(item);
      newlyAddedItems.push(item);
    });

    const activeDesign = this.templates.find((t: any) => t.inquiryId === this.selectedProjectId)?.templateId;

    if (activeDesign && newlyAddedItems.length > 0) {
      const filesToUpload = newlyAddedItems.map(item => item.file);
      this.apiService.uploadCustomizeAssets(activeDesign, filesToUpload).subscribe({
        next: (response: any) => {
          console.log('Upload response:', response);
          this.fileUrls = response;
          const returnedAssets = response?.assets || (Array.isArray(response) ? response : []);

          if (Array.isArray(returnedAssets)) {
            newlyAddedItems.forEach((item) => {
              const matchedAsset = returnedAssets.find((a: any) =>
                a.originalName === item.fileName ||
                a.fileName === item.fileName ||
                a.originalName === item.file?.name
              ) || returnedAssets[0];

              if (matchedAsset) {
                item.id = matchedAsset.id;
                item.asset = matchedAsset;
              }
              item.isUploading = false;
            });
          } else {
            newlyAddedItems.forEach(item => item.isUploading = false);
          }

          this.updatePendingAttachments();
        },
        error: (error: any) => {
          console.error('Error uploading files:', error);
          newlyAddedItems.forEach(item => item.isUploading = false);
        }
      });
    } else {
      newlyAddedItems.forEach(item => item.isUploading = false);
    }

    input.value = '';
  }

  removePreviewFile(index: number): void {
    if (index < 0 || index >= this.previewFiles.length) {
      return;
    }

    const item = this.previewFiles[index];
    if (item && item.previewUrl && item.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }

    this.previewFiles.splice(index, 1);
    this.updatePendingAttachments();
  }

  private updatePendingAttachments(): void {
    const uploadedAssets = this.previewFiles
      .filter(item => item.asset)
      .map(item => item.asset);

    (this as any).pendingAttachments = uploadedAssets;
    if (this.fileUrls && typeof this.fileUrls === 'object') {
      this.fileUrls.assets = uploadedAssets;
    } else {
      this.fileUrls = uploadedAssets;
    }
  }

}


