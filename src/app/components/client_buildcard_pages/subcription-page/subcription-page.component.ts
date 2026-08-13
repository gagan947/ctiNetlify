import { Component, computed, inject, Input, Optional, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';
import { SubcriptionService } from '../../../services/subcription.service';
import { SubscriptionResponse } from '../../../models/subcription';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { Router, ActivatedRoute } from '@angular/router';
import { SubscriptionModalData, SubscriptionModalResult } from '../../../services/subscription-modal.service';
type BillingCycle = 'MONTH' | 'YEAR';
type PlanType = 'pro' | 'business';

interface PlanFeatureItem {
  label: string;
  badge?: string;
}

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
  selectedPlan = signal<PlanType>('pro');
  subscriptionPlan!: SubscriptionResponse;
  proPlans: Plan[] = [];
  businessPlans: Plan[] = [];
  isLoadingPlans = true;
  private plansCache: Partial<Record<BillingCycle, {
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
  userInfo: any = {}
  billingForm: FormGroup = new FormGroup({});
  isSubmitted = false;
  private readonly modalData = inject<SubscriptionModalData | null>(NZ_MODAL_DATA, { optional: true });
  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private subscriptionService: SubcriptionService,
    private message: NzMessageService,
    private router: Router,
    private route: ActivatedRoute,
    @Optional() private modalRef?: NzModalRef<SubcriptionPageComponent, SubscriptionModalResult>
  ) {
    const projectData = sessionStorage.getItem('projectData');
    this.projectsData = projectData ? JSON.parse(projectData) : null;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const paymentStatus = params['payment'];
      if (paymentStatus === 'success') {
        this.message.success('Subscription activated successfully!');
        this.router.navigate([], { queryParams: { payment: null }, queryParamsHandling: 'merge' });
      } else if (paymentStatus === 'cancelled') {
        this.message.error('PayPal checkout was cancelled.');
        this.router.navigate([], { queryParams: { payment: null }, queryParamsHandling: 'merge' });
      }
    });

    this.selectedTemplateId = this.selectedTemplateId || this.modalData?.selectedTemplateId || '';
    this.updateModalWidth(1050);
    this.subscriptionService.loadSubscription();
    this.subscriptionService.subscription$.subscribe(subscription => {
      if (subscription) {
        this.subscriptionPlan = subscription;
        this.applyActiveSubscriptionDefaults(subscription);
        this.getAllPlans();
      }
    });

    this.userInfo = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    this.billingForm = this.fb.nonNullable.group({
      name: [this.userInfo.name || '', Validators.required],
      email: [this.userInfo.email || '', [Validators.required, Validators.email]],
      phoneNumber: [this.userInfo.phoneNumber || '', Validators.required]
    });
  }


  setBilling(cycle: BillingCycle) {
    this.billingCycle.set(cycle);
    this.proDropdownOpen = false;
    this.getAllPlans();
  }

  setBillingCycle(cycle: BillingCycle) {
    this.setBilling(cycle);
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

  getStarted(planData: Plan) {
    this.isSubmitted = false;
    this.selectedPlan.set(this.mapPlanType(planData));
    this.billingSummaryModalOpen = true;
    this.selectedPlanData = planData;
    this.setBillingCycle(planData.billing_interval);
    this.updateModalWidth(900);
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
    const redirectPath = window.location.origin + this.router.url || '/my-plan';
    const apiUrl = this.subscriptionPlan.planName !== 'Free Plan' && this.subscriptionPlan.subscriptionStatus !== 'CANCELLED' ? 'api/payment/upgrade-subscription' : 'api/payment/create-subscription'
    this.apiService.postAPI(apiUrl, {
      planKey: this.planKey(),
      user: billingDetails,
      publicTemplateId: this.selectedTemplateId,
      inquiryId,
      redirectPath
    }).subscribe((res: any) => {
      this.openCashfreeSubscriptionCheckout(res.subscription_session_id);
    }, (err: any) => {
      this.message.error(err.error?.message || 'Failed to initiate subscription checkout. Please try again.');
    });
  }

  isInvalid(controlName: string) {
    const control = this.billingForm.get(controlName);
    return !!(this.isSubmitted && control?.invalid);
  }

  confirmAndPay() {
    this.isSubmitted = true;
    if (this.billingForm.invalid) {
      if (this.billingForm.get('phoneNumber')?.invalid) {
        this.message.error('Please enter a valid mobile number.');
      } else {
        this.message.error('Please fill in all required billing details.');
      }
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

  subscribePaypal(): void {

    const backendUrl = this.subscriptionPlan.planName !== 'Free Plan' && this.subscriptionPlan.subscriptionStatus !== 'CANCELLED' ? 'api/payment/paypal/upgrade-subscription' : 'api/payment/paypal/create-subscription';
    const redirectPath = window.location.origin + '/my-plan';

    const body = {
      planKey: this.planKey(),
      redirectPath: redirectPath
    };

    this.apiService.postAPI(backendUrl, body).subscribe({
      next: (response: any) => {
        if (response.success && response.approvalUrl) {
          window.location.href = response.approvalUrl;
        } else {
          this.message.error('Failed to generate PayPal checkout link: ' + response.message);
        }
      },
      error: (err: any) => {
        console.error('PayPal Checkout API Error:', err);
        this.message.error('Server error occurred during checkout initialization.');
      }
    });
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

    return this.formatCurrency(this.getEffectiveCurrentAmount(plan), plan.currency);
  }

  formatCurrency(amount: string | number, currency?: string): string {
    const currencyCode = currency || 'INR';
    const symbol = this.currencySymbolMap[currencyCode] || `${currencyCode} `;
    const value = Number(amount ?? 0);
    const formatted = value.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return `${symbol}${formatted}`;
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
        // redirectTarget: "_blank",
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
    this.isSubmitted = false;
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
      this.proPlans = cachedPlans.pro;
      this.businessPlans = cachedPlans.business;
      this.selectedProPlan = this.resolveSelectedProPlan();
      this.isLoadingPlans = false;
      return;
    }

    this.isLoadingPlans = true;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currency = (timezone === 'Asia/Calcutta' || timezone === 'Asia/Kolkata') ? 'INR' : 'USD';

    this.apiService.getAllPlans<any>(this.billingCycle(), currency)
      .subscribe({
        next: (res: any) => {
          this.proPlans = res?.data?.pro || [];
          this.businessPlans = res?.data?.business || [];
          this.plansCache[cycle] = {
            pro: this.proPlans,
            business: this.businessPlans
          };
          this.selectedProPlan = this.resolveSelectedProPlan();
          this.isLoadingPlans = false;
        },
        error: () => {
          this.isLoadingPlans = false;
        }
      });
  }

  getCurrencySymbol(plan: Plan | null): string {
    if (!plan || !plan.currency) return '₹';
    switch (plan.currency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return plan.currency + ' ';
    }
  }

  getDisplayAmount(plan: Plan | null): string {
    return plan?.display_amount || '0.00';
  }

  planDescription(plan: Plan): string {
    switch (plan?.plan_type) {
      case 'PRO':
        return 'Perfect to build your first real product';
      case 'BUSINESS':
        return 'For agencies & enterprise teams';
      default:
        return 'Choose the plan that matches your needs and scale as you grow.';
    }
  }

  getBillingSuffix(plan: Plan | null): string {
    return `/${(plan?.billing_interval || this.billingCycle()).toLowerCase()}`;
  }

  getBillingUnit(plan: Plan | null): 'month' | 'year' {
    const cycle = plan?.billing_interval || this.billingCycle();
    return cycle === 'YEAR' ? 'year' : 'month';
  }

  planFeatures(plan: Plan): PlanFeatureItem[] {
    switch (plan?.plan_type) {
      case 'PRO':
        return [
          { label: 'Mobile App Development' },
          { label: 'Private project hosting' },
          { label: 'Github integration' },
          { label: 'Fork tasks' },
          { label: 'Ability to buy additional credits' }
        ];
      case 'BUSINESS':
        return [
          { label: 'E-3 Agent', badge: 'NEW' },
          { label: 'Free deployment', badge: 'NEW' },
          { label: 'Free custom domain', badge: 'NEW' },
          { label: 'Analytics dashboard', badge: 'NEW' },
          { label: 'Full project memory' },
          { label: 'Beast Thinking' },
          { label: 'Ability to build Custom Agents' }
        ];
      default:
        return [];
    }
  }

  getPlanButtonLabel(plan: Plan | null): string {
    if (!plan) {
      return 'Get Started';
    }

    if (this.isActivePaidPlan(plan)) {
      return 'Active';
    }

    switch (plan?.plan_type) {
      case 'PRO':
        return 'Upgrade to Standard';
      case 'BUSINESS':
        return 'Upgrade to Enterprise';
      default:
        return 'Get Started';
    }
  }

  shouldShowPreviousPrice(plan: Plan | null): boolean {
    if (!plan) {
      return false;
    }

    return this.getOriginalAmount(plan) > this.getEffectiveCurrentAmount(plan);
  }

  getCurrentPrice(plan: Plan | null): string {
    if (!plan) {
      return '0.00';
    }

    return String(this.getEffectiveCurrentAmount(plan).toFixed(2));
  }

  handlePlanAction(plan: Plan): void {
    if (this.isPlanActionDisabled(plan)) {
      return;
    }

    this.getStarted(plan);
  }

  isActivePaidPlan(plan: Plan | null): boolean {
    return !!plan && !!plan.is_current_plan;
  }

  isPlanActionDisabled(plan: Plan | null): boolean {
    if (!plan) {
      return true;
    }

    return this.isActivePaidPlan(plan);
  }

  getVisiblePlanCards(): Plan[] {
    return [this.selectedProPlan, this.businessPlan].filter((plan): plan is Plan => !!plan);
  }

  getCardTitle(plan: Plan | null): string {
    return plan?.plan_type === 'BUSINESS' ? 'Enterprise Plan' : 'Standard';
  }

  getCardTheme(plan: Plan | null): 'standard' | 'enterprise' {
    return plan?.plan_type === 'BUSINESS' ? 'enterprise' : 'standard';
  }

  getCreditsLabel(plan: Plan | null): string {
    if (!plan) {
      return '';
    }

    const creditInterval = plan.credit_grant_interval || plan.billing_interval || this.billingCycle();
    return `${plan.credits_per_cycle} credits / ${creditInterval === 'YEAR' ? 'year' : 'month'}`;
  }

  getCurrentPriceValue(plan: Plan | null): string {
    if (!plan) {
      return '0';
    }

    const amount = this.getEffectiveCurrentAmount(plan);
    return amount.toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
  }

  getOriginalPriceValue(plan: Plan | null): string {
    if (!plan) {
      return '';
    }

    return this.getOriginalAmount(plan).toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
  }

  getDiscountText(plan: Plan | null): string {
    if (!plan) {
      return '';
    }

    const savings = this.getOriginalAmount(plan) - this.getEffectiveCurrentAmount(plan);
    if (savings > 0) {
      return `Save ${this.getCurrencySymbol(plan)}${savings.toLocaleString('en-IN')}`;
    }

    if (Number(plan.discount_percent || 0) > 0 && !this.shouldShowPreviousPrice(plan)) {
      return `Save ${Number(plan.discount_percent)}%`;
    }

    return '';
  }

  getOrderSummaryPrice(plan: Plan | null): string {
    if (!plan) {
      return this.formatCurrency(0, 'INR');
    }

    return this.formatCurrency(this.getEffectiveCurrentAmount(plan), plan.currency);
  }

  getRenewalAmount(plan: Plan | null): string {
    if (!plan) {
      return this.formatCurrency(0, 'INR');
    }

    return this.formatCurrency(this.getRenewalNumericAmount(plan), plan.currency);
  }

  getSaveText(plan: Plan | null): string {
    if (!plan) {
      return '';
    }

    if (this.shouldShowPreviousPrice(plan)) {
      const savings = Number(plan.amount || 0) - Number(plan.intro_amount || 0);
      return savings > 0 ? `Save ${this.getCurrencySymbol(plan)}${savings.toLocaleString('en-IN')}` : '';
    }

    if (Number(plan.discount_percent || 0) > 0) {
      return `Save ${Number(plan.discount_percent)}%`;
    }

    return '';
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
      case 'PRO':
        return 'pro';
      case 'BUSINESS':
        return 'business';
      default:
        return 'pro';
    }
  }

  private updateModalWidth(width: number): void {
    this.modalRef?.updateConfig({
      nzWidth: width
    });
  }

  private resolveSelectedProPlan(): Plan | null {
    const activeProPlan = this.proPlans.find((plan) => plan.is_current_plan);
    if (activeProPlan) {
      return activeProPlan;
    }

    const previousSelectedId = this.selectedProPlan?.id;
    return this.proPlans.find((plan) => plan.id === previousSelectedId) || this.proPlans[0] || null;
  }

  private applyActiveSubscriptionDefaults(subscription: SubscriptionResponse): void {
    const activeBillingCycle = this.normalizeBillingCycle(subscription.billingInterval);
    if (!activeBillingCycle || this.billingCycle() === activeBillingCycle) {
      return;
    }

    this.billingCycle.set(activeBillingCycle);
    this.proDropdownOpen = false;
    this.getAllPlans();
  }

  private normalizeBillingCycle(cycle: string | null | undefined): BillingCycle | null {
    const normalizedCycle = String(cycle || '').toUpperCase();
    if (normalizedCycle === 'MONTH' || normalizedCycle === 'YEAR') {
      return normalizedCycle as BillingCycle;
    }

    return null;
  }

  private getEffectiveCurrentAmount(plan: Plan | null): number {
    if (!plan) {
      return 0;
    }

    return this.showIntroOffer(plan)
      ? Number(plan.intro_amount || 0)
      : Number(plan.amount || 0);
  }

  private getOriginalAmount(plan: Plan | null): number {
    if (!plan) {
      return 0;
    }

    return Number(plan.display_amount || plan.amount || 0);
  }

  private getRenewalNumericAmount(plan: Plan | null): number {
    if (!plan) {
      return 0;
    }

    if (!this.showIntroOffer(plan)) {
      return this.getEffectiveCurrentAmount(plan);
    }

    const currentAmount = this.getEffectiveCurrentAmount(plan);
    const regularAmount = Number(plan.amount || 0);
    const originalAmount = this.getOriginalAmount(plan);

    if (regularAmount > currentAmount) {
      return regularAmount;
    }

    if (originalAmount > currentAmount) {
      return originalAmount;
    }

    return regularAmount;
  }
}
