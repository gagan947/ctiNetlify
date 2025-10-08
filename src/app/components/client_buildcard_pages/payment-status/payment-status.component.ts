import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [],
  templateUrl: './payment-status.component.html',
  styleUrl: './payment-status.component.css'
})
export class PaymentStatusComponent {
  orderId: string = '';
  paymentStatus: string = 'Checking...';

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['order_id'];
      if (this.orderId) {
        this.checkPaymentStatus();
      }
    });
  }

  async checkPaymentStatus() {
    try {
      const response: any = await this.http.get(`/order-status/${this.orderId}`).toPromise();
      if (response.success) {
        this.paymentStatus = response.orderStatus;
        
        if (response.orderStatus === 'PAID') {
          // Handle successful payment
          console.log('Payment successful!', response.orderData);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      this.paymentStatus = 'Error checking status';
    }
  }
}

