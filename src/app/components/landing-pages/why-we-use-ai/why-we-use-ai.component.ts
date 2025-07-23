import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-why-we-use-ai',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './why-we-use-ai.component.html',
  styleUrl: './why-we-use-ai.component.css'
})
export class WhyWeUseAiComponent {

}
