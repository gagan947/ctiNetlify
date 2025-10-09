import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [CommonModule, CalendlyDirective, RouterLink],
  templateUrl: './payment-status.component.html',
  styleUrl: './payment-status.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('400ms ease-out', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class PaymentStatusComponent {
  orderId: string = '';
  status: number = 0;
  paymentStatus: string = 'Checking...';
  clientEnquiryId: string = '';

  countdown: string = '';
  loadingMessage: string = 'Initializing setup...';
  private messageIndex = 0;
  private timerSub!: Subscription;
  private targetDate: number = new Date().getTime() + 7 * 24 * 60 * 60 * 1000; // default 7 days

  // Rotating UI messages
  private messages: string[] = [
    'Creating UI/UX elements...',
    'Building code structure...',
    'Optimizing performance...',
    'Configuring cloud environment...',
    'Integrating APIs...',
    'Running automated tests...',
    'Finalizing deployment...',
    'Almost done... just final touches!',
  ];

  steps = [
    'Initializing project setup',
    'Design & architecture phase',
    'Development in progress',
    'Testing & QA',
    'Final touches & review',
    'Preparing for handover'
  ];

  constructor(private route: ActivatedRoute, private service: ApiService) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['order_id'];
      this.status = params['status'];
      this.clientEnquiryId = params['enquiryId'];

      if (this.orderId && this.status != 1) {
        this.checkPaymentStatus();
      }
    });

    this.rotateMessages(); // start rotating progress messages
  }

  ngAfterViewInit(): void {
    // Fetch project end date from API
    this.service.getApi(`api/payment/getPaymentDetails?orderId=${this.orderId}`).subscribe({
      next: (res: any) => {
        if (res.data?.length > 0 && res.data[0].fetch_mvp_date) {
          const targetTime = new Date(res.data[0].fetch_mvp_date).getTime();
          this.startCountdown(targetTime);
        } else {
          this.startCountdown(this.targetDate); // fallback 7 days
        }
      },
      error: () => this.startCountdown(this.targetDate)
    });
  }

  async checkPaymentStatus() {
    try {
      const response: any = await this.service.postAPI('api/payment/verifyCashFreePayment', {
        orderId: this.orderId,
        clientEnquiryId: this.clientEnquiryId
      }).toPromise();

      if (response?.success) {
        this.paymentStatus = response.orderStatus;
        if (response.orderStatus === 'PAID') {
          console.log('✅ Payment successful!', response.orderData);
        } else {
          console.warn('⚠️ Payment not completed yet.');
        }
      } else {
        this.paymentStatus = 'Verification failed';
        console.warn('⚠️ Payment verification failed.');
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      this.paymentStatus = 'Error checking status';
    }
  }

  private startCountdown(targetTime: number): void {
    this.targetDate = targetTime;
    this.updateCountdown();

    this.timerSub = interval(1000).subscribe(() => this.updateCountdown());
  }

  private updateCountdown(): void {
    const now = new Date().getTime();
    const distance = this.targetDate - now;

    if (distance <= 0) {
      this.countdown = '00d : 00h : 00m : 00s';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    this.countdown = `${days.toString().padStart(2, '0')}d : ${hours
      .toString()
      .padStart(2, '0')}h : ${minutes
        .toString()
        .padStart(2, '0')}m : ${seconds
          .toString()
          .padStart(2, '0')}s`;
  }

  private rotateMessages(): void {
    setInterval(() => {
      this.messageIndex = (this.messageIndex + 1) % this.messages.length;
      this.loadingMessage = this.messages[this.messageIndex];
    }, 2500);
  }

  ngOnDestroy() {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
  }
}

