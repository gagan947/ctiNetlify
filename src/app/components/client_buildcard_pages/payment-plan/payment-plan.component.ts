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
declare var bootstrap: any;
declare var Calendly: any;
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
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService) {
    effect(() => {
      this.rate = this.apiService._rate()
    })
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.total_cost_delivery = this.projectsData.total_cost_delivery;
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
    this.apiService._imagePreview.set(this.projectsData.projectLogo);
    if (this.projectsData.paymentPlan) {
      this.onPaymentChange(this.projectsData.paymentPlan)
    } else {
      this.onPaymentChange('2')
    }
    if (this.projectsData.installmentType) {
      this.onInstallmentChange(this.projectsData.installmentType)
    }
  };

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
    const calendlyContainer = document.getElementById('calendly-inline-widget');
    if (calendlyContainer) {
      Calendly.initInlineWidget({
        url: 'https://calendly.com/creativethoughts/30min',
        parentElement: calendlyContainer,
      });
    }
    // window.addEventListener('message', this.handleCalendlyEvent.bind(this));
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

  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }
}
