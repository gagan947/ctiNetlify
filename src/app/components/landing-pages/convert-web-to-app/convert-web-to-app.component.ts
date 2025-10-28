import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-convert-web-to-app',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './convert-web-to-app.component.html',
  styleUrl: './convert-web-to-app.component.css'
})
export class ConvertWebToAppComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Easily Convert Your Website to a Mobile App with AI Solutions');
    this.meta.updateTag({ name: 'description', content: 'Build mobile apps from your website using AI innovation. Streamline app development, boost performance, and grow your brand with intelligent digital solutions.' })
  }
}
