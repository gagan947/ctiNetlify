import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';


@Component({
  selector: 'app-iphone-app-builder',
  standalone: true,
 imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './iphone-app-builder.component.html',
  styleUrl: './iphone-app-builder.component.css'
})
export class IphoneAppBuilderComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('AI iPhone App Builder | Create Next-Gen Web & Mobile Apps ');
    this.meta.updateTag({ name: 'description', content: 'Use the Creative AI iPhone apps builder to create high-quality mobile and web solutions. Drive innovation, digital transformation, and long-term business success.' })
  }
}
