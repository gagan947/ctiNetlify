import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-enrertainment',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './enrertainment.component.html',
  styleUrl: './enrertainment.component.css'
})
export class EnrertainmentComponent {

  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Entertainment & Media App Development | AI Solutions');
    this.meta.updateTag({ name: 'description', content: 'Build smarter streaming, gaming, and social platforms with AI-powered entertainment app development. Engage audiences with secure, scalable digital solutions.' })
  }

}
