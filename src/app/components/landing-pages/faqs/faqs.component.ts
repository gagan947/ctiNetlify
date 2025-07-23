import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';


@Component({
  selector: 'app-faqs',
  standalone: true,
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './faqs.component.html',
  styleUrl: './faqs.component.css'
})
export class FAQsComponent {

}
