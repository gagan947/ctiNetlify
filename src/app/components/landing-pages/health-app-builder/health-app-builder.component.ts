import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-health-app-builder',
  standalone: true,
 imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './health-app-builder.component.html',
  styleUrl: './health-app-builder.component.css'
})
export class HealthAppBuilderComponent {

}
