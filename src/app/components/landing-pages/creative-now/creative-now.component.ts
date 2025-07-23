import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';


@Component({
  selector: 'app-creative-now',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './creative-now.component.html',
  styleUrl: './creative-now.component.css'
})
export class CreativeNowComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Build an App Prototype | Test Your App Idea First');
    this.meta.updateTag({ name: 'description', content: 'Use our powerful prototyping tool to design, test, and improve your app idea early. Build smarter, avoid costly mistakes, and launch with confidence and clarity.' })
  }
}
