import { Component, effect, ElementRef, Input, input, ViewChild } from '@angular/core';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-mobile-view',
  standalone: true,
  imports: [],
  templateUrl: './mobile-view.component.html',
  styleUrl: './mobile-view.component.css'
})
export class MobileViewComponent {
  @ViewChild('preview', { static: true }) iframe!: ElementRef<HTMLIFrameElement>;
  imagePreview: any
  @Input() htmlCode: any
  constructor(private service: ApiService) {
    effect(() => {
      this.htmlCode = this.service._htmlCode() || sessionStorage.getItem('htmlCode');
      this.imagePreview = this.service._imagePreview()
      this.render();
      this.updateLogo();
    })
  }

  render(): void {
    if (this.htmlCode) {
      const doc = this.iframe.nativeElement.contentDocument || this.iframe.nativeElement.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(this.htmlCode);
        doc.close();
      }
    }
  }

  updateLogo() {
    const doc = this.iframe.nativeElement.contentDocument;
    if (doc) {
      const logo = doc.querySelector('#mylogo') as HTMLElement;

      const newLogoHtml = `<img id="mylogo" loading="lazy" src="${this.imagePreview || 'https://https://creativethoughts.ai/assets/img/c.png'}" alt="AI app builder for mobile and web" style="width: 70px; height: 30px;">`;

      if (logo) logo.outerHTML = newLogoHtml;
    }
  }
}
