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
  discount_percent?: number;
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
  freePlans: Plan[] = [];
  proPlans: Plan[] = [];
  businessPlans: Plan[] = [];
  selectedProPlan: Plan | null = null;
  proDropdownOpen = false;
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
    this.proDropdownOpen = false;
    this.getAllPlans();
  }

  setBillingCycle(cycle: BillingCycle) {
    this.setBilling(cycle);
  }

  get freePlan(): Plan | null {
    return this.freePlans[0] || null;
  }

  get businessPlan(): Plan | null {
    return this.businessPlans[0] || null;
  }

  get proDropdownPlans(): Plan[] {
    if (!this.selectedProPlan) {
      return this.proPlans;
    }

    return this.proPlans.filter((plan) => plan.id !== this.selectedProPlan?.id);
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

  toggleProDropdown(event: Event) {
    event.stopPropagation();
    this.proDropdownOpen = !this.proDropdownOpen;
  }

  selectProPlan(plan: Plan, event?: Event) {
    event?.stopPropagation();
    this.selectedProPlan = plan;
    this.proDropdownOpen = false;
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

  showIntroOffer(plan: Plan): boolean {
    return !!plan.has_intro_offer && Number(plan.intro_amount) > 0;
  }

  introOfferLabel(plan: Plan): string {
    return `First-time subscription fee ${this.formatCurrency(plan.intro_amount, plan.currency)}`;
  }

  billedNowAmount(plan: Plan | null): string {
    if (!plan) {
      return this.formatCurrency(0, 'INR');
    }

    const amount = this.showIntroOffer(plan) ? plan.intro_amount : plan.amount;
    return this.formatCurrency(amount, plan.currency);
  }

  renewalLabel(plan: Plan): string {
    if (!this.showIntroOffer(plan)) {
      return '';
    }

    return `Then ${this.formatCurrency(plan.amount, plan.currency)}${this.priceSubLabel(plan).toLowerCase()} from the next billing cycle`;
  }

  formatCurrency(amount: string | number, currency?: string): string {
    const currencyCode = currency || 'INR';
    const symbol = this.currencySymbolMap[currencyCode] || `${currencyCode} `;
    const value = Number(amount ?? 0);
    const formatted = value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
  }

  openCashfreeSubscriptionCheckout(subscriptionSessionId: string) {
    if (!subscriptionSessionId) {
      console.error("Missing subscription_session_id!");
      return;
    }
    const cashfree = new (window as any).Cashfree({
      // mode: "production",
      mode: "sandbox",
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
    this.apiService.getAllPlans<any>(this.billingCycle())
      .subscribe({
        next: (res: any) => {
          this.freePlans = res?.data?.free || [];
          this.proPlans = res?.data?.pro || [];
          this.businessPlans = res?.data?.business || [];

          const previousSelectedId = this.selectedProPlan?.id;
          this.selectedProPlan =
            this.proPlans.find((plan) => plan.id === previousSelectedId) || this.proPlans[0] || null;
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

  getDisplayAmount(plan: Plan | null): string {
    return plan?.display_amount || '0.00';
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

  getBillingSuffix(plan: Plan | null): string {
    return `/${(plan?.billing_interval || this.billingCycle()).toLowerCase()}`;
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

  hasDiscount(plan: Plan | null): boolean {
    return !!plan && Number(plan.discount_percent || 0) > 0;
  }

  getDiscountLabel(plan: Plan | null): string {
    return `${Number(plan?.discount_percent || 0)}% Off`;
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
}
