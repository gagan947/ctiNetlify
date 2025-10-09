import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from "../client_buildcard_pages/sidebar/sidebar.component";
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';

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

  // Countdown values
  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;

  private targetTime: number = 0;
  private timerSub!: Subscription;
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

    // Steps / status messages
    steps = [
      'Initializing project setup',
      'Design & architecture phase',
      'Development in progress',
      'Testing & QA',
      'Final touches & review',
      'Preparing for handover'
    ];
  
    // Lottie options if you choose to use a Lottie JSON animation
    lottieOptions = {
      path: 'assets/animations/tech_process.json', // your JSON file
      autoplay: true,
      loop: true
    };

    ngOnDestroy() {
      if (this.timerSub) {
        this.timerSub.unsubscribe();
      }
    }
  
    private updateCountdown() {
      const now = new Date().getTime();
      let distance = this.targetTime - now;
  
      if (distance < 0) {
        distance = 0;
      }
  
      this.days = Math.floor(distance / (1000 * 60 * 60 * 24));
      this.hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.seconds = Math.floor((distance % (1000 * 60)) / 1000);
    }

}
