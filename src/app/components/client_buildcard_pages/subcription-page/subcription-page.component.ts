import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';
import { SubcriptionService } from '../../../services/subcription.service';
import { SubscriptionResponse } from '../../../models/subcription';
import { RouterLink } from '@angular/router';
type BillingCycle = 'MONTH' | 'YEAR';
type PlanType = 'free' | 'personal' | 'creative' | 'booster' | 'pro' | 'business';

interface Plan {
  id: number;
  plan_key: string;
  plan_name: string;
  cashfree_plan_id: string;
  amount: number;
  currency: string;
  display_amount: string;
  display_currency: string;
  billing_interval: BillingCycle;
  project_limit: number;
  template_limit: number;
  created_at: string;
  plan_type: 'FREE' | 'PRO' | 'BUSINESS' | string;
  variation_limit: number;
  can_deploy: number;
  support_type: 'NONE' | 'CHAT' | 'PRIORITY' | string;
  github_integration: number;
  custom_features: number;
  is_active: number;
  test_mode: number;
  can_delete: number;
  has_intro_offer: number;
  intro_amount: string;
}
declare var window: any;
@Component({
  selector: 'app-subcription-page',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, NgxIntlTelInputModule, CalendlyDirective, RouterLink],
  templateUrl: './subcription-page.component.html',
  styleUrl: './subcription-page.component.css'
})
export class SubcriptionPageComponent {
  @Input() subscriptionModalOpen = false;
  @Input() selectedTemplateId = '';


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
  subscriptionPlan!: SubscriptionResponse;
  allPlans: Plan[] = [];
  orginalPlans: Plan[] = [];
  selectedPlanData: Plan | null = null;
  private currencySymbolMap: Record<string, string> = {
    INR: '\u20B9',
    USD: '$',
    EUR: 'EUR ',
    GBP: 'GBP '
  };
  constructor(private apiService: ApiService, private fb: FormBuilder, private subscriptionService: SubcriptionService) {
    const projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    console.log(this.selectedTemplateId);
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
    this.billingCycle.set(cycle);
    this.allPlans = this.sortPlans(this.orginalPlans);
  }

  setBillingCycle(cycle: BillingCycle) {
    this.setBilling(cycle);
  }

  get visiblePlans(): Plan[] {
    const freePlan = this.allPlans.find(plan => plan.plan_type === 'FREE');
    const selectedPlans = this.allPlans.filter(
      plan => plan.plan_type !== 'FREE' && plan.billing_interval === this.billingCycle()
    );

    return [...(freePlan ? [freePlan] : []), ...selectedPlans];
  }

  selectPlan(plan: PlanType) {
    this.selectedPlan.set(plan);
  }

  getStarted(planData: Plan) {
    this.close.emit();
    this.selectedPlan.set(this.mapPlanType(planData));
    this.subscriptionModalOpen = false;
    this.billingSummaryModalOpen = true;
    this.selectedPlanData = planData;
    this.setBillingCycle(planData.billing_interval);
  }


  planKey = computed(() => {
    if (this.selectedPlanData?.plan_key) {
      return this.selectedPlanData.plan_key;
    }

    return `${this.selectedPlan()}_${this.billingCycle() == 'MONTH' ? 'monthly' : 'yearly'}`;
  });

  initiateSubscriptionCheckout(billingDetails: any) {
    const inquiryId = this.projectsData?.clientEnquryId ?? null;
    this.apiService.postAPI('api/payment/create-subscription', {
      planKey: this.planKey(),
      user: billingDetails,
      publicTemplateId: this.selectedTemplateId,
      inquiryId
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
      phoneNumber: raw.phoneNumber.e164Number,
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
    this.apiService.getApi<SubscriptionResponse>(`api/user/getMySubscription`)
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
          this.orginalPlans = this.sortPlans(Array.isArray(res?.data) ? res.data : []);
          this.allPlans = [...this.orginalPlans];
        },
        error: err => {
          // this.loading = false
        }
      });
  }

  formatPrice(plan: Plan): string {
    const currency = plan?.display_currency || plan?.currency || 'INR';
    const symbol = this.currencySymbolMap[currency] || `${currency} `;
    const amount = Number(plan?.display_amount ?? plan?.amount ?? 0);
    const formatted = amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
  }

  billingLabel(interval: string): string {
    return interval === 'YEAR' ? 'Year' : 'Month';
  }

  supportLabel(type: string): string {
    switch (type) {
      case 'CHAT':
        return 'Chat Support';
      case 'PRIORITY':
        return 'Priority Support';
      case 'NONE':
        return 'Basic Support';
      default:
        return 'Support';
    }
  }

  planDescription(plan: Plan): string {
    switch (plan?.plan_type) {
      case 'FREE':
        return 'Perfect for individuals to build, launch, and manage a single project with essential tools.';
      case 'PRO':
        return 'Built for creators and teams to design, customize, and scale high-impact projects.';
      case 'BUSINESS':
        return 'Ideal for growing teams that need advanced controls, integrations, and priority support.';
      default:
        return 'Choose the plan that matches your needs and scale as you grow.';
    }
  }

  priceSubLabel(plan: Plan): string {
    return plan.plan_type === 'FREE' ? '/Always Free' : `/${this.billingLabel(plan.billing_interval)}`;
  }

  planFeatures(plan: Plan): string[] {
    const features = [
      `${plan.project_limit} Project${plan.project_limit > 1 ? 's' : ''}`,
      `${plan.template_limit} Template${plan.template_limit > 1 ? 's' : ''}`,
      `${plan.variation_limit} Variation${plan.variation_limit > 1 ? 's' : ''}`,
      this.supportLabel(plan.support_type)
    ];

    if (plan.can_deploy) {
      features.push('Deployment Access');
    }

    if (plan.github_integration) {
      features.push('GitHub Integration');
    }

    if (plan.custom_features) {
      features.push('Custom Features');
    }

    return features;
  }

  isFeaturedPlan(plan: Plan): boolean {
    return plan.plan_type === 'PRO';
  }

  badgeLabel(plan: Plan): string {
    if (plan.plan_type === 'FREE') {
      return 'Free';
    }

    if (this.isFeaturedPlan(plan)) {
      return 'Most Popular';
    }

    return plan.plan_type;
  }

  formatMessageWithLocalDate(message: string): string {

    if (!message) return '';

    if (message.includes('until')) {

      const parts = message.split('until');

      const before = parts[0];
      const datePart = parts[1]?.trim();

      if (datePart) {

        const parsedDate = new Date(datePart);

        if (!isNaN(parsedDate.getTime())) {

          const formattedDate = parsedDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          return `${before}until ${formattedDate}`;
        }
      }
    }

    return message;
  }

  private mapPlanType(plan: Plan): PlanType {
    const normalizedType = (plan?.plan_type || '').toUpperCase();

    switch (normalizedType) {
      case 'FREE':
        return 'free';
      case 'PRO':
        return 'pro';
      case 'BUSINESS':
        return 'business';
      default:
        return 'creative';
    }
  }

  private sortPlans(plans: Plan[]): Plan[] {
    const planTypeOrder: Record<string, number> = {
      FREE: 0,
      PRO: 1,
      BUSINESS: 2
    };

    return [...plans].sort((a, b) => {
      const typeDifference = (planTypeOrder[a.plan_type] ?? 99) - (planTypeOrder[b.plan_type] ?? 99);

      if (typeDifference !== 0) {
        return typeDifference;
      }

      if (a.plan_type === 'FREE' && b.plan_type === 'FREE') {
        return 0;
      }

      return a.billing_interval === 'MONTH' && b.billing_interval === 'YEAR' ? -1 : 1;
    });
  }

}
