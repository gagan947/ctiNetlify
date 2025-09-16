import { Component, effect } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-global-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-modal.component.html',
  styleUrl: './global-modal.component.css'
})
export class GlobalModalComponent {
  inquiryId: any
  constructor(public service: ModalService) {
    effect(() => {
      console.log('Updated Inquiry ID:', this.service.inquiryProjectID());
      this.inquiryId = this.service.inquiryProjectID();
    });
  }

  ngOnInit() {
   
  
  }
}
