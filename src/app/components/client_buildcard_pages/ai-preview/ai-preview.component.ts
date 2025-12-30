import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { io } from 'socket.io-client';
import { AiSocketService } from '../../../services/ai-socket.service';
import { filter } from 'rxjs';
@Component({
  selector: 'app-ai-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-preview.component.html',
  styleUrl: './ai-preview.component.css'
})
export class AiPreviewComponent {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;

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
      // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private el: ElementRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private aiService: AiSocketService
  ) {}

  ngOnInit() {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'preview-click') {
        this.onPreviewMessage(event.data);
      }
    });
    this.aiService.socketReady$
    .pipe(filter(id => !!id))
    .subscribe(socket_id => {
  
      this.aiService.listen((blocks) => {
        console.log("blocks", blocks);
        this.blocks = blocks;
      });
    this.socket_id = socket_id

   
  
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);

   const subFeatureIds:any = [];
   this.projectsData.selectdFeature.forEach((items:any) => {
    items.subFeatures.forEach((subFeatures:any) =>{
      subFeatureIds.push(subFeatures.id);
    })
   });
 

    const payload = {
      project_id: this.projectsData.projectId,
      project_description: this.projectsData.projectDescription,
      sub_features: subFeatureIds,
      project_type: this.projectsData.projectType,
      clientEnquryId:this.projectsData.clientEnquryId,
      socket_id:this.socket_id
      
    };

    this.apiService
      .postAPI<any, any>('api/user/generatePreview', payload)
      .subscribe((res: any) => {
        this.pages = res.data.pages;
        this.loginRedirect = res.data.login_redirect;
        const firstKey = Object.keys(this.pages)[0];
        if (firstKey) this.loadPage(firstKey);
      });
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
  }
  

  /** ================= FOLLOW / FOLLOWING ================= */

  handleFollowToggle(btn: HTMLElement) {
    btn.classList.toggle('is-following');
    btn.textContent = btn.classList.contains('is-following')
      ? 'Following'
      : 'Follow';
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
  
  setWidth(device:string){
    if(device == 'mobile'){
      this.previewWidth = 400
    }else if(device == 'desktop'){
      this.previewWidth = 1366
    
    }else if(device == 'tablet'){
      this.previewWidth = 768
    }

  }


}
