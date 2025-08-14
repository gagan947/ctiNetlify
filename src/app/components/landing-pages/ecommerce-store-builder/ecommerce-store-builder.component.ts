import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-ecommerce-store-builder',
  standalone: true,
 imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './ecommerce-store-builder.component.html',
  styleUrl: './ecommerce-store-builder.component.css'
})
export class EcommerceStoreBuilderComponent {

}
