import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-ai-app-generator',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './ai-app-generator.component.html',
  styleUrl: './ai-app-generator.component.css'
})
export class AiAppGeneratorComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('AI App Generator — Generate Android & iOS Apps Using AI');
    this.meta.updateTag({
      name: 'description', content: 'Generate Android and iOS apps instantly using AI. Describe your app idea, and Creative AI will automatically build the app structure. No coding required—start free today.'
    })
  }
}
