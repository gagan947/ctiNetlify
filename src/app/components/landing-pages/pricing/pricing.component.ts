import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { BlogCardsComponent } from '../blog-cards/blog-cards.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';

type BillingCycle = 'MONTH' | 'YEAR';

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
  created_at?: string;
  is_active?: number;
  test_mode?: number;
  credits_per_cycle: number;
  credit_grant_interval?: BillingCycle;
  max_projects: number;
  max_pages: number;
  topup_allowed?: number;
  support_type: 'NONE' | 'CHAT' | 'PRIORITY' | string;
  github_integration: number;
  custom_features: number;
  can_deploy?: number;
  can_delete?: number;
  credit_plan_key?: string;
  is_plan_used?: boolean;
  is_current_plan?: boolean;
  plan_type: 'FREE' | 'PRO' | 'BUSINESS' | string;
  has_intro_offer?: number;
  intro_amount?: string | number;
  discount_percent?: number;
}

interface PlansResponse {
  data?: {
    free?: Plan[];
    pro?: Plan[];
    business?: Plan[];
  };
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, FooterComponent, HeaderComponent, RouterLink, BlogCardsComponent],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit {
  billingCycle: BillingCycle = 'MONTH';
  freePlans: Plan[] = [];
  proPlans: Plan[] = [];
  businessPlans: Plan[] = [];
  selectedProPlan: Plan | null = null;
  proDropdownOpen = false;

  constructor(private service: ApiService) { }

  ngOnInit(): void {
    this.loadPlans();
  }

  @HostListener('document:click')
  closeProDropdown() {
    this.proDropdownOpen = false;
  }

  loadPlans() {
    this.service.getAllPlans<PlansResponse>(this.billingCycle).subscribe({
      next: (res) => {
        this.freePlans = res?.data?.free || [];
        this.proPlans = res?.data?.pro || [];
        this.businessPlans = res?.data?.business || [];

        const previouslySelectedPlanId = this.selectedProPlan?.id;
        this.selectedProPlan =
          this.proPlans.find((plan) => plan.id === previouslySelectedPlanId) || this.proPlans[0] || null;
      },
      error: () => {
        this.freePlans = [];
        this.proPlans = [];
        this.businessPlans = [];
        this.selectedProPlan = null;
      }
    });
  }

  setBillingCycle(cycle: BillingCycle) {
    if (this.billingCycle === cycle) {
      return;
    }

    this.billingCycle = cycle;
    this.proDropdownOpen = false;
    this.loadPlans();
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

  getDisplayAmount(plan: Plan | null): string {
    return plan?.display_amount || '0.00';
  }

  getBillingSuffix(plan: Plan | null): string {
    return `/${(plan?.billing_interval || this.billingCycle).toLowerCase()}`;
  }

  getPlanBadge(plan: Plan | null): string {
    switch (plan?.plan_type) {
      case 'FREE':
        return 'FREE PLAN';
      case 'PRO':
        return 'STANDARD PLAN';
      case 'BUSINESS':
        return 'ENTERPRISE PLAN';
      default:
        return '';
    }
  }

  getPlanDescription(plan: Plan | null): string {
    switch (plan?.plan_type) {
      case 'FREE':
        return 'Best for exploring the platform';
      case 'PRO':
        return 'Perfect to build your first real product';
      case 'BUSINESS':
        return 'For agencies & enterprise teams';
      default:
        return '';
    }
  }

  getPlanFeaturesTitle(plan: Plan | null): string {
    return plan?.plan_type === 'BUSINESS' ? 'Pro Features and you will get:' : 'Features you will get:';
  }

  getPlanFeatures(plan: Plan | null): string[] {
    switch (plan?.plan_type) {
      case 'FREE':
        return [
          'Create your first project (at 25 credits)',
          'Use remaining credits for minor edits & tweaks',
          'Access to basic AI generation',
          'Single agent processing',
          'Chat-based interaction only'
        ];
      case 'PRO':
        return [
          'Create full-scale projects',
          'Basic deployment access',
          'Standard customization (credit-based)',
          'Faster generation vs free plan',
          'Clean production-ready outputs'
        ];
      case 'BUSINESS':
        return [
          'Unlimited scale project creation',
          'Enterprise-grade deployment infrastructure',
          'Full customization freedom (no limitations)',
          'Chat + Email + Phone Support',
          'Maximum speed & priority processing',
          'Optimized for large-scale automation'
        ];
      default:
        return [];
    }
  }

  showIntroOffer(plan: Plan | null): boolean {
    return !!plan && Number(plan.has_intro_offer) === 1 && Number(plan.intro_amount || 0) > 0;
  }

  hasDiscount(plan: Plan | null): boolean {
    return !!plan && Number(plan.discount_percent || 0) > 0;
  }

  getDiscountLabel(plan: Plan | null): string {
    return `${Number(plan?.discount_percent || 0)}% Off`;
  }

  getPlanButtonLabel(plan: Plan | null): string {
    switch (plan?.plan_type) {
      case 'FREE':
        return 'Start Free';
      case 'PRO':
      case 'BUSINESS':
        return 'Get Started';
      default:
        return 'Get Started';
    }
  }

  getPlanFootnote(plan: Plan | null): string {
    switch (plan?.plan_type) {
      case 'FREE':
        return 'Upgrade anytime or buy credits directly';
      case 'PRO':
        return 'Auto-upgrades to Standard plan next month.';
      case 'BUSINESS':
        return 'Tailored for high-end business workflows';
      default:
        return '';
    }
  }

  shouldShowPreviousPrice(plan: Plan | null): boolean {
    return plan?.plan_type === 'PRO' && Number(plan?.has_intro_offer) === 1 && Number(plan?.intro_amount || 0) > 0;
  }

  getCurrentPrice(plan: Plan | null): string {
    if (this.shouldShowPreviousPrice(plan)) {
      return String(plan?.intro_amount || '0.00');
    }

    return this.getDisplayAmount(plan);
  }
}
