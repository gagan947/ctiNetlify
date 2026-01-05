import { Component, ElementRef, NgZone, Renderer2, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { io } from 'socket.io-client';
import { AiSocketService } from '../../../services/ai-socket.service';
import { filter, Subject, take } from 'rxjs';
import { Router } from '@angular/router';
import { CdkScrollable, ScrollingModule } from '@angular/cdk/scrolling';
@Component({
  selector: 'app-ai-preview',
  standalone: true,
  imports: [CommonModule,ScrollingModule],
  templateUrl: './ai-preview.component.html',
  styleUrl: './ai-preview.component.css'
})
export class AiPreviewComponent {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('chatScroll', { read: CdkScrollable }) scrollable!: CdkScrollable;

  previewWidth = 1366; // desktop default
  @ViewChild('preview', { static: false }) iframe!: ElementRef<HTMLIFrameElement>;
  blocks: any[] = [];
  pages: any = {};                 // Full response from backend
  currentHTML: SafeHtml = "";       // Current page HTML
  currentCSS: string = "";          // Current page CSS
  styleTag!: HTMLStyleElement;
  activeJsKeys: string[] = [];      // js_keys for current page
  loginRedirect: string = "";
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
  startPreview(socket_id: string) {

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
        this.pages = res.data.pages;
        this.loginRedirect = res.data.login_redirect;

        const firstKey = Object.keys(this.pages)[0];
        if (firstKey) this.loadPage(firstKey);
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
    const block = {
      id: `regen-intro-${this.currentBuildId}`,
      domId: `regen-dom-${Date.now()}`, // unique
      text: '',
      done: false,
      timestamp: new Date(),
      isRegenerate: true
    };
    this.blocks.push(block);
    this.builds.push({
      buildId: this.currentBuildId,
      blocks: this.blocks,
      createdAt: new Date()
    })
 

    console.log(this.builds);
    
    
 
// 👇 ONLY this new block moves to top of view
this.scrollRegenerateBlockToTop(block.domId);

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
  }




  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async streamFrontendBlock(
    blockId: string,
    text: string,
    jobId: number
  ) {
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
    let block = {
      id: blockId,
      text: '',
      done: false,
      timestamp: new Date()
    };

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

 
  
  scrollToTop() {
    console.log("hitting");
    if (this.scrollable) {
      console.log("DShdfh");
      this.scrollable.scrollTo({ top: 0 });
    }
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
  


}
