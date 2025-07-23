import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';


@Component({
  selector: 'app-creative-studio',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './creative-studio.component.html',
  styleUrl: './creative-studio.component.css'
})
export class CreativeStudioComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Creative Studio & AI App Builder | Build Custom Mobile Apps');
    this.meta.updateTag({ name: 'description', content: 'Turn ideas into powerful digital experiences with our Creative Studio and AI app builder. We design custom mobile & web apps faster and smarter — no tech skills needed.' })
  }
}
