import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { CanonicalService } from '../../../services/canonical.service';

@Component({
  selector: 'app-health-app-builder',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './health-app-builder.component.html',
  styleUrl: './health-app-builder.component.css'
})
export class HealthAppBuilderComponent {
  constructor(private meta: Meta, private title: Title, private canonicalService: CanonicalService) {
    this.title.setTitle('AI in Healthcare & Intelligent Digital App Development Solutions');
    this.meta.updateTag({ name: 'description', content: 'Explore how AI in healthcare transforms patient care. Build smart, scalable digital apps that enhance efficiency, accuracy, and innovation in healthcare delivery.' });
    this.canonicalService.setCanonicalURL('https://creativethoughts.ai/health-app-builder');
  }
}
