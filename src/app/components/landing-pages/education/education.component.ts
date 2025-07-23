import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-education',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './education.component.html',
  styleUrl: './education.component.css'
})
export class EducationComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('E-Learning App Development Company | Smart Education Apps');
    this.meta.updateTag({ name: 'description', content: 'Build smart, AI-powered education apps to help students learn better and teachers teach smarter. Deliver engaging, effective learning anytime, anywhere.' })
  }
}
