import { Component } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { RouterLink } from '@angular/router';
import { BlogCardsComponent } from '../blog-cards/blog-cards.component';

@Component({
  selector: 'app-manufacturing',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink,BlogCardsComponent],
  templateUrl: './manufacturing.component.html',
  styleUrl: './manufacturing.component.css'
})
export class ManufacturingComponent {

  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('AI for Manufacturing — Smart Factory & Industrial Solutions');
    this.meta.updateTag({ name: 'description', content: 'Use AI in manufacturing to automate tasks, increase production, cut costs, and gain real-time insights. Power your smart factory with AI solutions tailored for you.' })
  }

}
