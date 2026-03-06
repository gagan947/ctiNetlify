import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { CanonicalService } from '../../../services/canonical.service';


@Component({
  selector: 'app-iphone-app-builder',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './iphone-app-builder.component.html',
  styleUrl: './iphone-app-builder.component.css'
})
export class IphoneAppBuilderComponent {
  constructor(private meta: Meta, private title: Title, private canonicalService: CanonicalService) {
    this.title.setTitle('Create an iPhone App Without Coding | Creative AI App Builder');
    this.meta.updateTag({ name: 'description', content: 'Create an iPhone app without coding using Creative AI App Builder. Design, build, and launch fast, secure, and scalable iOS apps easily for businesses and startups.' });
    this.canonicalService.setCanonicalURL('https://creativethoughts.ai/iphone-app-builder');
  }
}
