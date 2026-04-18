import { Component, computed, inject, Input, Optional, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';
import { SubcriptionService } from '../../../services/subcription.service';
import { SubscriptionResponse } from '../../../models/subcription';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { SubscriptionModalData, SubscriptionModalResult } from '../../../services/subscription-modal.service';
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
  created_at: string;
  plan_type: 'FREE' | 'PRO' | 'BUSINESS' | string;
  credits_per_cycle: number;
  credit_grant_interval?: BillingCycle;
  max_projects: number;
  max_pages: number;
  topup_allowed?: number;
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
  is_plan_used?: boolean;
  is_current_plan?: boolean;
  credit_plan_key?: string;
}
declare var window: any;
@Component({
  selector: 'app-subcription-page',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, NgxIntlTelInputModule, CalendlyDirective],
  templateUrl: './subcription-page.component.html',
  styleUrl: './subcription-page.component.css'
})
export class SubcriptionPageComponent {
  @Input() selectedTemplateId = '';
  billingSummaryModalOpen = false;
  showCalendly = false;
  billingCycle = signal<BillingCycle>('MONTH');
  projectsData: any;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO
  selectedPlan = signal<PlanType>('creative');
  subscriptionPlan!: SubscriptionResponse;
  freePlans: Plan[] = [
    {
      "id": 1,
      "plan_key": "free_plan",
      "plan_name": "Free Plan",
      "cashfree_plan_id": "",
      "amount": 0,
      "currency": "INR",
      "display_amount": "0.00",
      "display_currency": "INR",
      "billing_interval": "MONTH",
      "created_at": "2026-04-16T07:51:13.000Z",
      "plan_type": "FREE",
      "is_active": 1,
      "test_mode": 0,
      "has_intro_offer": 0,
      "intro_amount": "0.00",
      "discount_percent": 0,
      "credits_per_cycle": 50,
      "credit_grant_interval": "MONTH",
      "max_projects": 1,
      "max_pages": 5,
      "topup_allowed": 0,
      "can_deploy": 0,
      "support_type": "NONE",
      "github_integration": 0,
      "custom_features": 0,
      "can_delete": 0,
      "credit_plan_key": "credit_free_plan",
      "is_plan_used": true,
      "is_current_plan": false
    }
  ];
  proPlans: Plan[] = [
    {
      "id": 2,
      "plan_key": "pro_starter_monthly",
      "plan_name": "Pro Starter Monthly",
      "cashfree_plan_id": "pro_starter_monthly",
      "amount": 999,
      "currency": "INR",
      "display_amount": "999.00",
      "display_currency": "INR",
      "billing_interval": "MONTH",
      "created_at": "2026-04-16T07:51:13.000Z",
      "plan_type": "PRO",
      "is_active": 1,
      "test_mode": 0,
      "has_intro_offer": 1,
      "intro_amount": "49.00",
      "discount_percent": 0,
      "credits_per_cycle": 100,
      "credit_grant_interval": "MONTH",
      "max_projects": 1,
      "max_pages": 1,
      "topup_allowed": 1,
      "can_deploy": 1,
      "support_type": "CHAT",
      "github_integration": 0,
      "custom_features": 0,
      "can_delete": 0,
      "credit_plan_key": "credit_pro_starter_monthly",
      "is_plan_used": true,
      "is_current_plan": true
    },
    {
      "id": 3,
      "plan_key": "pro_growth_monthly",
      "plan_name": "Pro Growth Monthly",
      "cashfree_plan_id": "pro_growth_monthly",
      "amount": 1796,
      "currency": "INR",
      "display_amount": "1796.00",
      "display_currency": "INR",
      "billing_interval": "MONTH",
      "created_at": "2026-04-16T07:51:13.000Z",
      "plan_type": "PRO",
      "is_active": 1,
      "test_mode": 0,
      "has_intro_offer": 1,
      "intro_amount": "49.00",
      "discount_percent": 0,
      "credits_per_cycle": 275,
      "credit_grant_interval": "MONTH",
      "max_projects": 1,
      "max_pages": 1,
      "topup_allowed": 1,
      "can_deploy": 1,
      "support_type": "CHAT",
      "github_integration": 0,
      "custom_features": 0,
      "can_delete": 1,
      "credit_plan_key": "credit_pro_growth_monthly",
      "is_plan_used": false,
      "is_current_plan": false
    },
    {
      "id": 4,
      "plan_key": "pro_scale_monthly",
      "plan_name": "Pro Scale Monthly",
      "cashfree_plan_id": "pro_scale_monthly",
      "amount": 5089,
      "currency": "INR",
      "display_amount": "5089.00",
      "display_currency": "INR",
      "billing_interval": "MONTH",
      "created_at": "2026-04-16T07:51:13.000Z",
      "plan_type": "PRO",
      "is_active": 1,
      "test_mode": 0,
      "has_intro_offer": 1,
      "intro_amount": "69.00",
      "discount_percent": 0,
      "credits_per_cycle": 500,
      "credit_grant_interval": "MONTH",
      "max_projects": 1,
      "max_pages": 1,
      "topup_allowed": 1,
      "can_deploy": 1,
      "support_type": "PRIORITY",
      "github_integration": 1,
      "custom_features": 1,
      "can_delete": 1,
      "credit_plan_key": "credit_pro_scale_monthly",
      "is_plan_used": false,
      "is_current_plan": false
    }
  ];
  businessPlans: Plan[] = [];
  private plansCache: Partial<Record<BillingCycle, {
    free: Plan[];
    pro: Plan[];
    business: Plan[];
  }>> = {};
  selectedProPlan: Plan | null = null;
  proDropdownOpen = false;
  selectedPlanData: Plan | null = null;
  private currencySymbolMap: Record<string, string> = {
    INR: '\u20B9',
    USD: '$',
    EUR: 'EUR ',
    GBP: 'GBP '
  };
  private readonly modalData = inject<SubscriptionModalData | null>(NZ_MODAL_DATA, { optional: true });
  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private subscriptionService: SubcriptionService,
    private message: NzMessageService,
    @Optional() private modalRef?: NzModalRef<SubcriptionPageComponent, SubscriptionModalResult>
  ) {
    const projectData = sessionStorage.getItem('projectData');
    this.projectsData = projectData ? JSON.parse(projectData) : null;
  }

  ngOnInit(): void {
    this.selectedTemplateId = this.selectedTemplateId || this.modalData?.selectedTemplateId || '';
    this.updateModalWidth(1250);
    this.subscriptionService.loadSubscription();
    this.getAllPlans();
    this.subscriptionService.subscription$.subscribe(subscription => {
      if (subscription) {
        this.subscriptionPlan = subscription;
      }
    });
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
    this.selectedPlan.set(this.mapPlanType(planData));
    this.billingSummaryModalOpen = true;
    this.selectedPlanData = planData;
    this.setBillingCycle(planData.billing_interval);
    this.updateModalWidth(520);
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
    const apiUrl = this.subscriptionPlan.planName !== 'Free Plan' ? 'api/payment/upgrade-subscription' : 'api/payment/create-subscription'
    this.apiService.postAPI(apiUrl, {
      planKey: this.planKey(),
      user: billingDetails,
      publicTemplateId: this.selectedTemplateId,
      inquiryId
    }).subscribe((res: any) => {
      debugger
      this.openCashfreeSubscriptionCheckout(res.subscription_session_id);
    }, (err: any) => {
      this.message.error(err.error?.message || 'Failed to initiate subscription checkout. Please try again.');
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
    return ` ${this.formatCurrency(plan.intro_amount, plan.currency)}`;
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
    this.modalRef?.close({ action: 'closed', reason: 'cancel' });
  }


  openCalednlyModal() {
    this.billingSummaryModalOpen = false;
    this.showCalendly = true;
    this.updateModalWidth(900);
  }

  getAllPlans() {
    const cycle = this.billingCycle();
    const cachedPlans = this.plansCache[cycle];

    if (cachedPlans) {
      this.freePlans = cachedPlans.free;
      this.proPlans = cachedPlans.pro;
      this.businessPlans = cachedPlans.business;

      const previousSelectedId = this.selectedProPlan?.id;
      this.selectedProPlan =
        this.proPlans.find((plan) => plan.id === previousSelectedId) || this.proPlans[0] || null;
      return;
    }

    this.apiService.getAllPlans<any>(this.billingCycle())
      .subscribe({
        next: (res: any) => {
          this.freePlans = res?.data?.free || [];
          this.proPlans = res?.data?.pro || [];
          this.businessPlans = res?.data?.business || [];
          this.plansCache[cycle] = {
            free: this.freePlans,
            pro: this.proPlans,
            business: this.businessPlans
          };

          const previousSelectedId = this.selectedProPlan?.id;
          this.selectedProPlan =
            this.proPlans.find((plan) => plan.id === previousSelectedId) || this.proPlans[0] || null;
        },
        error: () => {
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

  currentPlanDescription(plan: Plan | null): string {
    if (!plan) {
      return 'Choose a plan to unlock more credits, integrations, and deployment options.';
    }

    return `${plan.credits_per_cycle} credit${plan.credits_per_cycle > 1 ? 's' : ''} per ${(plan.credit_grant_interval || plan.billing_interval).toLowerCase()}`;
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
      `${plan.credits_per_cycle} Credit${plan.credits_per_cycle > 1 ? 's' : ''} per ${(
        plan.credit_grant_interval || plan.billing_interval
      ).toLowerCase()}`,
      this.supportLabel(plan.support_type)
    ];

    if (plan.topup_allowed) {
      features.push('Top-up Credits');
    }

    if (plan.can_deploy) {
      features.push('Deployment Access');
    }

    if (plan.github_integration) {
      features.push('GitHub Integration');
    }

    if (plan.custom_features) {
      features.push('Custom Features');
    }

    if (plan.can_delete) {
      features.push('Delete Projects');
    }

    return features;
  }

  hasDiscount(plan: Plan | null): boolean {
    return !!plan && Number(plan.discount_percent || 0) > 0;
  }

  getDiscountLabel(plan: Plan | null): string {
    return `${Number(plan?.discount_percent || 0)}% Off`;
  }

  getPlanBadges(plan: Plan): string[] {
    if (plan.is_current_plan) {
      return ['Active'];
    }

    if (plan.is_plan_used) {
      return ['Used'];
    }

    return [];
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

  private updateModalWidth(width: number): void {
    this.modalRef?.updateConfig({
      nzWidth: width
    });
  }
}
