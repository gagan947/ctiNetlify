import { Component, ElementRef, NgZone, Renderer2, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { io } from 'socket.io-client';
import { AiSocketService } from '../../../services/ai-socket.service';
import { filter, Subject, take } from 'rxjs';
import { Router } from '@angular/router';
import { CdkScrollable, ScrollingModule } from '@angular/cdk/scrolling';

interface DesignSnapshot {
  id: string;                 // design-1, design-2
  label: string;              // Design 1, Design 2
  pages: any;                 // full pages object
  loginRedirect?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-ai-preview',
  standalone: true,
  imports: [CommonModule,ScrollingModule],
  templateUrl: './ai-preview.component.html',
  styleUrl: './ai-preview.component.css'
})
export class AiPreviewComponent {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('chatScroll', { static: false })
  chatScroll!: ElementRef<HTMLElement>;
  

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
  builds: any[] = [];
  currentBuildId = 1;
  parentBlock = []
  private destroy$ = new Subject<void>();
  isTyping = true;
  private frontendJobId = 0;
  designMap = new Map<string, DesignSnapshot>();
  designOrder: string[] = [];   // keeps tab order
  activeDesignId!: string;
  hasMarkedFirstBlock = false;
  // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private el: ElementRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private aiService: AiSocketService,
    private router: Router,private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.blocks = [];
    window.addEventListener('message', this.previewListener);

    this.aiService.socketReady$
      .pipe(
        filter(id => !!id),
        take(1) // 🔥 VERY IMPORTANT
      )
      .subscribe(socket_id => {

        // 🔥 start listening once
        this.aiService.listen((blocks) => {

          this.blocks = blocks;
          this.isNearBottom()
         

          const last = blocks[blocks.length - 1];
          if (last?.id === 'final' && last?.done) {
            this.previewShow = true;
            this.isTyping = false;

            // snapshot current build
            this.builds.push({
              buildId: this.currentBuildId,
              blocks: JSON.parse(JSON.stringify(this.blocks)),
              createdAt: new Date()
            });
          }
        });

        // 🔥 CALL API ONCE
        this.startPreview(socket_id!);
      });
  }
  isNearBottom(): boolean {
    // console.log("calling bootm");
    if (!this.chatScroll) return true;
  
    const el = this.chatScroll.nativeElement;
    console.log("el", el.scrollHeight - el.scrollTop - el.clientHeight < 120);
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }
  
  startPreview(socket_id: string  | null) {

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
      socket_id
    };

    this.apiService
      .postAPI('api/user/generatePreview', payload)
      .subscribe((res: any) => {
        this.handleGenerateResponse(res)
        // this.pages = res.data.pages;
        // this.loginRedirect = res.data.login_redirect;

        // const firstKey = Object.keys(this.pages)[0];
        // if (firstKey) this.loadPage(firstKey);
      });
  }



  /** ================= LOAD PAGE ================= */

  loadPage(key: string) {
    const page = this.pages[key];
    if (!page) return;

    this.activeJsKeys = page.js_keys || [];
    this.activeMenuKey = key;

    const iframe = this.previewFrame.nativeElement;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <!-- ✅ BOOTSTRAP CSS -->
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
          <style>${page.css}</style>
        </head>
        <body>
          <div class="preview-wrapper">
            ${page.html}
          </div>
    <!-- Optional Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
          <script>
            document.addEventListener('click', function(e) {
              const el = e.target;
  
              const payload = {
                type: 'preview-click',
                menuKey: el.closest('[data-menu-key]')?.getAttribute('data-menu-key'),
                action: el.closest('[data-action]')?.getAttribute('data-action'),
                subFeature: el.closest('[data-sub-feature]')?.getAttribute('data-sub-feature'),
                followToggle: !!el.closest('[data-follow-toggle]')
              };
  
              parent.postMessage(payload, '*');
            });
          </script>
        </body>
      </html>
    `);
    doc.close();

    // wait for iframe DOM
    setTimeout(() => this.updateActiveMenuUI(), 50);
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

  /** ================= CLICK HANDLER (CORE) ================= */

  // onPreviewClick(event: any) {
  //   const el = event.target as HTMLElement;
  //   if (!el) return;

  //    /* LOGIN ACTION */
  // const menuEl = el.closest('[data-menu-key]') as HTMLElement;
  // const action = el.closest('[data-action]')?.getAttribute('data-action');
  // if (action === 'login' && this.loginRedirect) {

  //   this.loadPage(this.loginRedirect);
  //   return;
  // }

  //   /* ---------------- FOLLOW TOGGLE ---------------- */
  //   if (this.activeJsKeys.includes('FOLLOW_TOGGLE')) {
  //     const followBtn = el.closest('[data-follow-toggle]') as HTMLElement;
  //     if (followBtn) {
  //       this.handleFollowToggle(followBtn);
  //       return; // ⛔ stop here (do not trigger navigation)
  //     }
  //   }
  //     // ACTIVE MENU
  // const menuKey = menuEl?.getAttribute('data-menu-key');
  // if (menuKey) {

  //   this.activeMenuKey = menuKey;
  //   this.updateActiveMenuUI();
  // }

  //   /* ---------------- NAVIGATION (YOUR EXISTING LOGIC) ---------------- */
  //   const feature = el
  //     .closest('[data-sub-feature]')
  //     ?.getAttribute('data-sub-feature');

  //   if (feature && this.pages[feature]) {
  //     this.loadPage(feature);
  //     return;
  //   }



  //   // For select dropdown navigation
  //   if (!feature && (el as any).selectedOptions) {
  //     const selected = (el as any).selectedOptions[0];
  //     const subFeature = selected?.dataset?.subFeature;
  //     if (subFeature && this.pages[subFeature]) {
  //       this.loadPage(subFeature);
  //     }
  //   }
  // }

  onPreviewMessage(data: any) {

    /* LOGIN ACTION */
    if (data.action === 'login' && this.loginRedirect) {
      this.loadPage(this.loginRedirect);
      return;
    }

    /* FOLLOW TOGGLE */
    if (data.followToggle && this.activeJsKeys.includes('FOLLOW_TOGGLE')) {
      // iframe DOM handles UI; backend sync optional
      return;
    }

    /* ACTIVE MENU */
    if (data.menuKey) {
      this.activeMenuKey = data.menuKey;
      this.updateActiveMenuUI();
    }

    /* NAVIGATION */
    if (data.subFeature && this.pages[data.subFeature]) {
      this.loadPage(data.subFeature);
      return;
    }
  };

  previewListener = (event: any) => {
    if (event.data?.type === 'preview-click') {
      this.onPreviewMessage(event.data);
    }
  };


  /** ================= FOLLOW / FOLLOWING ================= */

  handleFollowToggle(btn: HTMLElement) {
    btn.classList.toggle('is-following');
    btn.textContent = btn.classList.contains('is-following') ? 'Following' : 'Follow';
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

  setWidth(device: string) {
    if (device == 'mobile') {
      this.previewWidth = 400
    } else if (device == 'desktop') {
      this.previewWidth = 1366

    } else if (device == 'tablet') {
      this.previewWidth = 768
    }

  }

  async regenerate() {
    if (this.isTyping) return;


    this.isTyping = true;
    // scroll to top using CDK
    
    const jobId = ++this.frontendJobId;
    this.currentBuildId++;
   
    const commands = this.aiService.getRegenCommands(this.currentBuildId);

    /* ---------- INTRO PARAGRAPH ---------- */

    await this.streamFrontendParagraph(
      `regen-intro-${this.currentBuildId}`,
      `Let’s redesign your application with a fresh visual direction.
  I’ll rework the layout structure, refine spacing, and enhance the CSS
  to deliver a cleaner, more modern user experience.`,
      jobId
    );

    this.showLoader('Analyzing design direction…');
    await this.delay(900);
    this.hideLoader();

    /* ---------- CMD 1 ---------- */

    await this.streamFrontendBlock(
      `cmd-ui-${this.currentBuildId}-1`,
      commands[0],
      jobId
    );

    this.showLoader('Refining theme styles…');
    await this.delay(700);
    this.hideLoader();

    /* ---------- CMD 2 ---------- */

    await this.streamFrontendBlock(
      `cmd-ui-${this.currentBuildId}-2`,
      commands[1],
      jobId
    );

    this.showLoader('Optimizing layout structure…');
    await this.delay(800);
    this.hideLoader();

    /* ---------- CMD 3 ---------- */

    await this.streamFrontendBlock(
      `cmd-ui-${this.currentBuildId}-3`,
      commands[2],
      jobId
    );

    this.showLoader('Finalizing visual polish…');
    await this.delay(900);
    this.hideLoader();

    /* ---------- ENDING PARAGRAPH ---------- */

    await this.streamFrontendParagraph(
      `regen-end-${this.currentBuildId}`,
      `The redesigned structure is ready.
  Your updated layout and styling provide better visual hierarchy,
  improved readability, and a more engaging overall experience.
  You can continue refining or generate another variation.`,
      jobId
    );

    this.isTyping = false;

    this.startPreview(null)
  }




  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async streamFrontendBlock(
    blockId: string,
    text: string,
    jobId: number
  ) {

      // 🔥 second block starts → remove min-height
    this.clearFirstBlockMinHeight();
    let block = this.blocks.find(b => b.id === blockId);

    if (!block) {
      block = { id: blockId, text: '', done: false, timestamp: new Date() };
      this.blocks.push(block);
     
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
    jobId: number
  ) {
    const isFirst = !this.hasMarkedFirstBlock;
    let block = {
      id: blockId,
      text: '',
      done: false,
      timestamp: new Date(),
      isFirstOfRegenerate: isFirst
    };
    // 🔥 mark first block only once
  if (isFirst) {
    this.hasMarkedFirstBlock = true;
  }

    this.blocks.push(block);

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
    this.blocks = this.blocks.filter(b => b.id !== 'loader');

    this.blocks.push({
      id: 'loader',
      text,
      done: false,
      timestamp: new Date()
    });
  }

  hideLoader() {
    this.blocks = this.blocks.filter(b => b.id !== 'loader');
  }


  saveDesign() {
    this.router.navigate([`plan-delivery/5`])
  }

  ngOnDestroy() {
    this.blocks = [];
    this.aiService.stop();
    window.removeEventListener('message', this.previewListener);
  }

 
  
  scrollToBottom() {
    if (!this.chatScroll) return;
  
    const el = this.chatScroll.nativeElement;
  
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  
  scrollRegenerateBlockToTop(domId: string) {
    requestAnimationFrame(() => {
      const el = document.getElementById(domId);
      console.log("el", el);
      if (!el) return;
  
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'   // 👈 aligns THIS block to top
      });
    });
  }
  
  handleGenerateResponse(res: any) {

    const designId = `design-${this.designOrder.length + 1}`;
  
    const snapshot: DesignSnapshot = {
      id: designId,
      label: `Design ${this.designOrder.length + 1}`,
      pages: res.data.pages,
      loginRedirect: res.data.login_redirect,
      createdAt: new Date()
    };
  
    // store
    this.designMap.set(designId, snapshot);
    this.designOrder.push(designId);
  
    // activate
    this.activeDesignId = designId;
  
    // load first page
    const firstKey = Object.keys(snapshot.pages)[0];
    if (firstKey) {
      this.loadPageFromDesign(designId, firstKey);
    }
  }
  
  switchDesign(designId: string) {
    if (!this.designMap.has(designId)) return;
  
    this.activeDesignId = designId;
  
    const design = this.designMap.get(designId)!;
  
    // reset menu / state
    this.pages = design.pages;
    this.loginRedirect = design.loginRedirect;
  
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
  
    const iframe = this.previewFrame.nativeElement;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
  
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
  
          <script>
            document.addEventListener('click', function(e) {
              const el = e.target;
              parent.postMessage({
                type: 'preview-click',
                menuKey: el.closest('[data-menu-key]')?.getAttribute('data-menu-key'),
                action: el.closest('[data-action]')?.getAttribute('data-action'),
                subFeature: el.closest('[data-sub-feature]')?.getAttribute('data-sub-feature'),
                followToggle: !!el.closest('[data-follow-toggle]')
              }, '*');
            });
          </script>
        </body>
      </html>
    `);
    doc.close();
  
    setTimeout(() => this.updateActiveMenuUI(), 50);
  }
  

  clearFirstBlockMinHeight() {
    const first = this.blocks.find(b => b.isFirstOfRegenerate);
    if (first) {
      first.isFirstOfRegenerate = false;
      this.hasMarkedFirstBlock = false
    }
  }
  

}
