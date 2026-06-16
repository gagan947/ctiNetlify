import { Component } from '@angular/core';
import { HoneFooterComponent } from '../hone-footer/hone-footer.component';

@Component({
  selector: 'app-home-header',
  standalone: true,
  imports: [HoneFooterComponent],
  templateUrl: './home-header.component.html',
  styleUrl: './home-header.component.css'
})
export class HomeHeaderComponent {

}
