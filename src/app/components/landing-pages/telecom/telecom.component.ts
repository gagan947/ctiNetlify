import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-telecom',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './telecom.component.html',
  styleUrl: './telecom.component.css'
})
export class TelecomComponent {

  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Smarter Telecom Growth | Accelerated by AI Automation');
    this.meta.updateTag({ name: 'description', content: 'Boost telecom growth with AI automation. Streamline operations, cut costs, and deliver smarter, faster services for better customer satisfaction and business success.' })
  }
  
}
