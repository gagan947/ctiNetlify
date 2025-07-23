import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-health-care',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './health-care.component.html',
  styleUrl: './health-care.component.css'
})
export class HealthCareComponent {

  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle(' Smart Healthcare | Build with an AI Healthcare Solution');
    this.meta.updateTag({ name: 'description', content: 'Build smarter patient care with AI healthcare solutions. Save time, reduce costs, and run your clinic or hospital better with secure, efficient AI health software.' })
  }

}
