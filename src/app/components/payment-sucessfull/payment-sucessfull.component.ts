import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from "../client_buildcard_pages/sidebar/sidebar.component";
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-payment-sucessfull',
  standalone: true,
  imports: [RouterLink, SidebarComponent],
  templateUrl: './payment-sucessfull.component.html',
  styleUrl: './payment-sucessfull.component.css'
})
export class PaymentSucessfullComponent {
  orderId: string = '';
  paymentStatus: string = 'Checking...';
  clientEnquryId: string = '';
  constructor(private route: ActivatedRoute, private service: ApiService) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['order_id'];
      this.clientEnquryId = params['clientEnquryId'];
      if (this.orderId) {
        this.checkPaymentStatus();
      }
    });
  }

  async checkPaymentStatus() {
    try {
      const response: any = await this.service.postAPI('api/payment/verifyCashFreePayment', { orderId: this.orderId, clientEnquryId: this.clientEnquryId }).toPromise();

      if (response?.success) {
        this.paymentStatus = response.orderStatus;

        if (response.orderStatus === 'PAID') {
          console.log('✅ Payment successful!', response.orderData);
        } else {
          console.log('ℹ️ Payment not completed yet:', response.orderStatus);
        }
      } else {
        console.warn('⚠️ Payment verification failed or no response received.');
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      this.paymentStatus = 'Error checking status';
    }
  }

}
