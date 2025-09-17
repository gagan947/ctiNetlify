import { Component } from '@angular/core';
import { HeaderComponent } from "../shared/header/header.component";
import { CalendlyDirective } from '../../helper/directives/calendly.directive';
  declare let Calendly: any;
@Component({
  selector: 'app-contactus',
  standalone: true,
  imports: [HeaderComponent,CalendlyDirective],
  templateUrl: './contactus.component.html',
  styleUrl: './contactus.component.css'
})
export class ContactusComponent {

  // ngAfterViewInit(): void {
  //   const calendlyContainer = document.getElementById('calendly-inline-widget');
  //   if (calendlyContainer) {
  //     calendlyContainer.style.display = 'block'; // show container
  //     Calendly.initInlineWidget({
  //       url: 'https://calendly.com/creativethoughts/30min',
  //       parentElement: calendlyContainer,
  //     });
  //   }
  // }
}
