import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SafeHtml, DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, firstValueFrom } from 'rxjs';
import { SubscriptionResponse } from '../../../../models/subcription';
import { UserTemplate, GetUserTemplatesResponse } from '../../../../models/userTemplate';
import { AiSocketService } from '../../../../services/ai-socket.service';
import { ApiService } from '../../../../services/api.service';
import { ReactCodeEditorComponent } from '../react-code-editor/react-code-editor.component';
import { AiDevRendererComponent } from '../ai-dev-renderer/ai-dev-renderer.component';
import { SubscriptionModalService } from '../../../../services/subscription-modal.service';
import { SubcriptionService } from '../../../../services/subcription.service';
import { SubcriptionPageComponent } from "../../subcription-page/subcription-page.component";


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

type BuildFlowType = 'initial' | 'restore' | 'regenerate' | 'switch';

interface BuildProgressStep {
  pendingIconClass: string;
  label: string;
}

declare var bootstrap: any;
@Component({
  selector: 'app-react-build-preview',
  standalone: true,
  imports: [CommonModule, ScrollingModule, ReactCodeEditorComponent, NzSelectModule, FormsModule, RouterLink, AiDevRendererComponent, SubcriptionPageComponent],
  templateUrl: './react-build-preview.component.html',
  styleUrl: './react-build-preview.component.css'
})
export class ReactBuildPreviewComponent {

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
  private destroy$ = new Subject<void>();
  isTyping = true;
  private frontendJobId = 0;
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
  subscriptionPlan!: SubscriptionResponse;
  isIframeLoading = true;
  selectedDeviceType: string = '<i class="fa-solid fa-display"></i>';
  languages = [
    {
      value: 'USD',
      label: 'US Dollar',
      icon: 'img/mobile_app_icon_svg.svg'
    },
    {
      value: 'EUR',
      label: 'Euro',
      icon: 'img/mobile_app_icon_svg.svg'
    },
    {
      value: 'INR',
      label: 'Indian Rupee',
      icon: 'img/mobile_app_icon_svg.svg'
    }
  ];
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
  skipBuildPrompt = false;
  subscriptionModalOpen = false;
  selectedSubscriptionTemplateId = '';
  finalSummary: any = null;
  private readonly genericPreviewPages = ['Home', 'About', 'Features', 'Contact', 'Auth'];
  private readonly projectTypePageMap: Record<string, string[]> = {
    ecommerce: ['Home', 'Catalog', 'Details', 'Cart', 'Auth'],
    'e-commerce': ['Home', 'Catalog', 'Details', 'Cart', 'Auth'],
    social: ['Feed', 'Profile', 'Messages', 'Explore', 'Auth'],
    'social media': ['Feed', 'Profile', 'Messages', 'Explore', 'Auth'],
    portfolio: ['Home', 'Projects', 'About', 'Contact', 'Auth'],
    saas: ['Home', 'Features', 'Pricing', 'Dashboard', 'Auth'],
    dashboard: ['Overview', 'Analytics', 'Reports', 'Settings', 'Auth'],
    education: ['Home', 'Courses', 'Lessons', 'Progress', 'Auth'],
    healthcare: ['Home', 'Services', 'Appointments', 'Support', 'Auth'],
    travel: ['Home', 'Destinations', 'Bookings', 'Itinerary', 'Auth']
  };
  // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer,
    private aiService: AiSocketService,
    private router: Router,
    private toster: NzMessageService,
    private subscriptionModalService: SubscriptionModalService,
    private subscriptionService: SubcriptionService
  ) {
    this.baseURl = this.apiService.apiUrl;

    effect(() => {
      this.finalSummary = this.apiService._finalSummary() || sessionStorage.getItem('finalSummary');
    });
  }

  async ngOnInit() {
    this.subscriptionModalService.modalState$.subscribe((state) => {
      this.subscriptionModalOpen = state.isOpen;
      this.selectedSubscriptionTemplateId = state.selectedTemplateId;
    });
    this.getUserSubscriptionPlan();

    const projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);

    this.blocks = [];

    // 🔹 Store preview temporarily (IMPORTANT)
    this.pendingPreviewUrl = null;

    // ============================================
    // ✅ 1. LOAD DRAFT TEMPLATES FIRST
    // ============================================

    const templates = await this.getUserTemplates();
    if (templates.length > 0) {
      await this.showDraftWelcomeMessages();
      await this.loadDraftTemplates(templates);
      return;
    }
    if (!this.projectsData.projectId) {
      this.startAIWithoutProjectMatch(null);
    }

    await this.startFlow();
  }

  async getUserTemplates(): Promise<UserTemplate[]> {

    const res = await firstValueFrom(
      this.apiService.postAPI<GetUserTemplatesResponse, any>(
        'api/user/getUserTemplates',
        { clientEnquryId: this.projectsData.clientEnquryId }
      )
    );

    if (res.success && res.templateExists) {
      this.templateExists = true;
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

    if (!this.projectsData.projectId) return

    if (socket_id) {
      this.setBuildFlow('initial');
      this.startBuildProgressTimers();
    }

    const payload = {
      project_id: this.projectsData.projectId,
      project_description: this.projectsData.projectDescription,
      project_type: this.projectsData.projectType,
      clientEnquryId: this.projectsData.clientEnquryId,
      socket_id,
      design_no: this.designOrder.length + 1,
      excludeVariations: this.usedVariations
    };

    this.apiService
      .postAPI<any, any>('api/user/generateProjectCode', payload)
      .subscribe((res: any) => {

        this.isReactBuilding = true;

        const templateId = res.data.templateId;
        const proxyUrl = this.getPreviewProxyUrl(templateId);

        // 🔹 track variation
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
          url: proxyUrl, // ✅ store proxy instead of real URL
          user_template_id: res.data.templateId || null, // depends on backend
          variation_no: res.data.variation
        });

        this.activeDesignId = designId;

        if (socket_id) {
          this.pendingPreviewUrl = proxyUrl;
          this.isIframeLoading = true;
        } else {
          this.isIframeLoading = true;
          this.safePreviewUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(proxyUrl);
        }
        this.isReactBuilding = false;
        this.isTyping = false;
      });
  }


  startAIWithoutProjectMatch(socket_id: string | null) {
    if (socket_id) {
      this.setBuildFlow('initial');
      this.startBuildProgressTimers();
    }

    const payload = {
      prompt: this.finalSummary,
      inquiryPublicId: this.projectsData.clientEnquryId,
    };

    this.apiService
      .postAPI<any, any>('api/ai/generateProject', payload)
      .subscribe((res: any) => {

        this.isReactBuilding = true;
        const templateId = res.templateId;
        const proxyUrl = this.getPreviewProxyUrl(templateId);

        // 🔹 track variation
        if (res.variation) {
          this.usedVariations.push(res.variation);
        }

        this.designCount++;

        const designId = `design-${this.designCount}`;

        const snapshot: DesignSnapshot = {
          id: designId,
          label: `Template ${this.designCount}`,
          pages: res.pages || [],
          loginRedirect: res.login_redirect || null,
          createdAt: new Date(),
          previewType: 'html'
        };

        this.designMap.set(designId, snapshot);

        this.designOrder.push({
          designId,
          url: proxyUrl, // ✅ store proxy instead of real URL
          user_template_id: res.templateId || null, // depends on backend
          variation_no: res.variation
        });

        this.activeDesignId = designId;

        if (socket_id) {
          this.pendingPreviewUrl = proxyUrl;
          this.isIframeLoading = true;
        } else {
          this.isIframeLoading = true;
          this.safePreviewUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(proxyUrl);
        }
        this.isReactBuilding = false;
        this.isTyping = false;
      }, (err) => {
        this.toster.error('Failed to generate project. Please try again.');
        this.router.navigate(['/main']);
      });
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

    const jobId = ++this.frontendJobId;
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

    await this.addTerminal([
      'Updating src/components/header.jsx',
      'Restructuring the shared navigation shell'
    ], 1400, 1700);
    await this.addCodeBlock(this.getHeaderComponent());

    await this.addTerminal([
      'Updating src/pages/home.jsx',
      'Reworking the primary landing experience'
    ], 1400, 1700);
    await this.addCodeBlock(this.getHomePage());

    await this.addTerminal([
      'Updating src/styles/home.css',
      'Adjusting spacing, typography, and visual rhythm'
    ], 1400, 1700);
    await this.addCodeBlock(this.getHomeCSS());

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

    this.blocks.push({
      id: 'credentials',
      text: {
        label: 'Project Credentials',
        email: 'creative@gmail.com',
        password: 'Test@123',
        message: 'You can use these credentials to login to your project.'
      },
      done: true,
      timestamp: new Date()
    });

    setTimeout(() => this.scrollToBottom(true), 0);
    this.isTyping = false;
    this.startPreview(null);
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
    this.aiService.stop();

  }

  isNearBottom(): boolean {
    const el = this.chatScroll.nativeElement;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  scrollToBottom(force = false) {
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
  openModal() {

    console.log(this.selected_template_id);
    this.subscriptionModalService.open(this.selected_template_id);
  }

  openDeployModal(templateName: string) {
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
      case 'restore':
        return [
          { pendingIconClass: 'fa-regular fa-folder-open', label: 'Fetching saved templates' },
          { pendingIconClass: 'fa-regular fa-image', label: 'Loading draft preview' },
          { pendingIconClass: 'fa-solid fa-arrow-up-right-from-square', label: 'Opening selected template' }
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
    if (!templates || templates.length === 0) return;

    this.designOrder = [];
    this.designMap.clear();
    this.usedVariations = [];
    this.designCount = 0;

    templates.forEach((tpl, index) => {
      const designId = `design-${index + 1}`;

      // 🔹 Track variation
      if (tpl.variation_no) {
        this.usedVariations.push(tpl.variation_no);
      }

      const snapshot: DesignSnapshot = {
        id: designId,
        label: `Template ${index + 1}`,
        pages: [],
        loginRedirect: null,
        createdAt: new Date(),
        previewType: 'html'
      };

      this.designMap.set(designId, snapshot);
      // ✅ IMPORTANT: store template_id + variation
      this.designOrder.push({
        designId,
        url: this.getPreviewProxyUrl(tpl.public_template_id),
        user_template_id: tpl.public_template_id,
        variation_no: tpl.variation_no
      });

      this.designCount++;
    });

    // ✅ Set first template active
    const firstDesign = this.designOrder[0];

    if (firstDesign?.url) {
      this.activeDesignId = firstDesign.designId;
      this.isIframeLoading = true;

      this.safePreviewUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(firstDesign.url);
    }

    this.isReactBuilding = false;
    this.isTyping = false;
  }


  async showDraftWelcomeMessages() {

    const now = new Date();

    this.blocks = [];
    this.isReactBuilding = true;
    this.setBuildFlow('restore');
    this.setBuildStep(1);

    await this.addParagraphBlock(
      `I found previously generated templates for this project, and I'm restoring them into the workspace so you can continue review without starting over.`,
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

    await this.addCodeBlock({
      file: 'workspace/template-session.json',
      added: 12,
      removed: 0,
      content: [
        { line: 1, text: '{' },
        { line: 2, text: '  "status": "restored",' },
        { line: 3, text: '  "templates": ["Template 1", "Template 2"],' },
        { line: 4, text: '  "activePreview": "Template 1",' },
        { line: 5, text: '  "deploymentState": "ready"' },
        { line: 6, text: '}' }
      ]
    });

    await this.addParagraphBlock(
      `Your saved variations are now ready. You can review each template, request a fresh variation, customize the current direction, or move ahead when you're ready to deploy.`,
      2000
    );

    await this.addSummary({
      time: '24s',
      description: 'Restored your saved template workspace and reloaded the available preview variations.',
      highlights: ['Saved template restore', 'Draft previews loaded', 'Workspace ready']
    });

    this.blocks.push({
      id: 'credentials',
      text: {
        label: 'Project Credentials',
        email: 'creative@gmail.com',
        password: 'Test@123',
        message: 'You can use these credentials to login to your project.'
      },
      done: true,
      timestamp: now
    });

    this.appendBuildActionPrompt();
    setTimeout(() => this.scrollToBottom(true), 0);
    this.isReactBuilding = false;
    return;
  }

  appendBuildActionPrompt() {
    if (this.skipBuildPrompt) {
      return;
    }

    this.blocks = this.blocks.filter(block => block?.id !== 'action-prompt-build');

    this.blocks.push({
      id: 'action-prompt-build',
      text: {
        message: 'Do you want me to continue with the next step? Choose one option below.',
        options: [
          {
            id: 'regenerate_template',
            title: 'Generate New Template',
            description: 'Create another variation with a fresh layout and styling direction.'
          },
          {
            id: 'customize_template',
            title: 'Customize This Template',
            description: 'Refine this version further based on your preferred changes and requirements.'
          },
          {
            id: 'deploy_template',
            title: 'Deploy to Production',
            description: 'Use this template as the final version and continue to deployment.'
          }
        ]
      },
      done: true,
      timestamp: new Date()
    });

    setTimeout(() => this.scrollToBottom(true), 0);
  }

  handleChatAction(actionId: string) {
    if (actionId === 'regenerate_template') {
      this.regenerate();
      return;
    }

    if (actionId === 'customize_template') {
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

      setTimeout(() => this.scrollToBottom(true), 0);
      return;
    }

    if (actionId === 'deploy_template') {
      if (!this.subscriptionPlan.canDeploy) {
        this.toster.error('Your current plan does not include deployment. Please upgrade your plan to deploy this template.');
        this.subscriptionModalService.open();
        return;
      }
      this.openDeployModal('1');
      return;
    }

    if (actionId === 'upgrade_plan') {
      this.openModal();
      return;
    }
  }

  handlePromptSubmitted(event: Event | { blockId: string; value: string }) {
    const promptEvent = event as { blockId?: string; value?: string };

    if (!promptEvent?.value?.trim()) return;

    this.blocks = this.blocks.filter(block => block?.id !== promptEvent.blockId);

    this.blocks.push({
      id: `user-message-customize-${Date.now()}`,
      text: promptEvent.value,
      done: true,
      timestamp: new Date()
    });

    this.blocks.push({
      id: `inline-cta-customize-${Date.now()}`,
      text: {
        message: 'Your current plan does not include direct template customization requests. Upgrade your plan to continue with guided revisions for this template.',
        buttonLabel: 'Upgrade Plan',
        actionId: 'upgrade_plan'
      },
      done: true,
      timestamp: new Date()
    });

    setTimeout(() => this.scrollToBottom(true), 0);
  }


  checkNDeploy() {

    if (this.subscriptionPlan.planType === 'free') {
      this.openModal();
      return;
    }
    console.log(this.designOrder);

    const activeDesign = this.designOrder.find(
      d => d.designId === this.activeDesignId
    );

    if (!activeDesign) {
      console.error("No active design found");
      return;
    }

    this.selected_template_id = activeDesign.user_template_id;

    this.deployProject(this.selected_template_id)

  }

  setPreviewUrl(url: string) {
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getPreviewProxyUrl(templateId: string) {
    const apiBaseUrl = this.apiService.apiUrl.replace(/\/$/, '');
    return `${apiBaseUrl}/api/user/generate/${templateId}`;
  }

  deployProject(selected_template_id: string) {
    this.apiService
      .postAPI('api/user/tempalteDeployed', {
        publicTemplateId: selected_template_id,
        publicInquiryId: this.projectsData.clientEnquryId
      })
      .subscribe((res: any) => {
        if (res.success) {
          this.router.navigate([`/dashboard`]);
        }
      });
  }

  switchDesign(designId: string) {
    if (this.activeDesignId === designId) return;

    this.activeDesignId = designId;

    const design = this.designOrder.find(d => d.designId === designId);

    if (design?.url) {
      this.startQuickBuildProgress('switch');
      this.isIframeLoading = true;

      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(design.url);
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

            this.safePreviewUrl =
              this.sanitizer.bypassSecurityTrustResourceUrl(newActive.url);
          } else {
            this.activeDesignId = '';
            this.safePreviewUrl = null;
          }
        },

        error: (err) => {
          console.error('❌ Delete failed:', err);
          this.toster.error('Failed to delete template');
        }
      });
  }


  async startFlow() {
    this.blocks = [];
    const projectTypeName = this.getProjectTypeDisplayName();
    const previewPages = this.getPreviewPageNames();
    const primaryPageName = previewPages[0] || 'Home';

    // 🔹 Connection / Init
    await this.playStatusSequence([
      'Reconnecting... 1/5',
      'Reconnecting... 2/5',
      'Reconnecting... 3/5',
      'Reconnecting... 4/5',
      'Reconnecting... 5/5'
    ], 950, 1200);

    await this.addParagraphBlock(
      `Connection is stable again, so I'm starting the first build pass now. I'll quickly inspect the workspace to see whether there's an existing React structure I should continue from, or whether I should set up the project from scratch.`,
      2600
    );

    // 🔍 Inspect workspace
    await this.addTerminal([
      'Ran git status --short',
      'Ran Get-ChildItem -Force'
    ], 1500, 1700);

    await this.addParagraphBlock(
      `The workspace looks empty and there’s no existing Git context I can rely on. I’ll proceed by creating a fresh React structure instead of trying to extend anything.`,
      2300
    );

    // 🔍 File scan fallback
    await this.addTerminal([
      'Ran rg --files for 1s',
      'Ran cmd /c dir'
    ], 1500, 1800);

    await this.addParagraphBlock(
      `Confirmed — no project files exist here. I’ll initialize a lightweight React setup using a Vite-style structure and then layer routing and pages on top.`,
      2500
    );

    // 🔍 Node check
    await this.addTerminal([
      'Ran node -v',
      'Ran npm -v'
    ], 1500, 1800);

    await this.addParagraphBlock(
      `Node is available, but npm seems to have a shell-related execution issue. I’ll locate the actual executable paths and try to bypass the failing entrypoint.`,
      2600
    );

    // 🔍 Fix npm
    await this.addTerminal([
      'Ran cmd /c where npm',
      'Ran cmd /c where npm.cmd',
      'Ran cmd /c where npx'
    ], 1500, 1800);

    await this.addParagraphBlock(
      `Found Windows command shims (npm.cmd / npx.cmd). These should work even if the default npm script is broken. I’ll use these to proceed safely.`,
      2400
    );

    await this.addTerminal([
      'Ran cmd /c npx.cmd -v',
      'Ran cmd /c npm.cmd -v'
    ], 1500, 1700);

    await this.addParagraphBlock(
      `Environment looks usable now. I’ll start building the application structure manually and wire up routing, shared layout, and core pages for this ${projectTypeName} project.`,
      2500
    );

    // 🧠 Plan
    await this.addParagraphBlock(
      `Here’s the plan:

    - Create a clean React + Vite style structure
    - Add core ${projectTypeName} pages (${previewPages.join(', ')})
    - Configure react-router-dom for navigation
    - Build reusable layout (Header, Footer)
    - Add basic styling to unify the UI
    - Keep everything modular and scalable`,
      3000
    );

    // 🔥 APP SETUP
    await this.addTerminal([
      'Creating src/App.js',
      'Configuring route structure and layout shell'
    ], 1700, 1900);

    await this.addCodeBlock(this.getAppJs());

    await this.addParagraphBlock(
      `App component now defines the main routing structure and wraps all pages with a shared layout. This ensures consistent navigation and UI across screens.`,
      2400
    );

    // 🔥 HOME
    await this.addTerminal([
      'Creating src/pages/home.jsx',
      `Building the ${primaryPageName.toLowerCase()} entry experience`
    ], 1700, 1900);

    await this.addCodeBlock(this.getHomePage());

    await this.addParagraphBlock(
      `${primaryPageName} page acts as the entry point of the experience. I’ve added a clear hero section and supporting copy so the initial screen can adapt to different product categories and use cases.`,
      2400
    );

    // 🔥 LOGIN
    await this.addTerminal([
      'Creating src/pages/login.jsx',
      'Adding authentication form layout'
    ], 1700, 1900);

    await this.addCodeBlock(this.getLoginPage());

    await this.addParagraphBlock(
      `Login page includes a simple form structure with email and password inputs. It’s designed to be easily extendable for real authentication logic.`,
      2300
    );

    // 🔥 SIGNUP
    await this.addTerminal([
      'Creating src/pages/signup.jsx',
      'Adding user registration flow'
    ], 1700, 1900);

    await this.addCodeBlock(this.getSignupPage());

    await this.addParagraphBlock(
      `Signup flow mirrors the login experience for consistency, with additional fields for account creation.`,
      2200
    );

    // 🔥 HEADER
    await this.addTerminal([
      'Creating src/components/header.jsx',
      'Building shared navigation component'
    ], 1700, 1900);

    await this.addCodeBlock(this.getHeaderComponent());

    await this.addParagraphBlock(
      `Header component provides global navigation across all pages. It’s reusable and connected to routing for seamless transitions.`,
      2300
    );

    // 🔥 CSS
    await this.addTerminal([
      'Creating src/styles/home.css',
      'Applying layout spacing and typography'
    ], 1700, 1900);

    await this.addCodeBlock(this.getHomeCSS());

    await this.addParagraphBlock(
      `Basic styling is added to ensure visual consistency across the application. Focus is on spacing, typography, and layout clarity.`,
      2300
    );

    // 🔍 FINAL CHECK
    await this.addTerminal([
      'Reviewing generated files',
      'Validating routing and structure'
    ], 1600, 2100);

    await this.addParagraphBlock(
      `All core pieces are now in place — routing, pages, layout, and styling. The project is structured in a scalable way and ready for further feature expansion like APIs, workflows, dashboards, or domain-specific modules.`,
      2600
    );

    await this.addParagraphBlock(
      `The foundation is ready. I'm building the first preview now so you can review the generated template in the workspace.`,
      1800
    );

    this.setBuildFlow('initial');
    this.setBuildStep(1);
    await this.addTerminal([
      'Installing dependencies',
      'Preparing preview build'
    ], 1200, 1300);



    this.setBuildStep(2);
    await this.addTerminal([
      'Building React application',
      'Bundling generated UI assets'
    ], 1200, 1300);

    this.setBuildStep(3);
    await this.addTerminal([
      'Deploying preview',
      'Opening first template tab'
    ], 1200, 1500);

    // 🔹 SUMMARY
    await this.addSummary({
      time: '2m 42s',
      description: 'Generated complete React frontend with routing, reusable layout, and core pages',
      highlights: [
        'App.js (routing)',
        `${previewPages.slice(0, 3).join(', ')} pages`,
        'Header component',
        'Base CSS styling'
      ]
    });


    this.startPreview(null);

    this.appendBuildActionPrompt();
  }

  getAppJs() {
    return {
      file: 'src/App.js',
      added: 35,
      removed: 0,
      content: [
        { line: 1, text: 'import { Routes, Route } from "react-router-dom";' },
        { line: 2, text: 'import Home from "./pages/home";' },
        { line: 3, text: 'import Login from "./pages/login";' },
        { line: 4, text: 'import Signup from "./pages/signup";' },
        { line: 6, text: 'function App() {' },
        { line: 7, text: '  return (' },
        { line: 8, text: '    <Routes>' },
        { line: 9, text: '      <Route path="/" element={<Home />} />' },
        { line: 10, text: '      <Route path="/login" element={<Login />} />' },
        { line: 11, text: '      <Route path="/signup" element={<Signup />} />' },
        { line: 12, text: '    </Routes>' },
        { line: 13, text: '  );' },
        { line: 14, text: '}' },
        { line: 16, text: 'export default App;' }
      ]
    };
  }

  getHomePage() {
    const projectTypeName = this.getProjectTypeDisplayName();
    return {
      file: 'src/pages/home.jsx',
      added: 40,
      removed: 0,
      content: [
        { line: 1, text: 'import "../styles/home.css";' },
        { line: 3, text: 'export default function Home() {' },
        { line: 4, text: '  return (' },
        { line: 5, text: '    <div className="home">' },
        { line: 6, text: `      <h1>Welcome to Your ${projectTypeName} Project</h1>` },
        { line: 7, text: '      <p>Start with a flexible foundation tailored to your goals</p>' },
        { line: 8, text: '    </div>' },
        { line: 9, text: '  );' },
        { line: 10, text: '}' }
      ]
    };
  }

  getLoginPage() {
    return {
      file: 'src/pages/login.jsx',
      added: 45,
      removed: 0,
      content: [
        { line: 1, text: 'export default function Login() {' },
        { line: 2, text: '  return (' },
        { line: 3, text: '    <div>' },
        { line: 4, text: '      <h2>Login</h2>' },
        { line: 5, text: '      <input placeholder="Email" />' },
        { line: 6, text: '      <input placeholder="Password" />' },
        { line: 7, text: '      <button>Login</button>' },
        { line: 8, text: '    </div>' },
        { line: 9, text: '  );' },
        { line: 10, text: '}' }
      ]
    };
  }

  getSignupPage() {
    return {
      file: 'src/pages/signup.jsx',
      added: 50,
      removed: 0,
      content: [
        { line: 1, text: 'export default function Signup() {' },
        { line: 2, text: '  return (' },
        { line: 3, text: '    <div>' },
        { line: 4, text: '      <h2>Signup</h2>' },
        { line: 5, text: '      <input placeholder="Name" />' },
        { line: 6, text: '      <input placeholder="Email" />' },
        { line: 7, text: '      <button>Create Account</button>' },
        { line: 8, text: '    </div>' },
        { line: 9, text: '  );' },
        { line: 10, text: '}' }
      ]
    };
  }

  getHeaderComponent() {
    const projectTypeName = this.getProjectTypeDisplayName();
    return {
      file: 'src/components/header.jsx',
      added: 30,
      removed: 0,
      content: [
        { line: 1, text: 'export default function Header() {' },
        { line: 2, text: '  return (' },
        { line: 3, text: '    <header>' },
        { line: 4, text: `      <h1>${projectTypeName} App</h1>` },
        { line: 5, text: '    </header>' },
        { line: 6, text: '  );' },
        { line: 7, text: '}' }
      ]
    };
  }

  private getProjectTypeDisplayName(): string {
    const rawProjectType = this.projectsData?.projectType;

    if (typeof rawProjectType !== 'string' || !rawProjectType.trim()) {
      return 'web';
    }

    return rawProjectType
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getPreviewPageNames(): string[] {
    const rawProjectType = String(this.projectsData?.projectType || '').trim().toLowerCase();

    if (!rawProjectType) {
      return this.genericPreviewPages;
    }

    return this.projectTypePageMap[rawProjectType] || this.genericPreviewPages;
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

  async addParagraphBlock(text: string, waitAfter = 2200) {
    const block = {
      id: `paragraph-${Date.now()}-${this.blocks.length}`,
      text: '',
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

    await this.delay(900);

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
        await this.delay(char === ' ' ? 10 : 16);
      }

      setTimeout(() => this.scrollToBottom(true), 0);
      await this.delay(180);
    }

    await this.delay(1400);
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

  closeSubscriptionModal(): void {
    this.subscriptionModalService.close();
  }

}



