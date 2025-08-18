import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-convert-web-to-app',
  standalone: true,
   imports: [HeaderComponent, FooterComponent, RouterLink],

  templateUrl: './convert-web-to-app.component.html',
  styleUrl: './convert-web-to-app.component.css'
})
export class ConvertWebToAppComponent {

}
