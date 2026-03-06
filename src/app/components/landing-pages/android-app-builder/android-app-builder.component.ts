import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { CanonicalService } from '../../../services/canonical.service';

@Component({
  selector: 'app-android-app-builder',
  standalone: true,
 imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './android-app-builder.component.html',
  styleUrl: './android-app-builder.component.css'
})
export class AndroidAppBuilderComponent {
  constructor(private meta: Meta, private title: Title, private canonicalService: CanonicalService) {
    this.title.setTitle('Creative AI | Next-Gen Android App Maker & Web Development');
    this.meta.updateTag({ name: 'description', content: 'Use the Creative AI Android app maker to build high-performance Android and web apps. Empower your business with AI-driven innovation and digital transformation.' });
    this.canonicalService.setCanonicalURL('https://creativethoughts.ai/android-app-builder');
  }
}
