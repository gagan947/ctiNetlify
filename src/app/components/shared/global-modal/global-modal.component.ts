import { Component, effect } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-global-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-modal.component.html',
  styleUrl: './global-modal.component.css'
})
export class GlobalModalComponent {
  inquiryId: any
  constructor(public service: ModalService, private apiService: ApiService) {
    effect(() => {
      this.inquiryId = this.service.inquiryProjectID();
      console.log(this.inquiryId);
    });
  }

  ngOnInit() {


  }

  discardProject() {
    this.apiService.getApi(`api/user/discardProject?id=${this.inquiryId}`).subscribe({
      next: (res: any) => {

        this.service.close(true);
      },
      error: (err: any) => {
        this.service.close(true);
      }
    })

    this.service.close(true);
  }

}
