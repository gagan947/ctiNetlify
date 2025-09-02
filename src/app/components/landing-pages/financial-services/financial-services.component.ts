import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { BlogCardsComponent } from '../blog-cards/blog-cards.component';

@Component({
  selector: 'app-financial-services',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink,BlogCardsComponent],
  templateUrl: './financial-services.component.html',
  styleUrl: './financial-services.component.css'
})
export class FinancialServicesComponent {

}
