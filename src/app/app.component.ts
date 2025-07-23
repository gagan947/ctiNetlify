import { Component, ElementRef, viewChild, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
declare var bootstrap: any;
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'creative_ai';
@ViewChild('closeModal') closeModal!: ElementRef;
  constructor(private router: Router) { }

  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        const existingScript = document.querySelector('script[src="assets/js/main.js"]');
        if (existingScript) {
          existingScript.remove();
        }
        const scriptElement = document.createElement('script');
        scriptElement.src = 'assets/js/main.js';
        scriptElement.async = true;
        document.body.appendChild(scriptElement);
      }
    });
  }

  @ViewChild('myModal') modalRef!: ElementRef;

 

  closeModal2() {
    this.closeModal.nativeElement.click();
    this.router.navigate(['/free-demo']);
    // Additional cleanup logic if needed
  }
}
