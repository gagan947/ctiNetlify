import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-iphone-app-builder',
  standalone: true,
 imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './iphone-app-builder.component.html',
  styleUrl: './iphone-app-builder.component.css'
})
export class IphoneAppBuilderComponent {

}
