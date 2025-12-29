import { Component, ElementRef, Renderer2 } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-ai-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-preview.component.html',
  styleUrl: './ai-preview.component.css'
})
export class AiPreviewComponent {

  pages: any = {};                 // Full response from backend
  currentHTML: SafeHtml = "";       // Current page HTML
  currentCSS: string = "";          // Current page CSS
  styleTag!: HTMLStyleElement;
  activeJsKeys: string[] = [];      // js_keys for current page
  loginRedirect: string = ""; 
  activeMenuKey: string | null = null;
  projectsData: any;
      // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private el: ElementRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);

    console.log(this.projectsData);
   const subFeatureIds:any = [];
   this.projectsData.selectdFeature.forEach((items:any) => {
    items.subFeatures.forEach((subFeatures:any) =>{
      subFeatureIds.push(subFeatures.id);
    })
   });
   console.log("sub", subFeatureIds);

    const payload = {
      project_id: this.projectsData.projectId,
      project_description: this.projectsData.projectDescription,
      sub_features: subFeatureIds,
      project_type: this.projectsData.projectType,
      clientEnquryId:this.projectsData.clientEnquryId
    };

    this.apiService
      .postAPI<any, any>('api/user/generatePreview', payload)
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

    this.currentHTML = this.sanitizer.bypassSecurityTrustHtml(page.html);
    this.activeJsKeys = page.js_keys || [];
    this.activeMenuKey = key;

    this.injectCSS(page.css);
    // ✅ set active menu
  // ⏱️ WAIT for DOM render
  setTimeout(() => {
    this.updateActiveMenuUI();
  }, 0);
    const element = document.getElementById('topScrollDiv');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  onPreviewClick(event: any) {
    const el = event.target as HTMLElement;
    if (!el) return;

     /* LOGIN ACTION */
  const menuEl = el.closest('[data-menu-key]') as HTMLElement;
  const action = el.closest('[data-action]')?.getAttribute('data-action');
  if (action === 'login' && this.loginRedirect) {
    
    this.loadPage(this.loginRedirect);
    return;
  }

    /* ---------------- FOLLOW TOGGLE ---------------- */
    if (this.activeJsKeys.includes('FOLLOW_TOGGLE')) {
      const followBtn = el.closest('[data-follow-toggle]') as HTMLElement;
      if (followBtn) {
        this.handleFollowToggle(followBtn);
        return; // ⛔ stop here (do not trigger navigation)
      }
    }
      // ACTIVE MENU
  const menuKey = menuEl?.getAttribute('data-menu-key');
  if (menuKey) {
 
    this.activeMenuKey = menuKey;
    this.updateActiveMenuUI();
  }

    /* ---------------- NAVIGATION (YOUR EXISTING LOGIC) ---------------- */
    const feature = el
      .closest('[data-sub-feature]')
      ?.getAttribute('data-sub-feature');

    if (feature && this.pages[feature]) {
      this.loadPage(feature);
      return;
    }

  

    // For select dropdown navigation
    if (!feature && (el as any).selectedOptions) {
      const selected = (el as any).selectedOptions[0];
      const subFeature = selected?.dataset?.subFeature;
      if (subFeature && this.pages[subFeature]) {
        this.loadPage(subFeature);
      }
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
  // 🔹 Query the injected preview DOM, not Angular root
  const previewRoot = document.querySelector('.preview-wrapper') as HTMLElement;

  if (!previewRoot || !this.activeMenuKey) return;

  // 🔹 Remove previous active
  previewRoot
    .querySelectorAll('.menu-item.active')
    .forEach(el => el.classList.remove('active'));

  // 🔹 Add active to current
  previewRoot
    .querySelectorAll(`.menu-item[data-menu-key="${this.activeMenuKey}"]`)
    .forEach(el => el.classList.add('active'));
}


}
