import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, Renderer2, ViewChild } from '@angular/core';
import { FormsModule, FormBuilder } from '@angular/forms';
import { SafeHtml, DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, filter, take, firstValueFrom } from 'rxjs';
import { GenerateTemplateResponse } from '../../../../models/generatePreview';
import { SubscriptionResponse } from '../../../../models/subcription';
import { UserTemplate, GetUserTemplatesResponse } from '../../../../models/userTemplate';
import { AiSocketService } from '../../../../services/ai-socket.service';
import { ApiService } from '../../../../services/api.service';
import { SubcriptionPageComponent } from '../../subcription-page/subcription-page.component';
import { ReactCodeEditorComponent } from '../react-code-editor/react-code-editor.component';
import { AiDevRendererComponent } from '../ai-dev-renderer/ai-dev-renderer.component';


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
declare var bootstrap: any;
@Component({
  selector: 'app-react-build-preview',
  standalone: true,
  imports: [CommonModule, ScrollingModule, SubcriptionPageComponent, ReactCodeEditorComponent, NzSelectModule, FormsModule, RouterLink, AiDevRendererComponent],
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
  designMap = new Map<string, DesignSnapshot>();
  designOrder: any[] = [];   // keeps tab order
  activeDesignId!: string;
  hasMarkedFirstBlock = false;
  showModal = false;
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
  buildSteps = [
    'Installing dependencies (npm install)',
    'Building React application (npm run build)',
    'Deploying preview'
  ];
  planName = 'Free Plan';
  usedVariations: any[] = [];
  pendingPreviewUrl: string | null = null;

  // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private el: ElementRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private aiService: AiSocketService,
    private router: Router, private ngZone: NgZone, private fb: FormBuilder,
    private toster: NzMessageService
  ) {
    this.baseURl = this.apiService.apiUrl;
  }

  async ngOnInit() {
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
      this.showDraftWelcomeMessages();
      await this.loadDraftTemplates(templates);
      return; // ⛔ stop fresh flow
    }

    // ============================================
    // ✅ 2. SOCKET READY → START AI FLOW
    // ============================================

    this.aiService.socketReady$
      .pipe(
        filter(id => !!id),
        take(1)
      )
      .subscribe(socket_id => {

        // 🔹 Listen AI stream blocks
        this.aiService.listen((blocks) => {
          this.blocks = blocks;

          setTimeout(() => this.scrollToBottom(), 0);

          const last = blocks[blocks.length - 1];

          // ============================================
          // ✅ CODE TAB SWITCH
          // ============================================
          if (
            last?.id === 'status-code-running' &&
            last?.done &&
            this.files.length > 0
          ) {
            this.showCodeButton = true;
            this.previewCodeShow = true;

            const el = document.getElementById('pills-profile-tab');
            if (el) {
              el.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              }));
            }

            this.builds.push({
              buildId: this.currentBuildId,
              blocks: JSON.parse(JSON.stringify(this.blocks)),
              createdAt: new Date()
            });
          }
        });

        // ============================================
        // ✅ FINAL EVENT → LOAD IFRAME ONLY HERE
        // ============================================
        this.aiService.socket.on('ai:done', () => {

          this.isTyping = false;

          if (this.pendingPreviewUrl) {
            this.safePreviewUrl =
              this.sanitizer.bypassSecurityTrustResourceUrl(this.pendingPreviewUrl);

            this.pendingPreviewUrl = null;
          }

          this.isReactBuilding = false;
          this.isIframeLoading = false;

          // 🔁 Switch to preview tab AFTER iframe ready
          setTimeout(() => {
            const el = document.getElementById('pills-home-tab');
            if (el) {
              el.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              }));
            }
          }, 200);
        });

        // ============================================
        // 🔥 START PREVIEW (API CALL)
        // ============================================
        this.startPreview(socket_id!);
      });
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

        this.setBuildStep(1);

        setTimeout(() => this.setBuildStep(2), 10000);
        setTimeout(() => this.setBuildStep(3), 15000);

        const url = res.data.buildUrl;

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

        // ✅ store everything
        this.designOrder.push({
          designId,
          url,
          user_template_id: res.data.templateId || null, // depends on backend
          variation_no: res.data.variation
        });

        this.activeDesignId = designId;

        if (socket_id) {
          this.pendingPreviewUrl = url;   // ✅ only store
          this.isIframeLoading = true;
        } else {
          this.isIframeLoading = true;
          // ✅ SAFE iframe binding
          this.safePreviewUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(url);
        }


        this.isReactBuilding = false;
        this.isTyping = false;
      });
  }


  async regenerate() {

    if (this.isTyping) return;
    if (this.designOrder.length >= this.subscriptionPlan.template_limit) {
      this.toster.error(`You have reached the maximum limit of ${this.subscriptionPlan.template_limit} templates.`);
      return;
    }

    this.setBuildStep(0);
    this.isReactBuilding = true;

    this.clearFirstBlockMinHeight();
    this.isTyping = true;

    const jobId = ++this.frontendJobId;
    this.currentBuildId++;

    const commands = this.aiService.getRegenCommands(this.currentBuildId);

    setTimeout(() => this.scrollToBottom(), 0);

    /* ---------- INTRO ---------- */

    await this.streamFrontendParagraph(
      `regen-intro-${this.currentBuildId}`,
      `Let’s redesign your application with a fresh visual direction.
    I’ll refine the layout, improve spacing, and enhance the styling for a cleaner experience.`,
      jobId, 1
    );

    /* ---------- UI CHANGES ---------- */

    await this.streamFrontendBlock(`cmd-ui-${this.currentBuildId}-1`, commands[0], jobId);
    await this.delay(600);

    await this.streamFrontendBlock(`cmd-ui-${this.currentBuildId}-2`, commands[1], jobId);
    await this.delay(700);

    await this.streamFrontendBlock(`cmd-ui-${this.currentBuildId}-3`, commands[2], jobId);
    await this.delay(800);

    /* ---------- NEW MESSAGE 1 ---------- */

    await this.streamFrontendParagraph(
      `regen-build-prep-${this.currentBuildId}`,
      `The design updates are complete.
    I'm now preparing the production-ready React build for deployment.`,
      jobId, 2
    );

    await this.delay(600);

    this.setBuildStep(1);
    await this.delay(3000);

    /* ---------- NEW MESSAGE 2 ---------- */

    await this.streamFrontendParagraph(
      `regen-build-start-${this.currentBuildId}`,
      `This may take a moment as dependencies are installed, the application is compiled,
    and the preview is deployed securely.`,
      jobId, 2
    );
    setTimeout(() => this.setBuildStep(2), 1000);
    await this.delay(10000);

    setTimeout(() => this.setBuildStep(3), 1000);
    await this.delay(10000);

    const credentials = {
      id: 'credentials',
      text: {
        label: 'Project Credentials',
        email: 'creative@gmail.com',
        password: 'Test@123',
        message: 'You can use these credentials to login to your project.'
      },
      done: true,
      timestamp: new Date()
    }

    this.blocks.push(credentials);

    this.isTyping = false;
    this.startPreview(null);




  }


  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async streamFrontendBlock(
    blockId: string,
    text: string,
    jobId: number
  ) {

    this.clearFirstBlockMinHeight();
    let block = this.blocks.find(b => b.id === blockId);

    if (!block) {
      block = { id: blockId, text: '', done: false, timestamp: new Date() };
      this.blocks.push(block);
      setTimeout(() => {
        this.scrollToBottom();
      }, 0);
    }

    let buffer = '';

    for (const char of text) {
      // 🛑 CANCEL if new regenerate started
      if (jobId !== this.frontendJobId) return;
      buffer += char;
      block.text = buffer;

      await this.delay(40);
    }
    block.done = true;
  }

  async streamFrontendParagraph(
    blockId: string,
    text: string,
    jobId: number,
    order: number
  ) {
    const isFirst = order === 1 && !this.hasMarkedFirstBlock;
    let block = {
      id: blockId,
      text: '',
      done: false,
      timestamp: new Date(),
      isFirstOfRegenerate: isFirst
    };
    // 🔥 mark first block only once
    if (isFirst && order === 1) {
      this.hasMarkedFirstBlock = true;
    }

    this.blocks.push(block);
    setTimeout(() => {
      this.scrollToBottom(true);
    }, 0);
    let buffer = '';

    for (const char of text) {
      if (jobId !== this.frontendJobId) return;
      buffer += char;
      block.text = buffer;
      await this.delay(35);
    }

    block.done = true;
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
    this.isIframeLoading = false;
  }


  getUserSubscriptionPlan() {
    this.apiService.getApi<SubscriptionResponse>(`api/user/getMySubscription`)
      .subscribe({
        next: (res) => {
          console.log(res);
          this.subscriptionPlan = res;
          this.planName = res.planName
        },
        error: err => {
          // this.loading = false
        }
      });
  }

  // open modal
  openModal() {

    console.log(this.selected_template_id);

    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
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



  private reorderTemplates() {
    this.designOrder.forEach((item, index) => {
      const snapshot = this.designMap.get(item.designId);
      if (snapshot) {
        snapshot.label = `Template ${index + 1}`;
      }
    });
  }

  setBuildStep(step: number) {
    this.buildStep = step;
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
        url: tpl.react_build_url,
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






  showDraftWelcomeMessages() {

    const now = new Date();

    this.blocks = [
      {
        id: 'paragraph-1',
        text: 'Hi! I’ve loaded your saved project templates for you 😊',
        done: true,
        timestamp: now
      },
      {
        id: 'paragraph-2',
        text: 'Feel free to generate more variations if you’d like to explore new layouts or flows.',
        done: true,
        timestamp: now
      },
      {
        id: 'paragraph-3',
        text: 'When everything looks good, click Continue & Deploy to proceed.',
        done: true,
        timestamp: now
      },
      {
        id: 'credentials',
        text: {
          label: 'Project Credentials',
          email: 'creative@gmail.com',
          password: 'Test@123',
          message: 'You can use these credentials to login to your project.'
        },
        done: true,
        timestamp: now
      }
    ];
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
    this.activeDesignId = designId;

    const design = this.designOrder.find(d => d.designId === designId);

    if (design?.url) {
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

}
