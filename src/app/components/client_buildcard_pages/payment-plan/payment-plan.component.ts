import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Feature } from '../../../models/projects';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { ProjectData, SelectedFeature } from '../../../models/sessionData';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";
declare var bootstrap: any;
declare var Calendly: any;
@Component({
  selector: 'app-payment-plan',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, SidebarComponent],
  templateUrl: './payment-plan.component.html',
  styleUrl: './payment-plan.component.css'
})
export class PaymentPlanComponent {
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
  installmentDates: any[] = []
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.totalCost = this.projectsData.finalCost;
    this.projectsFeatures = this.projectsData.selectdFeature;
    if (this.projectsData.paymentPlan) {
      this.onPaymentChange(this.projectsData.paymentPlan)
    }
    if (this.projectsData.installmentType) {
      this.onInstallmentChange(this.projectsData.installmentType)
    }
  };

  onPaymentChange(id: any) {
    if (id == 1) {
      this.totalCost = this.projectsData.finalCost
      this.actualCost = null
    } else {
      this.paymentPlan = '2'
      this.actualCost = this.projectsData.finalCost + (this.projectsData.finalCost * 18) / 100
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
          sessionStorage.setItem('projectData', JSON.stringify({ ...this.projectsData, ...{ paymentPlan: this.paymentPlan }, ...{ installmentType: this.installmentType } }))
          this.router.navigate(['/payment-detail'])
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

  sendConfirmationEmail(){
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
