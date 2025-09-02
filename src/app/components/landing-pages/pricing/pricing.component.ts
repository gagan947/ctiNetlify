import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { BlogCardsComponent } from '../blog-cards/blog-cards.component';


@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [FooterComponent, HeaderComponent, RouterLink,BlogCardsComponent],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent {

}
