import { Component } from '@angular/core';
import { HeaderComponent } from "../../shared/header/header.component";
import { FooterComponent } from "../../shared/footer/footer.component";
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { BlogCardsComponent } from '../blog-cards/blog-cards.component';

@Component({
  selector: 'app-retail-ecommerce',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink,BlogCardsComponent],
  templateUrl: './retail-ecommerce.component.html',
  styleUrl: './retail-ecommerce.component.css'
})
export class RetailEcommerceComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Retail AI Solutions | Grow Faster with AI in Retail Stores');
    this.meta.updateTag({ name: 'description', content: 'Use AI in retail stores to boost sales, automate tasks, and deliver better shopping experiences. Modernize your retail business with smart AI solutions.' })
  }
}
