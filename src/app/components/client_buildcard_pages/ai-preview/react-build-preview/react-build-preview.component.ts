import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { SafeHtml, DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { firstValueFrom } from 'rxjs';
import { SubscriptionResponse } from '../../../../models/subcription';
import { AiSocketService } from '../../../../services/ai-socket.service';
import { ApiService } from '../../../../services/api.service';
import { ReactCodeEditorComponent } from '../react-code-editor/react-code-editor.component';
import { AiDevRendererComponent } from '../ai-dev-renderer/ai-dev-renderer.component';
import { SubscriptionModalService } from '../../../../services/subscription-modal.service';
import { SubcriptionService } from '../../../../services/subcription.service';
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

export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '');
  return value.trim().length === 0 ? { whitespace: true } : null;
}

declare var bootstrap: any;
@Component({
  selector: 'app-react-build-preview',
  standalone: true,
  imports: [CommonModule, NgxIntlTelInputModule, ScrollingModule, ReactCodeEditorComponent, NzSelectModule, FormsModule, ReactiveFormsModule, AiDevRendererComponent, WorkspaceHeaderComponent],
  templateUrl: './react-build-preview.component.html',
  styleUrl: './react-build-preview.component.css'
})
export class ReactBuildPreviewComponent {
  socket: any;
  private readonly mobileBreakpoint = 991;
  private readonly buildErrorPreviewLineLimit = 6;
  private readonly buildErrorPreviewCharLimit = 700;
  private readonly generateProjectFailureGraceMs = 45000;
  private readonly maxBuildRepairAttempts = 7;
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
      phase: 'Final repair attempt 5 is in progress before I surface a failure message.',
      support: 'I am applying one last recovery pass, revalidating the build artifacts, and retrying the preview with the latest fixes.'
    }
  ];
  private buildLogCursor = new Date('2026-04-27T19:45:01.607');
  private aiProcessingInterval?: ReturnType<typeof setInterval>;
  private aiProcessingPhaseVersion = 0;
  private pendingFinalBuildSection: any = null;
  private repairAttemptVersion = 0;
  private customizationRequestVersion = 0;
  private initialFlowRunId = 0;
  private hasRepairFlowTakenOver = false;

  safePreviewUrl: SafeResourceUrl | null = null;
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('chatScroll') chatScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('codeEditor') codeEditor!: ReactCodeEditorComponent;
  previewWidth = 1366; // desktop default
  @ViewChild('preview', { static: false }) iframe!: ElementRef<HTMLIFrameElement>;
  blocks: any[] = [];
  pages: any = {};                 // Full response from backend
  currentHTML: SafeHtml = "";       // Current page HTML
  currentCSS: string = "";          // Current page CSS
  styleTag!: HTMLStyleElement;
  activeJsKeys: string[] = [];      // js_keys for current page
  loginRedirect: any = "";
  activeMenuKey: string | null = null;
  projectsData: any;
  socket_id: any;
  previewShow = false;
  previewCodeShow = false;
  builds: any[] = [];
  currentBuildId = 1;
  parentBlock = []
  isTyping = true;
  private buildStepTimeouts: ReturnType<typeof setTimeout>[] = [];
  designMap = new Map<string, DesignSnapshot>();
  designOrder: any[] = [];   // keeps tab order
  activeDesignId!: string;
  hasMarkedFirstBlock = false;
  files: ReactFile[] = [];
  activeFileIndex = 0;
  activeFile!: ReactFile;
  fullScreen: boolean = false;
  showCodeButton = false;
  userHasScrolled = false;
  designCount = 0;
  selected_template_id = '';
  selectedProjectId = '';
  subscriptionPlan!: SubscriptionResponse;
  isIframeLoading = true;
  selectedDeviceType: string = '<i class="fa-solid fa-display"></i>';
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.India;
  baseURl: any;
  previewUrl: any = null;
  isReactBuilding = true;
  buildStep = 0;
  templateExists = false;
  buildFlowType: BuildFlowType = 'initial';
  buildSteps: BuildProgressStep[] = [
    { pendingIconClass: 'fa-solid fa-download', label: 'Installing dependencies' },
    { pendingIconClass: 'fa-solid fa-gear', label: 'Building React app' },
    { pendingIconClass: 'fa-solid fa-rocket', label: 'Deploying preview' }
  ];
  planName = 'Free Plan';
  usedVariations: any[] = [];
  pendingPreviewUrl: string | null = null;
  private hasAutoOpenedCurrentMobilePreview = false;
  private hasDismissedCurrentMobilePreview = false;
  private deployHeaderActionTimer: ReturnType<typeof setTimeout> | null = null;
  skipBuildPrompt = false;
  finalPrompt: any = null;
  selectedPublishOption: 'creative-ai-domain' | 'custom-domain' = 'creative-ai-domain';
  customDomain = '';
  customDomainTouched = false;
  deploymentSuccessMessage = '';
  successModalAction: 'navigate-dashboard' | 'close-only' = 'navigate-dashboard';
  showDeployHeaderAction = false;
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
  private shouldDeferPreviewApply = false;
  private hasInitialFlowCompleted = false;
  private pendingPreviewResponse: { res: any; socketId: string | null } | null = null;
  private pendingPreviewFailure = false;
  private hasInitialBuildCompletionUi = false;
  private generateProjectFailureTimer: ReturnType<typeof setTimeout> | null = null;
  private activePageBuildSection: { type: 'build-section'; data: { title: string; icon: string; done: boolean; items: Array<{ label: string; status: 'active' | 'done' }> } } | null = null;
  private queuedSocketPages: string[] = [];
  private hasCompletedPageGeneration = false;
  private pageGenerationCompletionResolver: (() => void) | null = null;
  today = new Date();
  // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer,
    private aiService: AiSocketService,
    private router: Router,
    private toster: NzMessageService,
    public subscriptionModalService: SubscriptionModalService,
    private subscriptionService: SubcriptionService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.baseURl = this.apiService.apiUrl;
    effect(() => {
      this.finalPrompt = this.apiService._finalPrompt() || sessionStorage.getItem('finalPrompt');
    });
  }

  async ngOnInit() {
    this.refreshProjectContext();
    this.hideDeployHeaderAction();
    this.refreshProjectContext();
    this.socket = io(this.apiService.apiUrl, {
      auth: {
        token: localStorage.getItem('tokenCTi'),
        inquiryPublicId: this.projectsData.clientEnquryId,
      }
    });
    this.registerBuildSocketListeners();
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

    const templates = await this.getUserTemplates();
    this.route.paramMap.subscribe(async (res: any) => {
      this.hideDeployHeaderAction();
      this.selectedProjectId = res.params['id'];
      this.refreshProjectContext();
      const latestTemplates = await this.getUserTemplates();
      this.loadDraftTemplates(latestTemplates);
    });

    const existingTemplate = templates.find((t: any) => t.inquiryId === this.selectedProjectId);

    if (existingTemplate) {
      await this.showDraftWelcomeMessages(false);
      await this.loadDraftTemplates(templates);
      return;
    }


    await this.runInitialBuildSequence();
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

    if (socket_id) {
      this.setBuildFlow('initial');
      this.startBuildProgressTimers();
    }
    const payload = this.buildPreviewPayload(socket_id);

    this.apiService
      .postAPI<any, any>('api/ai/generateProject', payload)
      .subscribe({
        next: (res: any) => {
          if (!res?.success || !res?.data?.templateId) {
            this.deferGenerateProjectFailure(res?.data?.message || 'Failed to generate preview');
            return;
          }

          this.clearGenerateProjectFailureTimer();
          this.queueGeneratedPreview(res, socket_id);
          return;
        },
        error: (error: any) => {
          if (error.error.status === 422 && error.error.data.canRepairBuild) {
            this.clearGenerateProjectFailureTimer();
            let repairPayload = {
              templatePublicId: error.error.data.templatePublicId,
              inquiryPublicId: this.projectsData.clientEnquryId,
              error_message: error.error.message,
            }
            void this.attemptBuildRepair(repairPayload, error);
            return;
          }
          this.deferGenerateProjectFailure(error);
        }
      });
  }

  private buildPreviewPayload(socketId: string | null) {
    return {
      prompt: this.finalPrompt,
      project_id: this.projectsData.projectId,
      inquiryPublicId: this.projectsData.clientEnquryId,
      socket_id: socketId,
      excludeVariations: this.usedVariations
    };
  }

  private async attemptBuildRepair(payload: any, buildFailureSource?: any, attemptNumber = 1) {
    this.setBuildGenerationError(buildFailureSource);
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
            this.queueBuildGenerationFailure();
            return;
          }

          this.appendBuildActionPrompt();
          this.queueGeneratedPreview(res, payload.socket_id ?? null);
        },
        error: (error: any) => {
          console.log('Build repair attempt failed:', error);
          if (error.error.status === 422 && error.error.data.canRepairBuild) {
            if (attemptNumber < this.maxBuildRepairAttempts) {
              payload.error_message = error.error.message;
              void this.attemptBuildRepair(payload, error, attemptNumber + 1);
              return;
            }
          }
          if (attemptNumber >= this.maxBuildRepairAttempts) {
            this.appendBuildActionPrompt();
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

  private queueGeneratedPreview(res: any, socketId: string | null) {
    this.clearGenerateProjectFailureTimer();
    this.completeActivePageBuildSection();
    if (this.shouldDeferPreviewApply && !this.hasInitialFlowCompleted) {
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

  private queueBuildGenerationFailure() {
    this.clearGenerateProjectFailureTimer();
    this.completeActivePageBuildSection();
    if (this.shouldDeferPreviewApply && !this.hasInitialFlowCompleted) {
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

    this.currentBuildId++;

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

  async playStatusSequence(lines: string[], lineDelay = 700, finishDelay = 500) {
    if (!lines.length) return;

    this.showLoader(lines[0]);
    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(lineDelay);

    for (let index = 1; index < lines.length; index++) {
      const loaderBlock = this.blocks.find(block => block.id === 'status');
      if (!loaderBlock) break;

      loaderBlock.text = lines[index];
      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(lineDelay);
    }

    await this.delay(finishDelay);
    this.hideLoader();
    setTimeout(() => this.scrollToBottom(true), 0);
  }

  saveDesign() {
    this.router.navigate([`plan-delivery/${this.projectsData.clientEnquryId}`])
  }

  ngOnDestroy() {
    this.blocks = [];
    this.clearGenerateProjectFailureTimer();
    this.stopAiProcessingPhase();
    this.socket?.off?.('page-created');
    this.socket?.off?.('pages-generation-complete');
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
      this.planName = res.planName;
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



  startTyping() {
    // this.codeEditor.startTyping();
  }




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


  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  onDeviceTypeChange(deviceType: string) {
    switch (deviceType) {
      case 'desktop':
        this.selectedDeviceType = '<i class="fa-solid fa-display"></i>';
        this.previewWidth = 1366
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
    this.setSafePreviewUrl(this.getPreviewProxyUrl(templateId));
    this.isReactBuilding = false;
    this.isTyping = false;
  }

  async showDraftWelcomeMessages(streamMessages = true) {

    const now = new Date();
    const introMessage = `I found previously generated templates for this project, and I'm restoring them into the workspace so you can continue review without starting over.`;
    const closingMessage = `Your saved variations are now ready. You can review each template, request a fresh variation, customize the current direction, or move ahead when you're ready to deploy.`;
    const restoredWorkspaceBlock = {
      type: 'file',
      data: {
        title: 'Restored workspace',
        file: 'workspace session',
        summary: 'Recovered saved template variations, restored the active preview, and prepared the workspace state.'
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
            lines: ['Fetching saved templates'],
            done: true
          }
        },
        {
          type: 'terminal',
          data: {
            lines: ['Loading draft previews'],
            done: true
          }
        },
        {
          type: 'terminal',
          data: {
            lines: ['Restoring template tabs in the workspace'],
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
            time: '24s',
            description: 'Restored your saved template workspace and reloaded the available preview variations.',
            highlights: ['Saved template restore', 'Draft previews loaded', 'Workspace ready']
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
      'Fetching saved templates'
    ], 1300, 1500);

    this.setBuildStep(2);
    await this.addTerminal([
      'Loading draft previews'
    ], 1300, 1500);

    this.setBuildStep(3);
    await this.addTerminal([
      'Restoring template tabs in the workspace'
    ], 1300, 1600);

    this.blocks.push(restoredWorkspaceBlock);
    setTimeout(() => this.scrollToBottom(true), 0);
    await this.delay(420);

    await this.addParagraphBlock(
      closingMessage,
      2000
    );

    await this.addSummary({
      time: '24s',
      description: 'Restored your saved template workspace and reloaded the available preview variations.',
      highlights: ['Saved template restore', 'Draft previews loaded', 'Workspace ready']
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
        message: 'Share the changes you want in this template, and I will tailor this version around your needs.',
        placeholder: 'Describe the changes you want in this template',
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

  async handlePromptSubmitted(event: Event | { blockId: string; value: string }) {
    const promptEvent = event as { blockId?: string; value?: string };
    const prompt = promptEvent?.value?.trim();

    if (!prompt) return;

    if (this.getCurrentCreditBalance() < 20) {
      this.appendCreditLimitPrompt();
      return;
    }

    const templates = await this.getUserTemplates();
    const templatePublicId = templates.find((t: any) => t.inquiryId === this.selectedProjectId)?.templateId;

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

    this.isReactBuilding = true;
    this.isTyping = true;
    this.resetBuildGenerationError();
    const customizationRequestVersion = ++this.customizationRequestVersion;
    this.startQuickBuildProgress('customize', 1200, 2600);
    this.showLoader('Reviewing your requested changes...');
    void this.announceCustomizationProgress(prompt, customizationRequestVersion);

    const payLoad = {
      prompt,
      templatePublicId
    };

    this.apiService.postAPI('api/ai/customization', payLoad).subscribe({
      next: (res: any) => {
        if (!res?.success || !res?.data?.templateId) {
          this.customizationRequestVersion++;
          this.setBuildGenerationError(res?.data?.message || 'Failed to customize preview');
          this.queueBuildGenerationFailure();
          return;
        }

        this.customizationRequestVersion++;
        this.hideLoader();
        this.blocks.push({
          type: 'summary',
          data: {
            time: 'Updated',
            description: 'Your requested customization has been applied and the refreshed preview is now loading.',
            highlights: [
              'Prompt reviewed',
              'Template updated',
              'Fresh preview generated'
            ]
          }
        });
        this.queueGeneratedPreview(res, null);
      },
      error: (error: any) => {
        if (error?.error?.status === 422 && error?.error?.data?.canRepairBuild) {
          this.customizationRequestVersion++;
          const repairPayload = {
            templatePublicId: error.error.data.templatePublicId || templatePublicId,
            inquiryPublicId: this.projectsData.clientEnquryId,
            error_message: error.error.message,
          };
          void this.attemptBuildRepair(repairPayload, error);
          return;
        }

        this.customizationRequestVersion++;
        this.setBuildGenerationError(error);
        this.queueBuildGenerationFailure();
      }
    });

    setTimeout(() => this.scrollToBottom(true), 0);
  }

  private async announceCustomizationProgress(prompt: string, requestVersion: number) {
    await this.delay(250);
    if (requestVersion !== this.customizationRequestVersion) {
      return;
    }
    await this.addParagraphBlock('Applying your requested changes to the current template.', 500, 'phase');
    if (requestVersion !== this.customizationRequestVersion) {
      return;
    }
    await this.addParagraphBlock(
      `Customization request: ${prompt.length > 140 ? `${prompt.slice(0, 137)}...` : prompt}`,
      450,
      'support'
    );
    if (requestVersion !== this.customizationRequestVersion) {
      return;
    }
    this.showLoader('Updating the template and preparing a refreshed preview...');
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

    if (this.getCurrentCreditBalance() >= 60) {
      this.openBootstrapModal('publishProjectModal', { backdrop: 'static', keyboard: true });
      return;
    }

    this.openBootstrapModal('insufficientCreditsModal', { backdrop: 'static', keyboard: true });

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

  setPreviewUrl(url: string) {
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
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
          this.successModalAction = 'navigate-dashboard';
          this.deploymentSuccessMessage = deploymentDomainType === 'custom'
            ? 'Your domain request has been saved successfully. Our team will reach out to you shortly if we need any additional details.'
            : 'Your project has been deployed successfully. We will take you to the dashboard once you confirm.';
          this.openBootstrapModal('deploymentSuccessModal', { backdrop: 'static', keyboard: false });
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



  getHomeCSS() {
    return {
      file: 'src/styles/home.css',
      added: 25,
      removed: 0,
      content: [
        { line: 1, text: '.home {' },
        { line: 2, text: '  padding: 20px;' },
        { line: 3, text: '}' },
        { line: 5, text: 'h1 {' },
        { line: 6, text: '  font-size: 24px;' },
        { line: 7, text: '}' }
      ]
    };
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

  private registerBuildSocketListeners() {
    if (!this.socket?.on) {
      return;
    }

    this.socket.off?.('page-created');
    this.socket.off?.('pages-generation-complete');
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

  async addCodeBlock(fileData: any) {
    const block = {
      type: 'code',
      data: {
        file: fileData.file,
        added: fileData.added,
        removed: fileData.removed,
        content: [] as any[]
      }
    };

    this.blocks.push(block);
    setTimeout(() => this.scrollToBottom(true), 0);

    await this.delay(fileData.initialDelay ?? 900);

    for (let row of fileData.content) {
      const nextRow = {
        ...row,
        text: ''
      };

      block.data.content.push(nextRow);
      setTimeout(() => this.scrollToBottom(true), 0);

      for (const char of row.text) {
        nextRow.text += char;
        if (char === '\n' || nextRow.text.length % 6 === 0) {
          setTimeout(() => this.scrollToBottom(true), 0);
        }
        await this.delay(char === ' ' ? 10 : (fileData.lineDelay ?? 16));
      }

      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(fileData.rowDelay ?? 180);
    }

    await this.delay(fileData.finishDelay ?? 1400);
    setTimeout(() => this.scrollToBottom(true), 0);
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

  private refreshProjectContext() {
    const projectData = sessionStorage.getItem('projectData');
    this.projectsData = projectData ? JSON.parse(projectData) : null;
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



