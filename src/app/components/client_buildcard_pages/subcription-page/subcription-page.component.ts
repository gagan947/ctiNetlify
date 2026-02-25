import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';
import { SubcriptionService } from '../../../services/subcription.service';
type BillingCycle = 'MONTH' | 'YEAR';
type PlanType = 'free' | 'personal' | 'creative' | 'booster';
declare var window: any;
@Component({
  selector: 'app-subcription-page',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, NgxIntlTelInputModule, CalendlyDirective],
  templateUrl: './subcription-page.component.html',
  styleUrl: './subcription-page.component.css'
})
export class SubcriptionPageComponent {
  @Input() subscriptionModalOpen = false;
  @Output() close = new EventEmitter<void>();
  billingSummaryModalOpen = false;
  showCalendly = false;
  billingCycle = signal<BillingCycle>('MONTH');
  projectsData: any;
  billingDetails = {
    name: '',
    email: '',
    phoneNumber: ''
  };
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO
  selectedPlan = signal<PlanType>('creative');
  subscriptionPlan: any;
  allPlans: any;
  orginalPlans: any
  selectedPlanData: any;
  constructor(private apiService: ApiService, private fb: FormBuilder, private subscriptionService: SubcriptionService) {
    const projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
  }

  ngOnInit(): void {
    this.getAllPlans();
    this.getUserSubscriptionPlan();
  }

  billingForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [null as any, Validators.required]
  });

  setBilling(cycle: BillingCycle) {
    this.allPlans = this.orginalPlans.filter((plan: any) => plan.billing_interval.includes(cycle));
    this.billingCycle.set(cycle);
  }


  selectPlan(plan: PlanType) {
    this.selectedPlan.set(plan);
  }

  getStarted(plan: PlanType, planData: any) {
    this.close.emit();
    this.selectedPlan.set(plan);
    this.subscriptionModalOpen = false;
    this.billingSummaryModalOpen = true;
    this.selectedPlanData = planData;
    this.setBilling(planData.billing_interval);
  }


  planKey = computed(() => {
    return `${this.selectedPlan()}_${this.billingCycle()}`;
  });

  initiateSubscriptionCheckout(billingDetails: any) {
    this.apiService.postAPI('api/payment/create-subscription', {
      planKey: this.planKey(),
      user: billingDetails
    }).subscribe((res: any) => {
      // ⬇️ THIS IS THE KEY
      this.openCashfreeSubscriptionCheckout(res.subscription_session_id);
    });
  }

  isInvalid(controlName: string) {
    const control = this.billingForm.get(controlName);
    return control?.invalid && control?.touched;
  }

  confirmAndPay() {
    if (this.billingForm.invalid) {
      this.billingForm.markAllAsTouched();
      return;
    }

    const raw = this.billingForm.getRawValue();

    const billingDetails = {
      name: raw.name,
      email: raw.email,
      phoneNumber: raw.phoneNumber.e164Number, // ✅ USE THIS
      countryCode: raw.phoneNumber.countryCode
    };

    this.initiateSubscriptionCheckout(billingDetails)
  }

  openCashfreeSubscriptionCheckout(subscriptionSessionId: string) {
    if (!subscriptionSessionId) {
      console.error("Missing subscription_session_id!");
      return;
    }
    const cashfree = new (window as any).Cashfree({
      mode: "production",
      // mode: "sandbox",
    });

    cashfree
      .subscriptionsCheckout({
        subsSessionId: subscriptionSessionId,
        redirectTarget: "_blank",
      })
      .then((result: any) => {
        if (result.error) {
          console.error("Cashfree subscription error:", result.error.message);
          alert(result.error.message);
        } else if (result.redirect) {
          console.log("Redirecting to Cashfree subscription checkout...");
        }
      })
      .catch((err: any) => {
        console.error("Unexpected Cashfree subscription error:", err);
      });
  }

  closeModal() {
    this.close.emit();
    this.subscriptionModalOpen = false;
    this.billingSummaryModalOpen = false;
    this.showCalendly = false;
  }


  openCalednlyModal() {
    this.subscriptionModalOpen = false;
    this.billingSummaryModalOpen = false;
    this.showCalendly = true;
  }
  getUserSubscriptionPlan() {
    this.apiService.getApi(`api/user/getMySubscription`)
      .subscribe({
        next: (res) => {
          this.subscriptionPlan = res;
        },
        error: err => {
          // this.loading = false
        }
      });
  }

  getAllPlans() {
    this.apiService.getApi(`api/user/getAllPlans`)
      .subscribe({
        next: (res: any) => {
          this.allPlans = this.orginalPlans = res.data;
          this.allPlans = this.allPlans.filter((plan: any) => plan.billing_interval.includes(this.billingCycle()));
        },
        error: err => {
          // this.loading = false
        }
      });
  }

}
