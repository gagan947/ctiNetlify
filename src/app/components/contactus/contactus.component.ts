import { Component } from '@angular/core';
import { HeaderComponent } from "../shared/header/header.component";
  declare let Calendly: any;
@Component({
  selector: 'app-contactus',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './contactus.component.html',
  styleUrl: './contactus.component.css'
})
export class ContactusComponent {

  ngOnInit(): void {
    const calendlyContainer = document.getElementById('calendly-inline-widget');
    if (calendlyContainer) {
      calendlyContainer.style.display = 'block'; // show popup container
      Calendly.initInlineWidget({
        url: 'https://calendly.com/creativethoughts/30min',
        parentElement: calendlyContainer,
      });
    }
  }
}
