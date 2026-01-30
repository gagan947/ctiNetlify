import { Component, ElementRef, Input, NgZone, Renderer2, signal, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { io } from 'socket.io-client';
import { AiSocketService } from '../../../services/ai-socket.service';
import { filter, Subject, take } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { CdkScrollable, ScrollingModule } from '@angular/cdk/scrolling';
import { PlanDeliveryComponent } from '../plan-delivery/plan-delivery.component';
import { SubcriptionPageComponent } from "../subcription-page/subcription-page.component";
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { ReactCodeEditorComponent } from './react-code-editor/react-code-editor.component';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';

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

interface ReactFile {
  id: string;
  name: string;          // ProductListing.jsx
  language: 'javascript' | 'css';
  fullCode: string;
}
declare var bootstrap: any;

@Component({
  selector: 'app-ai-preview',
  standalone: true,
  imports: [CommonModule, ScrollingModule, SubcriptionPageComponent, ReactCodeEditorComponent, NzSelectModule, FormsModule, RouterLink],
  templateUrl: './ai-preview.component.html',
  styleUrl: './ai-preview.component.css'
})
export class AiPreviewComponent {
  
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
  fullScreen: boolean = false;;
  showCodeButton = false;
  userHasScrolled = false;
  designCount = 0;
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
  baseURl :any;
  previewUrl: any = null;
  isReactBuilding = true;
  buildStep = 0;

  buildSteps = [
    'Installing dependencies (npm install)',
    'Building React application (npm run build)',
    'Deploying preview'
  ];
  

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

  ngOnInit() {
    this.blocks = [];
    window.addEventListener('message', this.previewListener);

    this.aiService.socketReady$
      .pipe(
        filter(id => !!id),
        take(1)
      )
      .subscribe(socket_id => {

        this.aiService.listen((blocks) => {

          this.blocks = blocks;
          setTimeout(() => {
            this.scrollToBottom();
          }, 0);


          const last = blocks[blocks.length - 1];
          if (last?.id === 'status-code-running' && last?.done && this.files.length > 0) {
            
           
            this.showCodeButton = true;
            this.previewCodeShow = true;
            const el = document.getElementById('pills-profile-tab');
            if (!el) return;

            const event = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });

            el.dispatchEvent(event);


            // snapshot current build
            this.builds.push({
              buildId: this.currentBuildId,
              blocks: JSON.parse(JSON.stringify(this.blocks)),
              createdAt: new Date()
            });
          } else if (last?.id === 'paragraph-preview-ready' && last?.done) {
          
            this.isTyping = false;
            const el = document.getElementById('pills-home-tab');
            if (!el) return;

            const event = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });

            el.dispatchEvent(event);
          }
        });

        // 🔥 CALL API ONCE
        this.startPreview(socket_id!);
      });
  }
  ngAfterViewInit() {
    this.scrollToBottom(true);
  }
  onUserScroll() {
    this.userHasScrolled = true;
  }

  startPreview(socket_id: string | null) {

    const projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);

    const subFeatureIds: any[] = [];
    this.projectsData.selectdFeature.forEach((items: any) => {
      items.subFeatures.forEach((sub: any) => {
        subFeatureIds.push(sub.id);
      });
    });

    const payload = {
      project_id: this.projectsData.projectId,
      project_description: this.projectsData.projectDescription,
      sub_features: subFeatureIds,
      project_type: this.projectsData.projectType,
      clientEnquryId: this.projectsData.clientEnquryId,
      socket_id,
      design_no: this.designOrder.length + 1
    };

    this.apiService
      .postAPI('api/user/generatePreview', payload)
      .subscribe((res: any) => {
       // ✅ always map first
       const designId = this.mapDesignFromResponse(res);

      // (optional) your JSX file logic
      const { forgot_password } = res.data.react_files;
      const react_files = { forgot_password };

      this.files = [];

      Object.entries(react_files).forEach(([page, data]: any) => {
        this.files.push({
          id: `${page}-jsx`,
          name: `${page}.jsx`,
          language: 'javascript',
          fullCode: data.jsx
        });
      });
      
      // ✅ Now build React preview for THIS design
      this.buildReactPreview(res.data.user_template_id, designId);
     
      });
  }



  /** ================= CSS INJECTION ================= */

  injectCSS(css: string) {
    if (this.styleTag) {
      document.head.removeChild(this.styleTag);
    }

    this.styleTag = this.renderer.createElement('style');
    this.styleTag.innerHTML = css;
    document.head.appendChild(this.styleTag);
  }

 

  onPreviewMessage(data: any, event: any) {
   
    /* LOGIN ACTION */
    if (data.action === 'login' && this.loginRedirect) {
      this.loadPageFromDesign(this.activeDesignId, this.loginRedirect);
      return;
    }

    /* FOLLOW TOGGLE */

    if (data.followToggle && this.activeJsKeys.includes('FOLLOW_TOGGLE')) {
      this.handleFollowToggle();
      return;
    }

    /* ACTIVE MENU */
    if (data.menuKey) {
      this.activeMenuKey = data.menuKey;
      this.updateActiveMenuUI();
    }

    /* NAVIGATION */
    if (!this.designMap.has(this.activeDesignId)) return;
    const design = this.designMap.get(this.activeDesignId)!;
    this.pages = design.pages;

    if (data.subFeature && this.pages[data.subFeature]) {
      this.loadPageFromDesign(this.activeDesignId, data.subFeature);
      return;
    }
  };

  previewListener = (event: any) => {
    if (event.data?.type === 'preview-click') {
      this.onPreviewMessage(event.data, event);
    }
  };


  /** ================= FOLLOW / FOLLOWING ================= */

  handleFollowToggle() {
    const iframe = this.previewFrame.nativeElement as HTMLIFrameElement;
    iframe.contentWindow?.postMessage(
      { type: 'toggle-follow' },
      '*'
    );
  }


  updateActiveMenuUI() {
    const iframe = this.previewFrame.nativeElement;
    const doc = iframe.contentDocument;
    if (!doc || !this.activeMenuKey) return;

    const previewRoot = doc.querySelector('.preview-wrapper') as HTMLElement;
    if (!previewRoot) return;

    previewRoot
      .querySelectorAll('.menu-item.active')
      .forEach(el => el.classList.remove('active'));

    previewRoot
      .querySelectorAll(`.menu-item[data-menu-key="${this.activeMenuKey}"]`)
      .forEach(el => el.classList.add('active'));
  }
  async regenerate() {

    if (this.isTyping) return;
  
    if (this.designOrder.length >= 5) {
      this.toster.error('You have reached the maximum limit of 5 design variations.');
      return;
    }
  
    this.setBuildStep(0);
    this.startPreview(null);
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
  
    /* ---------- NEW MESSAGE 2 ---------- */
  
    await this.streamFrontendParagraph(
      `regen-build-start-${this.currentBuildId}`,
      `This may take a moment as dependencies are installed, the application is compiled,
  and the preview is deployed securely.`,
      jobId, 2
    );
  
    this.isTyping = false;
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
    window.removeEventListener('message', this.previewListener);
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

  // handleGenerateResponse(res: any): string {

  //   const user_template_id = res.data.user_template_id;
  
  //   this.designCount++;
  
  //   const designId = `design-${this.designCount}`;
  
  //   const snapshot: DesignSnapshot = {
  //     id: designId,
  //     label: `Template ${this.designCount}`,
  //     pages: res.data.pages,
  //     loginRedirect: res.data.login_redirect,
  //     createdAt: new Date(),
  //     previewType: 'html'
  //   };
  
  //   this.designMap.set(designId, snapshot);
  
  //   this.designOrder.push({
  //     designId,
  //     user_template_id
  //   });
  
  //   this.activeDesignId = designId;
  
  //   const firstKey = Object.keys(snapshot.pages)[0];
  //   if (firstKey) {
  //     this.loadPageFromDesign(designId, firstKey);
  //   }
  
  //   return designId; // 🔥 IMPORTANT
  // }

  renderHtmlPreview(designId: string) {

    const design = this.designMap.get(designId);
    if (!design) return;
  
    const firstKey = Object.keys(design.pages)[0];
    if (firstKey) {
      this.loadPageFromDesign(designId, firstKey);
    }
  
  }
  
  


  buildReactPreview(templateId: number, designId: string) {

    this.isReactBuilding = true;
  
   // start step 1 immediately
   this.setBuildStep(1);

   // step 2 after 1.5s
   const step2Timer = setTimeout(() => {
     this.setBuildStep(2);
   }, 10000);
 
   // step 3 after 3s
   const step3Timer = setTimeout(() => {
     this.setBuildStep(3);
   }, 15000);
 
    this.apiService
      .postAPI('api/user/buildReactPreview', { templateId })
      .subscribe({
  
        next: (res: any) => {
  
          this.isReactBuilding = false;
  
          if (res.success) {
  
            const fullUrl =
              this.baseURl.replace(/\/$/, '') + '/' +
              res.message.preview_url.replace(/^\//, '');
  
            const design = this.designMap.get(designId);
            if (!design) return;
  
            design.previewType = 'react';
            design.reactPreviewUrl = fullUrl;
  
            this.designMap.set(designId, design);
  
            this.loadReactPreview(fullUrl);
  
          } else {
  
            // ❌ React failed → fallback to HTML
            this.renderHtmlPreview(designId);
          }
        },
  
        error: () => {
          this.isReactBuilding = false;
          // ❌ React error → fallback to HTML
          this.renderHtmlPreview(designId);
        }
      });
  }
  

  mapDesignFromResponse(res: any): string {

    const user_template_id = res.data.user_template_id;
  
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
      user_template_id
    });
  
    this.activeDesignId = designId;
  
    return designId;
  }
  
  

  loadReactPreview(url: string) {
    const iframe = this.previewFrame.nativeElement;
    iframe.src = 'about:blank';
    setTimeout(() => iframe.src = url + '?t=' + Date.now(), 30);
  }
  
  
  
  

  switchDesign(designId: string) {

    const design = this.designMap.get(designId);
    
    if (!design) return;
  
    this.activeDesignId = designId;
  
    // 👉 React preview
    if (design.previewType === 'react' && design.reactPreviewUrl) {
  
      this.loadReactPreview(design.reactPreviewUrl);
      return; // 🔥 important: stop here
    }
  
    // 👉 HTML preview
    const firstKey = Object.keys(design.pages)[0];
    if (firstKey) {
      this.loadPageFromDesign(designId, firstKey);
    }
  }
  
  
  

  loadPageFromDesign(designId: string, key: string) {

    const design = this.designMap.get(designId);
    if (!design) return;

    const page = design.pages[key];
    if (!page) return;

    this.activeJsKeys = page.js_keys || [];
    this.activeMenuKey = key;

    const iframe = this.previewFrame.nativeElement as HTMLIFrameElement;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // 🔥 RESET document completely
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
          <style>${page.css}</style>
        </head>
        <body>
          <div class="preview-wrapper">
            ${page.html}
          </div>
          <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.min.js"></script>
            <!-- 🔥 FOLLOW TOGGLE HANDLER -->
          <script>
      window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'toggle-follow') {
          const btn = document.querySelector('[data-follow-toggle]');
          if (!btn) return;

          btn.classList.toggle('is-following');
          btn.textContent = btn.classList.contains('is-following')
            ? 'Following'
            : 'Follow';
        }
      });
          </script>
        </body>
      </html>
    `);
    doc.close();

    // 🔥 WAIT for DOM + scripts
    this.waitForIframeReady(iframe, true);

    setTimeout(() => this.updateActiveMenuUI(), 50);
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


  waitForIframeReady(
    iframe: HTMLIFrameElement,
    scrollToTop = false
  ) {
    const win = iframe.contentWindow as any;
    const doc = iframe.contentDocument;
    if (!win || !doc) return;

    const checkReady = () => {
      if (doc.readyState !== 'complete') {
        requestAnimationFrame(checkReady);
        return;
      }

      // ✅ FORCE scroll to top
      if (scrollToTop) {
        this.forceIframeScrollTop(iframe);
      }

      // bind click once
      doc.removeEventListener('click', this.iframeClickHandler, true);
      doc.addEventListener('click', this.iframeClickHandler, true);

      // init bootstrap safely
      if (win.bootstrap) {
        this.initIframeBootstrap(iframe);
      } else {
        setTimeout(() => this.initIframeBootstrap(iframe), 50);
      }
    };

    checkReady();
  }


  forceIframeScrollTop(iframe: HTMLIFrameElement) {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // window scroll
        win.scrollTo(0, 0);

        // documentElement scroll
        doc.documentElement.scrollTop = 0;

        // body scroll (some browsers)
        doc.body.scrollTop = 0;
      });
    });
  }


  initIframeBootstrap(iframe: HTMLIFrameElement) {
    const win = iframe.contentWindow as any;
    const doc = iframe.contentDocument;
    if (!win || !doc || !win.bootstrap) return;

    const dropdowns = doc.querySelectorAll('[data-bs-toggle="dropdown"]');
    dropdowns.forEach(el => {
      win.bootstrap.Dropdown.getOrCreateInstance(el);
    });
  }

  private iframeClickHandler = (e: MouseEvent) => {
    const el = e.target as HTMLElement;

    window.postMessage(
      {
        type: 'preview-click',
        menuKey: el.closest('[data-menu-key]')?.getAttribute('data-menu-key'),
        action: el.closest('[data-action]')?.getAttribute('data-action'),
        subFeature: el.closest('[data-sub-feature]')?.getAttribute('data-sub-feature'),
        followToggle: !!el.closest('[data-follow-toggle]')
      },
      '*'
    );
  };


  // open modal
  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  startTyping() {
    // this.codeEditor.startTyping();
  }


  onCodeFinished() {

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

  removeDesign(item: any) {
    this.apiService
      .postAPI('api/user/deleteUserTemplate', {
        template_id: item.user_template_id,
        clientEnquryId: this.projectsData.clientEnquryId
      })
      .subscribe(() => {

        // remove from map
        this.designMap.delete(item.designId);
        this.designCount = this.designCount - 1;
        // remove from order
        this.designOrder = this.designOrder.filter(
          d => d.designId !== item.designId
        );

        // 🔥 reorder labels
        this.reorderTemplates();

        // handle active design safely
        if (!this.designMap.has(this.activeDesignId)) {
          this.activeDesignId = this.designOrder[0]?.designId || null;

          if (this.activeDesignId) {
            this.switchDesign(this.activeDesignId);
          }
        }
      });
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
  

}

