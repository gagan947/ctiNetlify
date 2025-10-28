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
    this.title.setTitle('Smart App Development with AI | Creative AI App Generator');
    this.meta.updateTag({ name: 'description', content: 'Drive digital transformation with Creative AI. Our AI app generator empowers you to build smart, fast, and scalable web and mobile applications effortlessly.' })
  }
}
