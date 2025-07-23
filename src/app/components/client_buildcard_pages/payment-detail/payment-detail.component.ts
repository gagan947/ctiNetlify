import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SelectedFeature, ProjectData } from '../../../models/sessionData';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from "../sidebar/sidebar.component";
declare var Razorpay: any;
declare var Calendly: any;
@Component({
  selector: 'app-payment-detail',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent],
  templateUrl: './payment-detail.component.html',
  styleUrl: './payment-detail.component.css'
})
export class PaymentDetailComponent {
  projectsFeatures: SelectedFeature[] = [];
  today: Date = new Date();
  projectsData: ProjectData;
  totalSubFeatures: any;
  totalCost!: number;
  paymentPlan = '1';
  noOfInstallments!: number;
  installmentType!: string;
  actualCost: number | null | undefined
  securityDeposit!: number
  installmentDates: any[] = [];
  paymentMethods: any = {
    card: true,
    upi: false,
    netbanking: false,
    wallet: false,
    paylater: false,
    emi: false
  }
  userData: any

  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService, private http: HttpClient) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.totalCost = this.projectsData.finalCost;
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.onPaymentChange(this.projectsData.paymentPlan)

    this.userData = localStorage.getItem('userDetailCTI');
  };

  onPaymentChange(id: any) {
    if (id == 1) {
      this.totalCost = this.projectsData.finalCost
      this.actualCost = null
    } else {
      this.paymentPlan = '2'
      this.actualCost = this.projectsData.finalCost + (this.projectsData.finalCost * 18) / 100
      this.securityDeposit = (this.actualCost * 20) / 100
    }
  };


  Navigate() {

    let formData = undefined
    if (this.paymentPlan == '2') {
      formData = {
        paymentPlan: this.paymentPlan == '2' ? 'Installment' : 'Upfront',
        installmentType: this.installmentType,
        taxes: (this.totalCost * 18) / 100,
        gstTotalCost: this.actualCost,
        securityDeposit: this.securityDeposit,
        currentRoutes: this.router.url,
        installmentPlan: this.installmentDates.map((ele) => {
          return {
            dueDate: ele,
            projectStage: "Development",
            amount: (this.actualCost! - this.securityDeposit - (this.securityDeposit * 18) / 100) / this.noOfInstallments
          }
        })
      }
    } else {
      formData = {
        paymentPlan: this.paymentPlan == '1' ? 'Upfront' : 'Installment',
        taxes: (this.totalCost * 18) / 100,
        currentRoutes: this.router.url,
        gstTotalCost: this.totalCost + (this.totalCost * 18) / 100 - ((this.totalCost + (this.totalCost * 18) / 100) * 10) / 100
      }
    }

    this.apiService.postAPI(`api/user/addClientPaymentPlan?inquiryId=${this.projectsData.clientEnquryId}`, formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.router.navigate(['/payment-detail'])
        }
      }, error(err) {
        // this.message.error(err.error.message)
      },
    })
  }

  async payNow() {
    await this.loadRazorpayScript();

    let formData = {
      amount: Math.round(this.paymentPlan == '1' ? (this.actualCost || (this.totalCost + (this.totalCost * 18) / 100) - (((this.totalCost + (this.totalCost * 18) / 100) * 10) / 100)) : (this.securityDeposit + (this.securityDeposit * 18) / 100))
    }

    this.apiService.postAPI(`api/payment/createRazorpayOrder`, { amount: 100000 }).subscribe({
      next: (data: any) => {
        const options: any = {
          key: 'rzp_test_nyohAyx081ZtAn', // replace with your Razorpay Key ID
          amount: data.amount,
          currency: 'INR',
          name: 'Creative.ai',
          image: "assets/img/cti_black_logo.svg",
          order_id: data.orderId,
          handler: (response: any) => {
            // console.log('Payment Success', response);
            this.apiService.postAPI(`api/payment/verifyPayment`, response).subscribe({
              next: (res: any) => {

                if (res.status === 'success') {
                  let formData2 = {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    clientInquiryId: this.projectsData.clientEnquryId,
                    paymentMethod: Object.keys(this.paymentMethods).find((method: string) => this.paymentMethods[method]),
                    installmentType: this.projectsData.installmentType === 'weekly' ? 2 : 1,
                    gstTotalCost: Math.round(this.paymentPlan == '1' ? (this.actualCost || (this.totalCost + (this.totalCost * 18) / 100) - (((this.totalCost + (this.totalCost * 18) / 100) * 10) / 100)) : (this.securityDeposit + (this.securityDeposit * 18) / 100)),
                    paymentPlan: Number(this.projectsData.paymentPlan)
                  }

                  this.apiService.postAPI(`api/payment/addClientPayment`, formData2).subscribe({
                    next: (res: any) => {
                      if (res.success == true) {
                        this.router.navigate(['/user'])
                      }
                    }
                  })
                }
              }
            })
          },
          prefill: {
            name: this.userData.name,
            email: this.userData.email,
            contact: this.userData.phoneNumber,
          },
          method: this.paymentMethods,
          theme: {
            color: '#1b83c1'
          }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
      }
    });
  }

  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptId = 'razorpay-script';
      if (document.getElementById(scriptId)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }


  openCalendly() {
    console.log("here1");
    // Calendly.initPopupWidget({ url: 'https://calendly.com/amitholkar/30min' });
    Calendly.initPopupWidget({ url: 'https://calendly.com/mohdfaraz-ctinfotech/30min' });
  };

  // ngAfterViewInit() {
  //   const calendlyContainer = document.getElementById('calendly-inline-widget');
  //   if (calendlyContainer) {
  //     Calendly.initInlineWidget({
  //       url: 'https://calendly.com/amitholkar/30min',
  //       parentElement: calendlyContainer
  //     });
  //   }
  // }

  ngAfterViewInit() {
    console.log("here2");
    Calendly.initInlineWidget({
      // url: 'https://calendly.com/amitholkar/30min',
      url: 'https://calendly.com/mohdfaraz-ctinfotech/30min',
      parentElement: document.getElementById('calendly-inline-widget'),
      prefill: {},
      utm: {},
      onEventScheduled: (e: any) => {
        console.log('Event scheduled:', e);
        // this.sendConfirmationEmail();
      }
    });
    window.addEventListener('message', this.handleCalendlyEvent.bind(this));
  };

  handleCalendlyEvent(e: MessageEvent) {
    if (e.origin === 'https://calendly.com' && e.data.event === 'calendly.event_scheduled') {
      console.log('Calendly event scheduled:', e.data);
      this.sendConfirmationEmail();
    }
  };

  sendConfirmationEmail() {
    this.apiService.getApi(`api/user/sendClientEnquiryEmail?inquiryId=${this.projectsData.clientEnquryId}`).subscribe({
      next: (res: any) => {
        if (res.success) {
        }
      }, error(err) {
        // this.message.error(err.error.message)
      },
    })
  }

  ngOnDestroy() {
    // Clean up the listener to avoid memory leaks
    window.removeEventListener('message', this.handleCalendlyEvent.bind(this));
  }
}
