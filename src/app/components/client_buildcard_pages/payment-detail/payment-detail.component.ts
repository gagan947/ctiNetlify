import { Component, effect, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SelectedFeature, ProjectData } from '../../../models/sessionData';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { MobileViewComponent } from '../main/mobile-view/mobile-view.component';
import { ExchangeRatePipe } from '../../../helper/exchange-rate.pipe';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';
import { ModalService } from '../../../services/modal.service';
declare var Razorpay: any;
declare var Calendly: any;
declare var cashfree: any;
declare var window: any;
@Component({
  selector: 'app-payment-detail',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, MobileViewComponent, ExchangeRatePipe, CalendlyDirective],
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
  rate: any;
  currencyCode = 'INR';
  orderId: string = '';
  orderAmount: number = 100; // in INR
  customerName: string = 'faraz';
  customerEmail: string = '23546ASD';
  customerPhone: string = '+919090407368';
  private modal = inject(ModalService);
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService, private http: HttpClient) {
    effect(() => {
      this.rate = this.apiService._rate()
    })
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.totalCost = this.orderAmount = this.projectsData.finalCost;
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
    this.apiService._imagePreview.set(this.projectsData.projectLogo);
    this.onPaymentChange(this.projectsData.paymentPlan)

    this.userData = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    // const user = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    this.currencyCode = this.userData.currency;
    this.generateOrderId()
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
          this.router.navigate(['/payment-option'])
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
    debugger
    this.apiService.postAPI(`api/payment/createRazorpayOrder`, { amount: formData.amount, currency: this.currencyCode }).subscribe({
      next: (data: any) => {
        const options: any = {
          // key: 'rzp_test_nyohAyx081ZtAn', // test key
          key: 'rzp_live_RQZRNuAawKMTzH', // live key
          amount: data.amount,
          currency: this.currencyCode,
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
    Calendly.initPopupWidget({ url: 'https://calendly.com/mohdfaraz-ctinfotech/30min' });
  };


  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }


  generateOrderId() {
    this.orderId = 'order_' + Math.random().toString(36).substr(2, 9);
  }

  async initializePayment() {
    try {
      // Create order in backend
      const orderResponse: any = await this.http.post(this.apiService.apiUrl + 'api/payment/create-order', {
        orderAmount: this.orderAmount,
        orderCurrency: this.currencyCode, // Use 'USD', 'EUR' for international
        customerName: this.customerName,
        customerEmail: this.customerEmail,
        customerPhone: this.customerPhone
      }).toPromise();

      if (orderResponse.success) {
        // this.openCashfreeCheckout(orderResponse.paymentSessionId);
      } else {
        console.log('Error creating order:', orderResponse.error);
        alert('Failed to create order: ' + orderResponse.error);
      }
    } catch (error) {
      console.log('Error creating order:', error);
      // alert('Failed to initialize payment');
    }
  }

  // openCashfreeCheckout(sessionId: string) {
  //   try {
  //     if (typeof Cashfree === 'undefined') {
  //       console.error('Cashfree SDK not loaded yet');
  //       return;
  //     }

  //     // Initialize Cashfree SDK
  //     const cashfree = new Cashfree({
  //       mode: 'sandbox', // Change to 'production' for live mode
  //     });

  //     // Call pay(), not checkout()
  //     cashfree.pay({
  //       paymentSessionId: sessionId,
  //       redirectTarget: "_self" // or "_blank" if you want new tab
  //     });

  //   } catch (error) {
  //     console.error('Error launching Cashfree checkout:', error);
  //   }
  // }
  async verifyPayment(orderId: string) {
    try {
      const verificationResponse: any = await this.http.post('/verify-payment', {
        orderId: orderId
      }).toPromise();

      if (verificationResponse.success) {
        const status = verificationResponse.orderStatus;
        if (status === 'PAID') {
          alert('Payment Successful!');
          // Handle successful payment
        } else {
          alert(`Payment Status: ${status}`);
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
    }
  }

  initiateCheckout() {

    this.http
      .post(this.apiService.apiUrl + 'api/payment/create-order', {
        amount: this.orderAmount,
        customerId: 'customer123',
        customerPhone: '9999999999',
        customerEmail: 'customer@example.com',
      })
      .subscribe(
        (response: any) => {
          const paymentSessionId = response.payment_session_id;

          const checkoutOptions = {
            paymentSessionId,
            returnUrl: 'http://localhost:4200/payment-status',
          };

          const cashfree = new window.Cashfree({
            paymentSessionId: paymentSessionId,
            mode: 'sandbox' // Use 'production' for live transactions
          });
          cashfree.checkout(checkoutOptions).then((result: any) => {
            if (result.error) {
              alert(result.error.message);
            } else if (result.redirect) {
              console.log('Redirecting to payment page...');
            }
          });
        },
        (error) => {
          console.error('Error initiating checkout:', error);
        }
      );
  }
}
