import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  selectedLang: string = 'sv';
  ngOnInit(): void {
    this.loadScript()
  }

  loadScript() {
    const existingScript = document.querySelector('script[src*="translate_a/element.js"]');
    if (existingScript) {
      this.onCustomLangChange('sv');
      return;
    }

    const scriptElement = document.createElement('script');
    scriptElement.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

    window['googleTranslateElementInit'] = () => {
      new google.translate.TranslateElement({
        includedLanguages: 'sv,en',
        autoDisplay: false,
        layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL
      }, 'google_translate_element');

      setTimeout(() => {
        this.onCustomLangChange('sv');
      }, 1000);
    };

    document.body.appendChild(scriptElement);
  }

  setGoogleTranslateValue(selectedLang: string) {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 500;

    const trySetLang = () => {
      const selectEl: HTMLSelectElement | null = document.querySelector('.goog-te-combo');

      if (selectEl) {
        selectEl.value = selectedLang;
        selectEl.dispatchEvent(new Event('change'));
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(trySetLang, interval);
      } else {
        console.warn('Google Translate dropdown not found after max attempts');
      }
    };

    trySetLang();
  }

  onCustomLangChange(lang: any) {
    this.selectedLang = lang
    const selectedLang = lang
    this.setGoogleTranslateValue(selectedLang);
  }

  toggleNavbar() {
    const navbar = document.querySelector('.ct_navbar');
    if (navbar) {
      navbar.classList.toggle('show');
    }
  }
}

declare var google: any
declare global {
  interface Window {
    googleTranslateElementInit: any;
  }
}

