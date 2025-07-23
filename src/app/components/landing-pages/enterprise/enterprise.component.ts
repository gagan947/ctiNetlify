import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-enterprise',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './enterprise.component.html',
  styleUrl: './enterprise.component.css'
})
export class EnterpriseComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Custom Enterprise Software Development Services | AI Solutions');
    this.meta.updateTag({ name: 'description', content: 'Boost enterprise innovation with AI-driven custom software development. Build smart, scalable solutions that accelerate growth and give your business a competitive edge.' })
  }
}
