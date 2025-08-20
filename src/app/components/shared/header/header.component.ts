import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
declare let bootstrap: any;
declare let Calendly: any;  // 👈 declare Calendly from script
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
@ViewChild('closeModal2') closeModal2!: ElementRef

  constructor(private router: Router) {
   
   };

   ngOnInit(): void {
  
   };


   closeModal21() {
    this.closeModal2.nativeElement.click();
    this.router.navigate(['/free-demo']);
  };

  openCalendly() {
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
