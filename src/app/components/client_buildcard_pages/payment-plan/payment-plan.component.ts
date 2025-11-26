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
    this.getRates(this.currencyCode);
 
  };

  ngOnInit(): void {
    this.getBillingDetails();
    
  }

  onPaymentChange(id: any) {
    if (id == 1) {
      this.total_cost_delivery = this.projectsData.total_cost_delivery
      this.actualCost = null
    } else {
      this.paymentPlan = '2'
      this.actualCost = this.projectsData.total_cost_delivery * 1.18 * 0.90;
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

  openCalendly() {
 
    Calendly.initPopupWidget({ url: 'https://calendly.com/mohdfaraz-ctinfotech/30min' });
  };

  ngAfterViewInit() {
    
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
      name: this.billingDetails.full_name,
      email: this.billingDetails.email,
      phoneNumber: this.billingDetails.phoneNumber,
      addressLine1: this.billingDetails.address_line_1,
      addressLine2: this.billingDetails.address_line_2,
      city: this.billingDetails.city,
      state: this.billingDetails.state,
      pincode: this.billingDetails.postal_code,
    }

  
    this.http.post(this.apiService.apiUrl + 'api/payment/create-order', {
        amount: Math.floor(this.securityDeposit * this.rate),
        user,
        currency: this.currencyCode,
        clientEnquryId: this.projectsData.clientEnquryId,
        currentRoutes: this.router.url,
    })
    .subscribe(
      (response: any) => {
  console.log(response.data);
  console.log(response.data.cf_offer_id);
  
        const paymentSessionId = response?.data?.payment_session_id;
        const cf_offer_id = response?.data?.cf_offer_id;
  
        if (!paymentSessionId) {
          alert("Payment session missing");
          return;
        }
  
        // ✔ Correct initialization (no session here)
        const cashfree = new window.Cashfree({ mode: "production" });
  
        // ✔ Correct checkout call
        cashfree.checkout({
          paymentSessionId: paymentSessionId, // EXACT KEY
          redirectTarget: "_self"
        })
        .then((result: any) => {
          if (result.error) {
            console.error(result.error);
            alert(result.error.message);
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
        },
        error: (err) => {
          console.error('Error fetching blogs:', err);
        }
      });
  }

  getRates(base: any) {
    const key = '5606f101bb2a1853bbe166f02ed4633c'; // mohd faraz acount key
    const today = new Date().toISOString().split('T')[0];

    if (base === 'INR') {
      this.rate = 1
      return;
    } else {
      let params = {
        currency_code: base,
        date: today
      };

      this.apiService.getApi(`api/user/getCurrencyRate?${new URLSearchParams(params).toString()}`).subscribe({
        next: (res: any) => {
          if (res.success) {
            if (res.data.length > 0) {
              this.rate = Number(res.data[0].rate);
            } else {
              const url = `https://api.exchangerate.host/live?access_key=${key}&source=INR&currencies=AUD,AED,SGD,USD,EUR,GBP`;
              this.http.get(url).subscribe((res: any) => {
                if (res.success) {

                  this.rate = res.quotes[`INR${base}`];
                  const result = Object.entries(res.quotes).map(([key, value]) => {
                    return { [key.replace("INR", "")]: value };
                  });

                  this.apiService.postAPI('api/user/updateCurrencyRate', {
                    rate: result,
                    todays_date: today
                  }).subscribe();
                }
              });
            }
          }
        },
        error: err => {
          console.log(err);
        }
      });
    }
  }
}
