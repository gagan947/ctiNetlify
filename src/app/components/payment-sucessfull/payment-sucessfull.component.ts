import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-payment-sucessfull',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-sucessfull.component.html',
  styleUrl: './payment-sucessfull.component.css',
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


  ngAfterViewInit(): void {
    // Set target time = now + 7 days (in ms)
    const now = new Date().getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const target = now + sevenDays;

    const daysEl: any = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minsEl = document.getElementById('minutes');
    const secsEl = document.getElementById('seconds');

    function updateTimer() {
      const current = new Date().getTime();
      let diff = target - current;

      if (diff < 0) {
        diff = 0;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      daysEl!.textContent = days;
      hoursEl!.textContent = String(hours).padStart(2, '0');
      minsEl!.textContent = String(mins).padStart(2, '0');
      secsEl!.textContent = String(secs).padStart(2, '0');
    }

    // Run immediately and then every second
    updateTimer();
    setInterval(updateTimer, 1000);
  }
}
