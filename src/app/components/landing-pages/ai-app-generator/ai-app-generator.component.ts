import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ai-app-generator',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './ai-app-generator.component.html',
  styleUrl: './ai-app-generator.component.css'
})
export class AiAppGeneratorComponent {

}
