import { CommonModule } from '@angular/common';
import { Component, Optional } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { BuyMoreCreditsModalResult } from '../../../services/subscription-modal.service';
import { ApiService } from '../../../services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-buy-more-credits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './buy-more-credits.component.html',
  styleUrl: './buy-more-credits.component.css'
})
export class BuyMoreCreditsComponent {
  constructor(
    private apiService: ApiService,
    private message: NzMessageService,
    @Optional() private modalRef?: NzModalRef<BuyMoreCreditsComponent, BuyMoreCreditsModalResult>,
  ) { }


  ngOnInit(): void {
    debugger
    this.getAllTopUpPlans();
  }

  getAllTopUpPlans() {
    this.apiService.getApi('api/payment/topup-packs').subscribe({
      next: (res) => {
        console.log(res);
      },
      error: (err) => {
        console.error(err);
        this.message.error('Failed to fetch top-up plans. Please try again later.');
      }
    });
  }

  closeModal() {
    this.modalRef?.close({ action: 'closed', reason: 'cancel' });
  }
}
