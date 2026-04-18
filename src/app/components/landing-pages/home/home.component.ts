import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LocationService, UserLocation } from '../../../services/location.service';
import { GoogleAuthService } from '../../../services/google-auth.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { NzMessageService } from 'ng-zorro-antd/message';

declare const Swiper: any;
declare var FB: any;
declare const AppleID: any;

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
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FooterComponent, HeaderComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('homeMainSwiper') homeMainSwiper?: ElementRef<HTMLElement>;
  @ViewChild('homeInnerSwiper') homeInnerSwiper?: ElementRef<HTMLElement>;

  location: UserLocation | null = null;
  error: string | null = null;
  billingCycle: BillingCycle = 'MONTH';
  freePlans: Plan[] = [];
  proPlans: Plan[] = [];
  businessPlans: Plan[] = [];
  selectedProPlan: Plan | null = null;
  proDropdownOpen = false;

  private mainSwiperInstance: any;
  private innerSwiperInstance: any;

  constructor(
    private meta: Meta,
    private locationService: LocationService,
    private service: ApiService,
    private message: NzMessageService,
    private router: Router,
    private googleAuth: GoogleAuthService
  ) {
    this.meta.updateTag({
      name: 'description',
      content:
        'Build mobile and web apps easily with our no-code AI app builder. Drive digital transformation by creating smart, fast, and scalable apps without coding.'
    });
  }

  ngOnInit(): void {
    this.loadPlans();
    // this.googleAuth.setCredentialHandler((response: any) => this.loginWithGoogle(response));
    // this.googleAuth.renderButton('googleSignInDiv', {
    //   theme: 'outline',
    //   size: 'large',
    //   type: 'standard',
    //   shape: 'pill',
    //   text: 'continue_with',
    //   logo_alignment: 'left',
    //   width: 496
    // });
  }

  loginWithGoogle12() {
    this.googleAuth.startRedirectLogin();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.initializeSwipers());
    FB.init({
      appId: '1487976079653760',
      cookie: true,
      xfbml: true,
      version: 'v19.0'
    });

    AppleID.auth.init({
      clientId: 'ai.creativethoughts.web',
      scope: 'name email',
      redirectURI: 'https://creativethoughts.ai/auth/apple/callback',
      state: 'origin:web',
      usePopup: true
    });
    
  }

  ngOnDestroy(): void {
    this.destroySwipers();
  }

  @HostListener('document:click')
  closeProDropdown() {
    this.proDropdownOpen = false;
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

  getPlanDescription(plan: Plan | null): string {
    switch (plan?.plan_type) {
      case 'FREE':
        return 'Perfect for individuals to build, launch, and manage a single project with essential tools.';
      case 'PRO':
        return 'Built for creators and teams to design, customize, and scale high-impact projects.';
      case 'BUSINESS':
        return 'Ideal for growing teams that need advanced controls, integrations, and priority support.';
      default:
        return '';
    }
  }

  getPlanFeatures(plan: Plan | null): string[] {
    if (!plan) {
      return [];
    }

    const features = [
      `${plan.credits_per_cycle} Credit${plan.credits_per_cycle > 1 ? 's' : ''} per ${(
        plan.credit_grant_interval || plan.billing_interval
      ).toLowerCase()}`,
      this.getSupportLabel(plan.support_type)
    ];

    if (Number(plan.topup_allowed) === 1) {
      features.push('Top-up Credits');
    }

    if (Number(plan.github_integration) === 1) {
      features.push('GitHub Integration');
    }

    if (Number(plan.custom_features) === 1) {
      features.push('Custom Features');
    }

    if (Number(plan.can_delete) === 1) {
      features.push('Delete Projects');
    }

    if (Number(plan.can_deploy) === 1) {
      features.push('Deploy to Server');
    }

    return features;
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

  getIntroLabel(plan: Plan | null): string {
    return plan ? `₹${plan.intro_amount}` : '';
  }

  private getSupportLabel(type: string): string {
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

  private initializeSwipers() {
    if (typeof Swiper === 'undefined') {
      return;
    }

    this.destroySwipers();

    const mainSwiperElement = this.homeMainSwiper?.nativeElement;
    const innerSwiperElement = this.homeInnerSwiper?.nativeElement;

    if (mainSwiperElement) {
      this.mainSwiperInstance = new Swiper(mainSwiperElement, {
        loop: true,
        speed: 1000,
         spaceBetween: 10,
           nested: true,
  observer: true,
  observeParents: true,
        autoplay: false,
        navigation: {
          nextEl: mainSwiperElement.querySelector('.swiper-button-next'),
          prevEl: mainSwiperElement.querySelector('.swiper-button-prev')
        },
        pagination: {
          el: mainSwiperElement.querySelector('.swiper-pagination'),
          clickable: true
        }
      });
    }

if (innerSwiperElement) {
  this.innerSwiperInstance = new Swiper(innerSwiperElement, {
    
    loop: true,
    slidesPerView: 'auto',
    spaceBetween: 10,
    speed: 1000,
      nested: true,
  watchSlidesProgress: true,


        autoplay: {
          delay: 2000,
          disableOnInteraction: false,
        },

        freeMode: false,
        freeModeMomentum: false,

        observer: true,
        observeParents: true,
      });

  setTimeout(() => {
    this.innerSwiperInstance.update();
    this.innerSwiperInstance.autoplay.start();
  }, 100);
  
}

  }

  
  
  private destroySwipers() {
    if (this.mainSwiperInstance?.destroy) {
      this.mainSwiperInstance.destroy(true, true);
      this.mainSwiperInstance = null;
    }

    if (this.innerSwiperInstance?.destroy) {
      this.innerSwiperInstance.destroy(true, true);
      this.innerSwiperInstance = null;
    }
  }

  loginWithGoogle(response: any) {
    if (!response?.credential) {
      this.message.error('Google Sign-In did not return a valid credential.');
      return;
    }

    this.googleAuth.loginWithCredential(response.credential);
  }

  loginWithFacebook() {
    FB.login((response: any) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        this.service.postAPI(`api/user/facebookLogin`, { accessToken: accessToken })
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
          })
      } else {
        console.log('User cancelled Facebook login or did not fully authorize.');
      }
    }, { scope: 'email,public_profile' });
  }

  loginWithApple() {
    AppleID.auth.signIn().then((response: any) => {
      const formData = {
        identityToken: response.authorization.id_token,
        user: response.user
      };

      this.service.postAPI(`api/user/appleLogin`, formData)
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
    }).catch((error: any) => {
      console.error('Apple Sign-In error:', error);
      this.message.error('Apple Sign-In failed. Please try again.');
    });
  }
}