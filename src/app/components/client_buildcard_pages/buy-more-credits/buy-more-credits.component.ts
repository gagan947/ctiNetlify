import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-buy-more-credits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './buy-more-credits.component.html',
  styleUrl: './buy-more-credits.component.css'
})
export class BuyMoreCreditsComponent {
  buyCreditsModalOpen: boolean = false;
  constructor() { }


  closeModal() {
    this.buyCreditsModalOpen = false;
  }
}
