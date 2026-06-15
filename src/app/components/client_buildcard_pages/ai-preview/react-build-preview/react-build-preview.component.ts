import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
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
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { io } from 'socket.io-client';

interface DesignSnapshot {
  id: string;
  label: string;
  pages: any;
  loginRedirect: any;
  createdAt: Date;

  // NEW
  previewType?: 'html' | 'react';
  reactPreviewUrl?: any;
}

export interface DraftTemplateMapData {
  templateId: string;
  pages: any; // agar pages ka structure pata ho to aur specific kar sakte ho
  loginRedirect: string | null;
  reactBuildUrl: string | null;
  reactBuildStatus: number;
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

export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '');
  return value.trim().length === 0 ? { whitespace: true } : null;
}

declare var bootstrap: any;
@Component({
  selector: 'app-react-build-preview',
  standalone: true,
  imports: [CommonModule, NgxIntlTelInputModule, ReactCodeEditorComponent, FormsModule, ReactiveFormsModule, AiDevRendererComponent, WorkspaceHeaderComponent],
  templateUrl: './react-build-preview.component.html',
  styleUrl: './react-build-preview.component.css'
})
export class ReactBuildPreviewComponent implements OnDestroy {
  private readonly deployCreditsRequired = 60;
  private readonly downloadCodeCreditsRequired = 100;
  private readonly minChatPanelWidth = 320;
  private readonly maxChatPanelWidth = 720;
  socket: any;
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
  private buildLogCursor = new Date('2026-04-27T19:45:01.607');
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
  @ViewChild('customizeInput') customizeInput!: ElementRef<HTMLTextAreaElement>;
  previewWidth = 100; // desktop default
  blocks: any[] = [];
  loginRedirect: any = "";
  projectsData: any;
  files: ReactFile[] = [];
  isTyping = true;
  private buildStepTimeouts: ReturnType<typeof setTimeout>[] = [];
  designMap = new Map<string, DesignSnapshot>();
  designOrder: any[] = [];   // keeps tab order
  activeDesignId!: string;
  hasMarkedFirstBlock = false;
  fullScreen: boolean = false;
  userHasScrolled = false;
  designCount = 0;
  selected_template_id = '';
  selectedProjectId = '';
  subscriptionPlan!: SubscriptionResponse;
  isIframeLoading = true;
  selectedDeviceType: string = '<i class="fa-solid fa-display"></i>';
  SearchCountryField = SearchCountryField;
  selectedCountry = CountryISO.India;
  isReactBuilding = true;
  buildStep = 0;
  templateExists = false;
  buildFlowType: BuildFlowType = 'initial';
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
  private activeVoiceSessionId = 0;
  draftMessages: any[] = []
  today = new Date();
  chatSectionWidth = 420;
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

  async ngOnInit() {
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
      await this.showDraftWelcomeMessages(false);
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
      return;
    }

    const generationTab = this.projectGenerationTabState.getTabState(inquiryId);
    if (generationTab?.status === 'completed' && generationTab.previewData?.templateId) {
      this.applyStoredCompletedPreview(generationTab.previewData);
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
    this.activeDesignId = '';
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
      }
    });
    this.socketInquiryId = inquiryId;
    this.registerBuildSocketListeners();
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
      this.templateExists = res.data.length > 0;
      return res.data;
    }

    return [];
  }
  ngAfterViewInit() {
    this.scrollToBottom(true);
  }
  onUserScroll() {
    this.userHasScrolled = true;
  }

  startPreview(socket_id: string | null) {
    const inquiryId = this.selectedProjectId;
    const ai_model = 'openai';
    if (!inquiryId) {
      return;
    }

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
            this.queueGeneratedPreview(res, null, true);
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
              this.syncRunningBuildBlocks(runningPages);
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
          this.queueGeneratedPreview(res, null, true);
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

  private buildPreviewPayload(socketId: string | null, ai_model = "openai") {
    return {
      prompt: this.finalPrompt,
      project_id: this.projectsData.projectId,
      inquiryPublicId: this.projectsData.clientEnquryId,
      socket_id: socketId,
      ai_model: ai_model,
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
      700,
      'phase'
    );
    if (repairAttemptVersion !== this.repairAttemptVersion) {
      return;
    }

    await this.addParagraphBlock(
      repairAttemptMessage.support,
      1200,
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
      2200,
      900
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
    this.completeActivePageBuildSection();
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
      createdAt: new Date(),
      previewType: 'html'
    };

    this.designMap.set(designId, snapshot);

    this.designOrder.push({
      designId,
      url: previewUrl,
      user_template_id: res.data.templateId || null,
      variation_no: res.data.variation
    });

    this.activeDesignId = designId;

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
      return;
    }

    this.appendBuildActionPrompt();
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

    this.blocks.push(this.createCompletedParagraphBlock('Analyzing your prompt...', 'phase'));
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



  async regenerate() {

    if (this.isTyping) return;
    if (this.designOrder.length >= this.subscriptionPlan.template_limit) {
      this.toster.error(`You have reached the maximum limit of ${this.subscriptionPlan.template_limit} templates.`);
      this.subscriptionModalService.open();
      return;
    }

    this.setBuildFlow('regenerate');
    this.setBuildStep(0);
    this.isReactBuilding = true;

    this.clearFirstBlockMinHeight();
    this.isTyping = true;

    this.blocks = this.blocks.filter(block => block?.id !== 'action-prompt-build');

    await this.addParagraphBlock(
      `I'm generating a fresh template direction for your project. This pass focuses on cleaner hierarchy, improved spacing, and a more distinct visual identity while preserving the core user flow.`,
      1900
    );

    await this.addTerminal([
      'Reviewing the current template structure'
    ], 1400, 1600);

    await this.addTerminal([
      'Exploring a stronger visual direction'
    ], 1400, 1600);

    await this.addTerminal([
      'Refining layout balance and section hierarchy'
    ], 1400, 1700);

    await this.addParagraphBlock(
      `I'm refreshing the most visible UI layers now so this new variation feels intentionally redesigned rather than lightly adjusted.`,
      1700
    );

    await this.addFileActivityBlock('src/components/header.jsx', 'Restructured the shared navigation shell for the refreshed template direction.');
    await this.addFileActivityBlock('src/pages/home.jsx', 'Reworked the primary landing experience with updated hierarchy and section flow.');
    await this.addFileActivityBlock('src/styles/home.css', 'Adjusted spacing, typography, and visual rhythm for the new variation.');

    await this.addParagraphBlock(
      `The next template variation is ready. I'm building the preview now so you can compare it with the other versions in your workspace.`,
      1800
    );

    this.setBuildStep(1);
    await this.addTerminal([
      'Installing dependencies',
      'Preparing production preview build'
    ], 1200, 1200);

    this.setBuildStep(2);
    await this.addTerminal([
      'Compiling React application',
      'Optimizing generated assets'
    ], 1200, 1300);

    this.setBuildStep(3);
    await this.addTerminal([
      'Deploying fresh preview',
      'Linking new template tab'
    ], 1200, 1500);

    await this.addSummary({
      time: '1m 28s',
      description: 'Generated a new template variation with refreshed layout direction and updated preview build.',
      highlights: [
        'Fresh template variation',
        'Updated home and header structure',
        'Refined CSS rhythm',
        'New preview build'
      ]
    });

    setTimeout(() => this.scrollToBottom(true), 0);
    this.isTyping = false;
    // this.startPreview(null);
    this.appendBuildActionPrompt();
    return;

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
    this.aiService.stop();

  }

  isNearBottom(): boolean {
    const el = this.chatScroll.nativeElement;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  scrollToBottom(_force = false) {
    if (!this.chatScroll) return;
    const el = this.chatScroll.nativeElement;
    // 🚀 auto-scroll freely UNTIL user touches scroll
    // if (!force && this.userHasScrolled && !this.isNearBottom()) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }



  clearFirstBlockMinHeight() {
    const first = this.blocks.find(b => b.isFirstOfRegenerate);
    if (!first || !this.chatScroll) return;

    const el = this.chatScroll.nativeElement;

    const prevScrollTop = el.scrollTop;
    const prevScrollHeight = el.scrollHeight;

    first.isFirstOfRegenerate = false;
    this.hasMarkedFirstBlock = false

    setTimeout(() => {
      const newScrollHeight = el.scrollHeight;
      el.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
    }, 0);
  }


  onIframeLoad() {
    this.clearBuildStepTimers();
    this.isIframeLoading = false;
    this.scheduleDeployHeaderAction();

    if (this.isMobileView() && !this.hasAutoOpenedCurrentMobilePreview && !this.hasDismissedCurrentMobilePreview) {
      this.fullScreen = true;
      this.hasAutoOpenedCurrentMobilePreview = true;
    }
  }

  blockPreviewInteraction(event: Event) {
    event.preventDefault();
    event.stopPropagation();
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
  }

  private preparePreviewLoadState() {
    this.isIframeLoading = true;
    this.hideDeployHeaderAction();
    this.hasAutoOpenedCurrentMobilePreview = false;
    this.hasDismissedCurrentMobilePreview = false;
  }

  private setSafePreviewUrl(url: string) {
    this.preparePreviewLoadState();
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }


  onDeviceTypeChange(deviceType: string) {
    switch (deviceType) {
      case 'desktop':
        this.selectedDeviceType = '<i class="fa-solid fa-display"></i>';
        this.previewWidth = 100
        break;
      case 'tablet':
        this.selectedDeviceType = '<i class="fa-solid fa-tablet-screen-button"></i>';
        this.previewWidth = 768
        break;
      case 'mobile':
        this.selectedDeviceType = '<i class="fa-solid fa-mobile-screen"></i>';
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

  async showDraftWelcomeMessages(streamMessages = true) {

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
      1800
    );

    await this.addTerminal([
      'Scanning saved design history'
    ], 1300, 1500);

    this.setBuildStep(2);
    await this.addTerminal([
      'Rehydrating saved preview directions'
    ], 1300, 1500);

    this.setBuildStep(3);
    await this.addTerminal([
      'Rebuilding your AI workspace view'
    ], 1300, 1600);

    this.blocks.push(restoredWorkspaceBlock);
    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(420);

    await this.addParagraphBlock(
      closingMessage,
      2000
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

    this.blocks.push({
      id: `input-prompt-customize-${Date.now()}`,
      text: {
        message: 'Shape This Template Your Way',
        placeholder: 'Type your custom requirements, design ideas, or functionality...',
      },
      done: true,
      timestamp: new Date()
    });
  }

  appendCreditLimitPrompt() {
    this.blocks = this.blocks.filter(block => !String(block?.id || '').startsWith('input-prompt-customize'));

    if (this.subscriptionPlan.planType === 'FREE') {
      this.blocks.push({
        id: `inline-cta-customize-${Date.now()}`,
        text: {
          message: `Hi! You’ve used all your free credits for now. Upgrade to the Standard Plan to get more monthly credits and continue customizing, generating, and deploying without interruptions. You can also purchase additional credits anytime whenever you need them.`,
          buttonLabel: 'Upgrade plan',
          actionId: 'upgrade_plan',
        },
        done: true,
        timestamp: new Date()
      });

    } else {
      this.blocks.push({
        id: `inline-cta-customize-${Date.now()}`,
        text: {
          message: `Hi! You’re running low on credits. Buy more credits to continue customizing, generating, and deploying without interruptions. Want higher monthly limits and more included credits? You can upgrade your plan anytime.`,
          buttonLabel: 'Buy credits',
          actionId: 'buy_credits',
          buttonLabel2: 'Upgrade plan',
          actionId2: 'upgrade_plan'
        },
        done: true,
        timestamp: new Date()
      });
    }

    setTimeout(() => this.scrollToBottom(true), 0);
  }

  handleChatAction(actionId: string) {
    if (actionId === 'regenerate_template') {
      this.regenerate();
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
    const prompt = promptEvent?.value?.trim();

    if (!prompt) return;

    if (this.speechService.isListening) {
      this.speechService.stop();
    }

    this.isVoiceDraftActive = false;
    this.isVoiceUiVisible = false;
    this.isVoiceStarting = false;
    this.voiceDraftText = '';

    if (this.getCurrentCreditBalance() < 5) {
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
    this.blocks.push({
      id: `user-message-customize-${Date.now()}`,
      text: prompt,
      done: true,
      timestamp: new Date()
    });

    this.isTyping = true;
    this.resetBuildGenerationError();
    const customizationRequestVersion = ++this.customizationRequestVersion;
    this.pendingCustomizationRequest = {
      prompt,
      requestVersion: customizationRequestVersion,
      templatePublicId,
      botReplyReceived: false,
      restTriggered: false
    };
    this.activeCustomizationProgressBlock = null;
    this.showLoader('Thinking...');
    const socketPayload = {
      prompt,
      templatePublicId
    };
    if (!this.socket?.emit) {
      this.pendingCustomizationRequest = null;
      this.customizationRequestVersion++;
      this.toster.error('Customization chat is not connected right now. Please try again.');
      return;
    }

    this.socket?.emit?.('customizationChatMessage', socketPayload, (response: any) => {
      this.handleCustomizationChatResponse(response);
    });

    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private async announceCustomizationProgress(prompt: string, requestVersion: number) {
    await this.delay(250);
    if (requestVersion !== this.customizationRequestVersion) {
      return;
    }
    this.showLoader('Updating the template and loading a refreshed preview...');
  }

  private handleCustomizationBotReply(payload: any) {
    if (!this.pendingCustomizationRequest || !this.isCustomizationChatPayload(payload)) {
      return;
    }

    const reply = this.extractCustomizationBotReply(payload);
    if (!reply) {
      return;
    }

    this.pendingCustomizationRequest.botReplyReceived = true;
    this.hideLoader();
    this.blocks.push(
      this.createCompletedParagraphBlock(
        reply,
        'default'
      )
    );
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private handleCustomizationProgressReply(payload: any) {
    const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
    if (!message) {
      return;
    }

    this.isReactBuilding = true;
    this.isTyping = true;
    this.hideLoader();
    this.setBuildFlow('customize');

    const percentage = this.normalizeCustomizationPercentage(payload?.percentage);
    this.setBuildStep(this.getCustomizationBuildStep(percentage));

    const progressData = {
      historyId: Number.isFinite(Number(payload?.historyId)) ? Number(payload.historyId) : null,
      step: typeof payload?.step === 'string' ? payload.step : 'ai_processing',
      stepLabel: this.getCustomizationProgressStepLabel(payload?.step),
      message,
      percentage,
      logs: this.normalizeCustomizationLogs(payload?.console_logs)
    };

    if (!this.activeCustomizationProgressBlock || this.activeCustomizationProgressBlock.data.step !== progressData.step) {
      this.activeCustomizationProgressBlock = {
        type: 'ai-progress',
        data: progressData
      };
      this.blocks.push(this.activeCustomizationProgressBlock);
    } else {
      this.activeCustomizationProgressBlock.data = progressData;
    }

    this.showLoader(message);
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private normalizeCustomizationPercentage(value: any): number {
    const percentage = Number(value);
    if (!Number.isFinite(percentage)) {
      return this.activeCustomizationProgressBlock?.data?.percentage ?? 0;
    }

    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  private normalizeCustomizationLogs(value: any): string[] {
    if (!Array.isArray(value)) {
      return this.activeCustomizationProgressBlock?.data?.logs ?? [];
    }

    return value
      .map((log) => String(log || '').trim())
      .filter(Boolean)
      .slice(-5);
  }

  private getCustomizationProgressStepLabel(step: any): string {
    const normalizedStep = String(step || '').trim().replace(/[_-]+/g, ' ');
    if (!normalizedStep) {
      return 'Customizing your preview';
    }

    return normalizedStep.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getCustomizationBuildStep(percentage: number): number {
    if (percentage >= 75) {
      return 3;
    }

    if (percentage >= 35) {
      return 2;
    }

    return 1;
  }

  private handleCustomizationChatResponse(response: any) {
    if (!response || !this.pendingCustomizationRequest) {
      return;
    }

    const normalizedResponse = typeof response === 'string'
      ? { botReply: response }
      : response;

    if (this.isCustomizationChatPayload(normalizedResponse) && this.extractCustomizationBotReply(normalizedResponse)) {
      this.handleCustomizationBotReply(normalizedResponse);
    }

    const shouldTriggerApi = !!(
      normalizedResponse?.triggerCustomizationAPI
      || normalizedResponse?.data?.triggerCustomizationAPI
    );

    if (shouldTriggerApi) {
      void this.handleCustomizationApiTrigger(normalizedResponse);
    }
  }

  private async handleCustomizationApiTrigger(payload: any) {
    const pendingRequest = this.pendingCustomizationRequest;
    if (!pendingRequest || pendingRequest.restTriggered) {
      return;
    }

    const triggerPrompt = this.extractCustomizationPrompt(payload) || pendingRequest.prompt;
    const triggerTemplatePublicId = this.extractCustomizationTemplateId(payload) || pendingRequest.templatePublicId;

    pendingRequest.restTriggered = true;
    this.isReactBuilding = true;
    this.startQuickBuildProgress('customize', 1200, 2600);
    if (pendingRequest.botReplyReceived) {
      this.showLoader('Updating the template and loading a refreshed preview...');
    }
    this.runCustomizationApiRequest(
      triggerPrompt,
      triggerTemplatePublicId,
      pendingRequest.requestVersion
    );
  }

  private runCustomizationApiRequest(prompt: string, templatePublicId: string, requestVersion: number) {
    const payLoad = {
      prompt,
      templatePublicId
    };

    this.apiService.postAPI('api/ai/customization', payLoad).subscribe({
      next: (res: any) => {
        if (requestVersion !== this.customizationRequestVersion) {
          return;
        }

        if (!res?.success || !res?.data?.templateId) {
          this.customizationRequestVersion++;
          this.pendingCustomizationRequest = null;
          this.setBuildGenerationError(res?.data?.message || 'Failed to customize preview');
          this.queueBuildGenerationFailure();
          return;
        }

        this.customizationRequestVersion++;
        this.pendingCustomizationRequest = null;
        this.completeActiveCustomizationProgress();
        this.hideLoader();
        this.queueGeneratedPreview(res, null);
      },
      error: (error: any) => {
        if (requestVersion !== this.customizationRequestVersion) {
          return;
        }

        this.pendingCustomizationRequest = null;
        if (error?.error?.status === 422 && error?.error?.data?.canRepairBuild) {
          this.customizationRequestVersion++;
          const repairPayload = this.buildRepairPayload(error, templatePublicId);
          void this.attemptBuildRepair(repairPayload, error);
          return;
        }

        this.customizationRequestVersion++;
        this.setBuildGenerationError(error);
        this.queueBuildGenerationFailure();
      }
    });
  }

  private completeActiveCustomizationProgress() {
    const logs = this.activeCustomizationProgressBlock
      ? [
        ...this.activeCustomizationProgressBlock.data.logs,
        'Customization complete. Refreshing preview...'
      ].slice(-5)
      : ['Customization complete. Refreshing preview...'];

    const historyId = this.activeCustomizationProgressBlock?.data?.historyId || null;

    this.activeCustomizationProgressBlock = {
      type: 'ai-progress',
      data: {
        historyId,
        step: 'preview_ready',
        stepLabel: 'Preview Ready',
        message: 'Customization complete. Loading your refreshed preview...',
        percentage: 100,
        logs: logs
      }
    };
    this.blocks.push(this.activeCustomizationProgressBlock);
    this.setBuildStep(3);
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private extractCustomizationBotReply(payload: any): string {
    if (typeof payload === 'string') {
      return payload.trim();
    }

    if (payload && typeof payload === 'object') {
      const candidate = payload.botReply ?? payload.message ?? payload.reply;
      return typeof candidate === 'string' ? candidate.trim() : '';
    }

    return '';
  }

  private extractCustomizationPrompt(payload: any): string {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    const candidate = payload.prompt ?? payload.data?.prompt;
    return typeof candidate === 'string' ? candidate.trim() : '';
  }

  private extractCustomizationTemplateId(payload: any): string {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    const candidate = payload.templatePublicId ?? payload.data?.templatePublicId;
    return typeof candidate === 'string' ? candidate.trim() : '';
  }

  private isCustomizationChatPayload(payload: any): boolean {
    if (typeof payload === 'string') {
      return true;
    }

    if (!payload || typeof payload !== 'object') {
      return false;
    }

    if (typeof payload.isCustomizationChat === 'boolean') {
      return payload.isCustomizationChat;
    }

    if (typeof payload.data?.isCustomizationChat === 'boolean') {
      return payload.data.isCustomizationChat;
    }

    return true;
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
  isDeployApiSuccess = false;

  startDeploySteps() {
    this.currentDeployStep = 1;
    this.deployTimerSeconds = this.deployStepDurations[0];
    this.isDeployApiSuccess = false;
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
          this.isDeployApiSuccess = true;
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

  switchDesign(designId: string) {
    if (this.activeDesignId === designId) return;

    this.activeDesignId = designId;

    const design = this.designOrder.find(d => d.designId === designId);

    if (design?.url) {
      this.startQuickBuildProgress('switch');
      this.setSafePreviewUrl(design.url);
    }
  }

  removeDesign(item: any) {
    const index = this.designOrder.findIndex(d => d.designId === item.designId);
    if (index === -1) return;

    // 🔹 Optional confirm
    const confirmDelete = confirm('Are you sure you want to delete this template?');
    if (!confirmDelete) return;

    // 🔹 Call delete API
    this.apiService
      .postAPI('api/user/deleteUserTemplate', {
        template_id: item.user_template_id,
        clientEnquryId: this.projectsData.clientEnquryId
      })
      .subscribe({
        next: () => {

          // ✅ Remove variation also
          if (item.variation_no) {
            this.usedVariations = this.usedVariations.filter(
              v => v !== item.variation_no
            );
          }

          // ✅ Remove from UI
          this.designOrder.splice(index, 1);
          this.designMap.delete(item.designId);

          // 🔁 Switch tab
          if (this.designOrder.length > 0) {
            const newActive = this.designOrder[0];

            this.activeDesignId = newActive.designId;

            this.setSafePreviewUrl(newActive.url);
          } else {
            this.activeDesignId = '';
            this.safePreviewUrl = null;
            this.hideDeployHeaderAction();
          }
        },

        error: (err) => {
          console.error('❌ Delete failed:', err);
          this.toster.error('Failed to delete template');
        }
      });
  }


  async startFlow() {
    const flowRunId = ++this.initialFlowRunId;
    this.blocks = [];
    this.resetActivePageBuildSection();

    this.setBuildFlow('initial');
    this.setBuildStep(1);
    await this.addParagraphBlock('Analyzing your prompt...', 700, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Thinking through product requirements...');
    await this.addBuildSection(
      'Analyzing your prompt...',
      '🧠',
      [
        'Understanding project direction',
        'Mapping the main screens and user flow',
        'Defining overall product specification'
      ],
      5200,
      1800
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Synthesizing prompt insights...');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    await this.addParagraphBlock(
      `The scope is clear now, so I’m moving into the actual build flow with structure first and code generation right after that.`,
      1200,
      'support'
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    await this.addParagraphBlock('Initializing project...', 700, 'phase');
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
      4200,
      1600
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Thinking through system setup...');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    await this.addParagraphBlock('Creating structure...', 700, 'phase');
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
      3600,
      1500
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Planning the first file generation batch...');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.setBuildStep(2);
    await this.addParagraphBlock('Creating core files...', 700, 'phase');
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
      4300,
      1700
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Reviewing generated foundation files...');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    await this.addParagraphBlock('Building UI...', 700, 'phase');
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
      4300,
      1700
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Refining shared UI building blocks...');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    await this.addParagraphBlock('Creating pages...', 700, 'phase');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    await this.showLoader('Generating screen-level page code...');
    this.startSocketDrivenBuildSection(
      'Creating pages...',
      '📄',
    );
    await this.waitForPageGenerationCompletion();
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();
    await this.pauseBetweenMajorSteps('Checking page flow and navigation...');
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }

    this.setBuildStep(3);
    await this.addParagraphBlock('Finalizing...', 700, 'phase');
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
      6500,
      1200
    );
    if (!this.shouldContinueInitialFlow(flowRunId)) {
      return;
    }
    this.hideLoader();

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
    }, 3000);
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

  private resetBuildLogClock() {
    this.buildLogCursor = new Date('2026-04-27T19:45:01.607');
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

  async addParagraphBlock(text: string, waitAfter = 2200, variant: 'default' | 'phase' | 'support' = 'default') {
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
      await this.delay(char === '\n' ? 30 : 18);
    }

    block.done = true;
    setTimeout(() => this.scrollToBottom(true), 0);

    await this.delay(waitAfter);
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

  async addListBlock(items: string[], waitAfter = 1200) {
    this.blocks.push({
      id: `list-${Date.now()}-${this.blocks.length}`,
      text: items,
      done: true,
      timestamp: new Date()
    });

    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(waitAfter);
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
        this.queuedSocketPages.push(pageLabel);
        return;
      }

      this.appendSocketPageToBuildSection(pageLabel);
    });

    this.socket.on('pages-generation-complete', () => {
      this.clearGenerateProjectFailureTimer();
      this.completeActivePageBuildSection();
    });

    this.socket.on('botReply', (payload: any) => {
      console.log('Received bot reply:', payload);
      this.handleCustomizationBotReply(payload);
    });

    this.socket.on('triggerCustomizationAPI', (payload: any) => {
      console.log('Received triggerCustomizationAPI event:', payload);
      void this.handleCustomizationApiTrigger(payload);
    });

    this.socket.on('customization-progress', (payload: any) => {
      console.log('Received customization-progress event:', payload);
      this.handleCustomizationProgressReply(payload);
    });
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

  private completeActivePageBuildSection() {
    this.hasCompletedPageGeneration = true;

    if (!this.activePageBuildSection) {
      if (this.pageGenerationCompletionResolver) {
        this.pageGenerationCompletionResolver();
        this.pageGenerationCompletionResolver = null;
      }
      return;
    }

    const items = this.activePageBuildSection.data.items;
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
      }
      this.deployHeaderActionTimer = null;
    }, 180);
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
}



