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
  pages: any = {};           // Full response from backend
  currentHTML: SafeHtml = "";  // Current page HTML
  currentCSS: string = "";   // Current page CSS
  styleTag!: HTMLStyleElement;

  constructor(
    private apiService: ApiService,
    private el: ElementRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const payload = {
      project_id: 5,
      project_description: "Airbnb revolutionizes travel by connecting users with unique accommodations and experiences worldwide. Perfect for travelers seeking personalized stays, the app allows users to list, discover, and book properties ranging from cozy apartments to luxury villas. Its intuitive interface simplifies browsing, with filters for location, price, and amenities like Wi-Fi or pet-friendly spaces. Users can save favorite listings to plan dream vacations or quick getaways. Hosts can showcase their properties with detailed descriptions, photos, and verified reviews, fostering trust and transparency. The booking process is seamless, with secure payments and instant confirmations. Airbnb’s messaging system enables direct communication between hosts and guests, ensuring smooth coordination. Beyond stays, the app offers curated experiences, from cooking classes to guided tours, led by local experts. Travelers can explore destinations through reviews and host recommendations, making every trip memorable. The app’s global reach supports diverse travel needs, whether for solo adventurers, families, or business travelers. Features like flexible cancellation policies and wishlists enhance user convenience. Airbnb’s community-driven platform promotes cultural exchange and authentic travel, making it a go-to choice for modern explorers seeking more than just a place to stay.",
      sub_features: ["47","61"],
      project_type: "Social",

    };

    this.apiService.postAPI<any, any>('api/user/generatePreview', payload).subscribe((res: any) => {
      this.pages = res.data;  // example: { login_email: {...}, login_phone: {...} }

      // Load default page
      const firstKey = Object.keys(res.data)[0];
      if (firstKey) this.loadPage(firstKey);
    });
  }

  /** Load selected HTML + CSS */
  loadPage(key: string) {
    this.currentHTML = this.sanitizer.bypassSecurityTrustHtml(
      this.pages[key].html
    );

    this.injectCSS(this.pages[key].css);
  }


  /** Dynamically inject CSS into document head */
  injectCSS(css: string) {
    if (this.styleTag) {
      document.head.removeChild(this.styleTag);
    }

    this.styleTag = this.renderer.createElement('style');
    this.styleTag.innerHTML = css;
    document.head.appendChild(this.styleTag);
  }

  /** Navigation handler */
  onPreviewClick(event: any) {
    let el = event.target;

    const feature = el.closest("[data-sub-feature]")?.getAttribute("data-sub-feature");
    if (feature && this.pages[feature]) {
      this.loadPage(feature);
    }
  }


}
