import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SelectedFeature, ProjectData } from '../../../models/sessionData';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { MobileViewComponent } from '../main/mobile-view/mobile-view.component';
import { ExchangeRatePipe } from '../../../helper/exchange-rate.pipe';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';
import { ModalService } from '../../../services/modal.service';
import { WorkspaceHeaderComponent } from "../workspace-header/workspace-header.component";
declare var Razorpay: any;
declare var Calendly: any;
declare var cashfree: any;
declare var window: any;
@Component({
  selector: 'app-payment-detail',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, MobileViewComponent, ExchangeRatePipe, CalendlyDirective, WorkspaceHeaderComponent],
  templateUrl: './payment-detail.component.html',
  styleUrl: './payment-detail.component.css'
})
export class PaymentDetailComponent {
  projectsFeatures: SelectedFeature[] = [];
  today: Date = new Date();
  projectsData: ProjectData;
  totalSubFeatures: any;
  total_cost_delivery!: number;
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
  billingDetails: any
  constructor(private apiService: ApiService, private router: Router, private http: HttpClient) {
    effect(() => {
      this.rate = this.apiService._rate()
    })
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.total_cost_delivery = this.orderAmount = this.projectsData.total_cost_delivery;
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
    this.apiService._imagePreview.set(this.projectsData.projectLogo);
    this.onPaymentChange(this.projectsData.paymentPlan)

    this.userData = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    // const user = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    this.currencyCode = this.userData.currency;
    this.generateOrderId()
  };
  ngOnInit() {
    this.getBillingDetails()
  }

  onPaymentChange(id: any) {
    if (id == 1) {
      this.total_cost_delivery = this.projectsData.total_cost_delivery
      this.actualCost = null
    } else {
      this.paymentPlan = '2'
      this.actualCost = this.projectsData.total_cost_delivery + (this.projectsData.total_cost_delivery * 18) / 100 - ((this.projectsData.total_cost_delivery + (this.projectsData.total_cost_delivery * 18) / 100) * 10) / 100
      this.securityDeposit = (this.actualCost * 20) / 100
    }
  };


  Navigate() {

    let formData = undefined
    if (this.paymentPlan == '2') {
      formData = {
        paymentPlan: this.paymentPlan == '2' ? 'Installment' : 'Upfront',
        installmentType: this.installmentType,
        taxes: (this.total_cost_delivery * 18) / 100,
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
        taxes: (this.total_cost_delivery * 18) / 100,
        currentRoutes: this.router.url,
        gstTotalCost: this.total_cost_delivery + (this.total_cost_delivery * 18) / 100 - ((this.total_cost_delivery + (this.total_cost_delivery * 18) / 100) * 10) / 100
      }
    }

    this.apiService.postAPI(`api/user/addClientPaymentPlan?inquiryId=${this.projectsData.clientEnquryId}`, formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.router.navigate(['/payment-option'])
        }
      }, error() {
        // this.message.error(err.error.message)
      },
    })
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
  // One time payment code starts from here 
  initiateCheckout() {
    const user = {
      name: this.billingDetails.name,
      email: this.billingDetails.email,
      phoneNumber: this.billingDetails.phoneNumber,
      addressLine1: this.billingDetails.address_line_1,
      addressLine2: this.billingDetails.address_line_2,
      city: this.billingDetails.city,
      state: this.billingDetails.state,
      pincode: this.billingDetails.postal_code,
    }

    this.http
      .post(this.apiService.apiUrl + 'api/payment/create-order', {
        // amount: this.orderAmount,
        amount: Math.floor(this.projectsData.final_cost_with_tax_discount),
        user,
        currency: this.currencyCode,
        clientEnquryId: this.projectsData.clientEnquryId
      })
      .subscribe(
        (response: any) => {
          const paymentSessionId = response.payment_session_id;

          const checkoutOptions = {
            paymentSessionId,
            redirectTarget: '_self',
          };

          const cashfree = new window.Cashfree({
            paymentSessionId: paymentSessionId,
            mode: 'sandbox',

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
  getBillingDetails(): void {
    this.apiService.getApi(`api/user/getBillingDetails?id=${this.projectsData.clientEnquryId}`)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.billingDetails = JSON.parse(res.data.billing_details)[0]
          }
          console.log('Blogs:', this.billingDetails);
        },
        error: (err) => {
          console.error('Error fetching blogs:', err);
        }
      });
  }
}
