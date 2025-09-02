import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { BlogCardsComponent } from '../blog-cards/blog-cards.component';


@Component({
  selector: 'app-how-we-compare',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink,BlogCardsComponent],
  templateUrl: './how-we-compare.component.html',
  styleUrl: './how-we-compare.component.css'
})
export class HowWeCompareComponent {

}
