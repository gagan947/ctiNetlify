import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LocationService, UserLocation } from '../../../services/location.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { NzMessageService } from 'ng-zorro-antd/message';
declare const google: any;

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

const HOME_PLAN_FALLBACK: Plan[] = [
  {
    id: 11,
    plan_key: 'free_plan',
    plan_name: 'Free Plan',
    cashfree_plan_id: '',
    amount: 0,
    currency: 'INR',
    display_amount: '0.00',
    display_currency: 'INR',
    billing_interval: 'MONTH',
    project_limit: 1,
    template_limit: 1,
    created_at: '2026-03-31T12:27:18.000Z',
    plan_type: 'FREE',
    variation_limit: 1,
    can_deploy: 0,
    support_type: 'NONE',
    github_integration: 0,
    custom_features: 0,
    is_active: 1,
    test_mode: 0,
    can_delete: 0,
    has_intro_offer: 0,
    intro_amount: '0.00'
  },
  {
    id: 7,
    plan_key: 'pro_monthly',
    plan_name: 'Pro Monthly',
    cashfree_plan_id: 'cti_test_pro_monthly',
    amount: 2999,
    currency: 'INR',
    display_amount: '2999.00',
    display_currency: 'INR',
    billing_interval: 'MONTH',
    project_limit: 2,
    template_limit: 5,
    created_at: '2026-03-31T12:27:18.000Z',
    plan_type: 'PRO',
    variation_limit: 2,
    can_deploy: 1,
    support_type: 'CHAT',
    github_integration: 0,
    custom_features: 0,
    is_active: 1,
    test_mode: 0,
    can_delete: 1,
    has_intro_offer: 1,
    intro_amount: '199.00'
  },
  {
    id: 8,
    plan_key: 'business_monthly',
    plan_name: 'Business Monthly',
    cashfree_plan_id: 'cti_test_business_monthly',
    amount: 9999,
    currency: 'INR',
    display_amount: '9999.00',
    display_currency: 'INR',
    billing_interval: 'MONTH',
    project_limit: 5,
    template_limit: 10,
    created_at: '2026-03-31T12:27:18.000Z',
    plan_type: 'BUSINESS',
    variation_limit: 4,
    can_deploy: 1,
    support_type: 'PRIORITY',
    github_integration: 1,
    custom_features: 1,
    is_active: 1,
    test_mode: 0,
    can_delete: 1,
    has_intro_offer: 0,
    intro_amount: '0.00'
  },
  {
    id: 9,
    plan_key: 'pro_yearly',
    plan_name: 'Pro Yearly',
    cashfree_plan_id: 'cti_test_pro_yearly',
    amount: 35499,
    currency: 'INR',
    display_amount: '35499.00',
    display_currency: 'INR',
    billing_interval: 'YEAR',
    project_limit: 2,
    template_limit: 5,
    created_at: '2026-03-31T12:27:18.000Z',
    plan_type: 'PRO',
    variation_limit: 2,
    can_deploy: 1,
    support_type: 'CHAT',
    github_integration: 0,
    custom_features: 0,
    is_active: 1,
    test_mode: 0,
    can_delete: 1,
    has_intro_offer: 0,
    intro_amount: '0.00'
  },
  {
    id: 10,
    plan_key: 'business_yearly',
    plan_name: 'Business Yearly',
    cashfree_plan_id: 'cti_test_business_yearly',
    amount: 118999,
    currency: 'INR',
    display_amount: '118999.00',
    display_currency: 'INR',
    billing_interval: 'YEAR',
    project_limit: 5,
    template_limit: 10,
    created_at: '2026-03-31T12:27:18.000Z',
    plan_type: 'BUSINESS',
    variation_limit: 4,
    can_deploy: 1,
    support_type: 'PRIORITY',
    github_integration: 1,
    custom_features: 1,
    is_active: 1,
    test_mode: 0,
    can_delete: 1,
    has_intro_offer: 0,
    intro_amount: '0.00'
  }
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FooterComponent, HeaderComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  location: UserLocation | null = null;
  error: string | null = null;
  allPlans: Plan[] = [];
  billingCycle: BillingCycle = 'MONTH';
  private currencySymbolMap: Record<string, string> = {
    INR: '\u20B9',
    USD: '$',
    EUR: 'EUR ',
    GBP: 'GBP '
  };

  constructor(
    private meta: Meta,
    private locationService: LocationService,
    private service: ApiService,
    private message: NzMessageService,
    private router: Router
  ) {
    this.meta.updateTag({
      name: 'description',
      content:
        'Build mobile and web apps easily with our no-code AI app builder. Drive digital transformation by creating smart, fast, and scalable apps without coding.'
    });
  }

  ngOnInit(): void {
    this.getallPlans();
    google.accounts.id.initialize({
      client_id: '994120717709-6hec26klmpd1h9eif5vcahincbbn2m1u.apps.googleusercontent.com', // ← use from Cloud Console
      callback: (response: any) => this.loginWithGoogle(response),
      ux_mode: 'popup' // prevents redirect-based popups
    });

    google.accounts.id.renderButton(
      document.getElementById('googleSignInDiv'),
      { theme: 'filled_blue', size: 'large' }
    );
  }

  async fetchLocation() {
    try {
      this.location = await this.locationService.getUserLocation();
      this.error = null;
    } catch (err: any) {
      this.error = err;
      this.location = null;
    }
  }

  getallPlans() {
    this.service.getApi('api/user/getAllPlans').subscribe({
      next: (res: any) => {
        const plans = Array.isArray(res?.data) && res.data.length ? res.data : HOME_PLAN_FALLBACK;
        this.allPlans = this.sortPlans(plans);
      },
      error: () => {
        this.allPlans = this.sortPlans(HOME_PLAN_FALLBACK);
      }
    });
  }

  setBillingCycle(cycle: BillingCycle) {
    this.billingCycle = cycle;
  }

  get visiblePlans(): Plan[] {
    const freePlan = this.allPlans.find(plan => plan.plan_type === 'FREE');
    const selectedPlans = this.allPlans.filter(
      plan => plan.plan_type !== 'FREE' && plan.billing_interval === this.billingCycle
    );

    return [...(freePlan ? [freePlan] : []), ...selectedPlans];
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

  showIntroOffer(plan: Plan): boolean {
    return !!plan.has_intro_offer && Number(plan.intro_amount) > 0;
  }

  introOfferLabel(plan: Plan): string {
    return `Intro offer ${this.formatCurrency(plan.intro_amount, plan.currency)}`;
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

  private sortPlans(plans: Plan[]): Plan[] {
    const planTypeOrder: Record<string, number> = {
      FREE: 0,
      PRO: 1,
      BUSINESS: 2
    };

    return plans.slice().sort((a, b) => {
      const typeDifference = (planTypeOrder[a.plan_type] ?? 99) - (planTypeOrder[b.plan_type] ?? 99);
      if (typeDifference !== 0) {
        return typeDifference;
      }

      return (a.amount || 0) - (b.amount || 0);
    });
  }

  loginWithGoogle(response: any) {
    const formData = {
      credential: response.credential,
    }

    this.service.postAPI(`api/user/googleLogin`, formData)
      .subscribe({
        next: (res: any) => {
          if (res.success == true) {
            this.service.setToken(res.data.token);
            localStorage.setItem('userDetailCTI', JSON.stringify(res.data.user));
            this.message.success(res.message)
            if (res.data.user.profile_visited) {
              this.router.navigate(['/main']);
            } else {
              this.router.navigate(['/profile']);
            }
          } else {
            this.message.error(res.message)
          }
        },
        error: err => {
          if (err.status === 0) {
            this.message.error('Network error, please check your connection.');
          } else if (err.error?.message) {
            this.message.error(err.error.message);
          } else {
            this.message.error('Unexpected error occurred.');
          }
        }
      });
  }

}
