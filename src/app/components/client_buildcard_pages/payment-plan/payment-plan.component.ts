import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Feature } from '../../../models/projects';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { ProjectData, SelectedFeature } from '../../../models/sessionData';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { MobileViewComponent } from "../main/mobile-view/mobile-view.component";
import { ExchangeRatePipe } from '../../../helper/exchange-rate.pipe';
import { ModalService } from '../../../services/modal.service';
import { HttpClient } from '@angular/common/http';
declare var bootstrap: any;
declare var Calendly: any;
declare var window: any;
@Component({
  selector: 'app-payment-plan',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, SidebarComponent, MobileViewComponent, ExchangeRatePipe],
  templateUrl: './payment-plan.component.html',
  styleUrl: './payment-plan.component.css'
})
export class PaymentPlanComponent {
  projectsFeatures: SelectedFeature[] = [];
  today: Date = new Date();
  projectsData: ProjectData;
  totalSubFeatures: any;
  total_cost_delivery!: number;
  paymentPlan = '2';
  noOfInstallments!: number;
  installmentType!: string;
  actualCost: number | null | undefined
  securityDeposit!: number
  installmentDates: any[] = []
  rate: any;
  private modal = inject(ModalService);
  billingDetails: any
  userData: any;
  currencyCode = 'INR';
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService, private http: HttpClient) {
    effect(() => {
      this.rate = this.apiService._rate()
    })
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.total_cost_delivery = this.projectsData.total_cost_delivery;
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
    if (this.projectsData.projectLogo) {
      this.apiService._imagePreview.set(this.projectsData.projectLogo);
    }
    this.onPaymentChange('2')
    if (this.projectsData.installmentType) {
      this.onInstallmentChange(this.projectsData.installmentType)
    }

    this.userData = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    this.currencyCode = this.userData.currency;
  };

  ngOnInit(): void {
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
      this.generateInstallemnts(this.projectsData.estimated_time)
    }
  };

  onInstallmentChange(type: any) {
    const today = new Date()
    if (type == 'weekly') {
      this.noOfInstallments = this.projectsData.estimated_time;
      this.installmentType = 'weekly'
      const dates = []
      for (let i = 0; i < this.projectsData.estimated_time; i++) {
        today.setDate(today.getDate() + 7)
        dates.push(new Date(today).toISOString())
      }
      this.installmentDates = dates
    } else {
      this.noOfInstallments = Math.trunc(this.projectsData.estimated_time / 4);
      this.installmentType = 'monthly'
      const dates = []
      for (let i = 0; i < this.noOfInstallments; i++) {
        today.setMonth(today.getMonth() + 1)
        dates.push(new Date(today).toISOString())
      }
      this.installmentDates = dates
    }
  };

  generateInstallemnts(weeks: number) {
    const today = new Date()
    if (this.installmentType == 'weekly') {
      this.noOfInstallments = weeks;
      const dates = []
      for (let i = 0; i < weeks; i++) {
        today.setDate(today.getDate() + 7)
        dates.push(new Date(today).toISOString())
      }
      this.installmentDates = dates
    } else {
      this.noOfInstallments = Math.trunc(weeks / 4);
      const dates = []
      for (let i = 0; i < this.noOfInstallments; i++) {
        today.setMonth(today.getMonth() + 1)
        dates.push(new Date(today).toISOString())
      }
      this.installmentDates = dates
      this.installmentType = 'monthly'
    }
  }

  Navigate() {
    let formData = undefined
    if (this.paymentPlan == '2') {
      formData = {
        payment_plan: this.paymentPlan == '2' ? 'Installment' : 'Upfront',
        installment_type: this.installmentType,
        tax_amount: (this.total_cost_delivery * 18) / 100,
        final_cost_with_tax_discount: (this.actualCost! * 20) / 100,
        security_deposit: this.securityDeposit,
        currentRoutes: this.router.url,
        installmentPlan: this.installmentDates.map((ele) => {
          return {
            dueDate: ele,
            projectStage: "Development",
            amount: (this.actualCost! - this.securityDeposit) / this.noOfInstallments
          }
        })
      }
    } else {
      formData = {
        payment_plan: this.paymentPlan == '1' ? 'Upfront' : 'Installment',
        tax_amount: (this.total_cost_delivery * 18) / 100,
        currentRoutes: this.router.url,
        final_cost_with_tax_discount: this.total_cost_delivery + (this.total_cost_delivery * 18) / 100 - ((this.total_cost_delivery + (this.total_cost_delivery * 18) / 100) * 10) / 100
      }
    }

    this.apiService.postAPI(`api/user/addClientPaymentPlan?inquiryId=${this.projectsData.clientEnquryId}`, formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          sessionStorage.setItem('projectData', JSON.stringify({ ...this.projectsData, ...{ paymentPlan: this.paymentPlan }, ...{ installmentType: this.installmentType }, ...{ final_cost_with_tax_discount: formData.final_cost_with_tax_discount } }))
          this.router.navigate(['/payment-option'])
        }
      }, error(err) {
        // this.message.error(err.error.message)
      },
    })
  };

  openCalendly() {
    console.log("here1");
    Calendly.initPopupWidget({ url: 'https://calendly.com/mohdfaraz-ctinfotech/30min' });
  };

  ngAfterViewInit() {
    console.log("here2");
    const calendlyContainer = document.getElementById('calendly-inline-widget');
    if (calendlyContainer) {
      Calendly.initInlineWidget({
        url: 'https://calendly.com/creativethoughts/30min',
        parentElement: calendlyContainer,
      });
    }
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

      },
    })
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.handleCalendlyEvent.bind(this));
  }

  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }


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
    console.log(user);
    this.http
      .post(this.apiService.apiUrl + 'api/payment/create-order', {
        // amount: this.orderAmount,
        amount: Math.floor((this.actualCost! * 20) / 100),
        user,
        currency: this.currencyCode,
        clientEnquryId: this.projectsData.clientEnquryId,
        currentRoutes: this.router.url,
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
