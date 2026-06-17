import { Component } from '@angular/core';
import { HoneFooterComponent } from '../hone-footer/hone-footer.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-header',
  standalone: true,
  imports: [HoneFooterComponent,RouterLink],
  templateUrl: './home-header.component.html',
  styleUrl: './home-header.component.css'
})
export class HomeHeaderComponent {

}
