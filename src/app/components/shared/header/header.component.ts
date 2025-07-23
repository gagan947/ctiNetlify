import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
declare var bootstrap: any;
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
  }

}
