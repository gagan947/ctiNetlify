import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { GlobalModalComponent } from "./components/shared/global-modal/global-modal.component";
import { filter } from 'rxjs';
import { Meta } from '@angular/platform-browser';

declare let fbq: Function;
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'creative_ai';
  @ViewChild('closeModal') closeModal!: ElementRef;


  constructor(
    private router: Router,
    private meta: Meta,
  ) {
    this.meta.updateTag({ property: 'og:site_name', content: 'Creative AI' });
  }

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Reload your main.js script (your current logic)
        const existingScript = document.querySelector('script[src="assets/js/main.js"]');
        if (existingScript) {
          existingScript.remove();
        }
        const scriptElement = document.createElement('script');
        scriptElement.src = 'assets/js/main.js';
        scriptElement.async = true;
        document.body.appendChild(scriptElement);

        // 👇 Trigger Facebook Pixel page view
        if (typeof fbq === 'function') {
          fbq('track', 'PageView');
        }
      });
  }

  @ViewChild('myModal') modalRef!: ElementRef;

  closeModal2() {
    this.closeModal.nativeElement.click();
    this.router.navigate(['/free-demo']);
    // Additional cleanup logic if needed
  }
}
