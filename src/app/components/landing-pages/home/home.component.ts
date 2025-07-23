import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FooterComponent, HeaderComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private meta: Meta) {
    this.meta.updateTag({ name: 'description', content: ' Build mobile and web apps faster with CreativeThoughts AI app builder. Turn your ideas into real apps easily, without coding hassle — smart, fast, and scalable.' });
  }
}
