import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { CanonicalService } from '../../../services/canonical.service';

@Component({
  selector: 'app-ai-app-generator',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './ai-app-generator.component.html',
  styleUrl: './ai-app-generator.component.css'
})
export class AiAppGeneratorComponent {
  constructor(private meta: Meta, private title: Title, private canonicalService: CanonicalService) {
    this.title.setTitle('AI App Generator – Create Android & iOS Apps in Minutes');
    this.meta.updateTag({
      name: 'description', content: 'Create Android and iOS apps in minutes with our AI App Generator. Share your idea, customize features, and launch powerful mobile apps without coding.'
    });
    this.canonicalService.setCanonicalURL('https://creativethoughts.ai/ai-app-generator');
  }
}
