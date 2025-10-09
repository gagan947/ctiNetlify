import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './payment-status.component.html',
  styleUrl: './payment-status.component.css'
})
export class PaymentStatusComponent {
  orderId: string = '';
  status = 0;
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
      this.status = params['status'];
      this.clientEnquryId = params['enquiryId'];
      console.log(this.status);
      if (this.orderId && this.status != 1) {
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
    // Fetch end_time from API
    this.service.getApi(`api/payment/getPaymentDetails?orderId=${this.orderId}`).subscribe((res: any) => {
      if (res.data.length > 0) {
        const targetTime = new Date(res.data[0].fetch_mvp_date).getTime();
        this.startCountdown(targetTime);
      } else {
        const now = new Date();
        const targetTime = now.getTime() + 7 * 24 * 60 * 60 * 1000;
        this.startCountdown(targetTime);
      }
    }, error => {
      const now = new Date();
      const targetTime = now.getTime() + 7 * 24 * 60 * 60 * 1000;
      this.startCountdown(targetTime);
    });
  }

  startCountdown(target: number) {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minsEl = document.getElementById('minutes');
    const secsEl = document.getElementById('seconds');

    function updateTimer() {
      const current = new Date().getTime();
      let diff = target - current;

      if (diff < 0) diff = 0;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (daysEl) daysEl.textContent = days.toString();
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }
}

