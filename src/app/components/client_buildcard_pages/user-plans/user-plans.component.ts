import { Component, ElementRef, NgZone, Renderer2 } from '@angular/core';
import { SubscriptionResponse } from '../../../models/subcription';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { WorkspaceHeaderComponent } from "../workspace-header/workspace-header.component";
import { SubcriptionService } from '../../../services/subcription.service';
import { SubscriptionModalService } from '../../../services/subscription-modal.service';

@Component({
  selector: 'app-user-plans',
  standalone: true,
  imports: [CommonModule, WorkspaceHeaderComponent],
  templateUrl: './user-plans.component.html',
  styleUrl: './user-plans.component.css'
})
export class UserPlansComponent {
  planName = 'Free Plan';
  subscriptionPlan!: SubscriptionResponse;
  isCanceling = false;
  // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private toster: NzMessageService,
    private subscriptionService: SubcriptionService,
    private subscriptionModalService: SubscriptionModalService
  ) {

  }

  async ngOnInit() {
    this.subscriptionService.loadSubscription();
    this.subscriptionService.subscription$.subscribe(subscription => {
      if (subscription) {
        this.subscriptionPlan = subscription;
        this.planName = subscription.planName;
      }
    });
  }

  get monthlyPriceLabel(): string {
    if (!this.subscriptionPlan?.pricingPlan) {
      return 'Free';
    }

    return `₹${this.subscriptionPlan.pricingPlan} / ${this.subscriptionPlan.billingInterval === 'YEAR' ? 'year' : 'month'}`;
  }

  get formattedStatus(): string {
    if (!this.subscriptionPlan?.subscriptionStatus) {
      return 'Free Plan';
    }

    return this.subscriptionPlan.subscriptionStatus === 'ACTIVE'
      ? 'Active'
      : this.subscriptionPlan.subscriptionStatus === 'CANCELLED'
        ? 'Cancelled'
        : this.subscriptionPlan.subscriptionStatus;
  }

  get paymentMethodLabel(): string {
    const paymentMethod = this.subscriptionPlan?.activePaymentMethod;
    if (!paymentMethod) {
      return 'No active payment method';
    }

    if (paymentMethod.type === 'card') {
      return `${paymentMethod.network || 'Card'} ending in ${paymentMethod.card_number || '----'}`;
    }

    return paymentMethod.upi_id || 'UPI payment method';
  }

  get featureChips(): string[] {
    if (!this.subscriptionPlan) {
      return [];
    }

    const chips = [
      `${this.subscriptionPlan.projectLimit} Project Limit`,
      `${this.subscriptionPlan.template_limit} Template Limit`,
      `${this.subscriptionPlan.variationLimit || 0} Variations / Project`,
      this.subscriptionPlan.supportType === 'CHAT'
        ? 'Chat Support'
        : this.subscriptionPlan.supportType === 'PRIORITY'
          ? 'Priority Support'
          : 'Basic Support'
    ];

    if (this.subscriptionPlan.canDeploy) {
      chips.push('Deploy Access');
    }

    if (this.subscriptionPlan.githubIntegration) {
      chips.push('GitHub Integration');
    }

    if (this.subscriptionPlan.customFeatures) {
      chips.push('Custom Features');
    }

    return chips;
  }

  cancelSubcription() {
    this.isCanceling = true
    this.apiService.getApi(`api/user/cancelSubscription`)
      .subscribe({
        next: (res: any) => {

          setTimeout(() => {
            this.isCanceling = false;
            this.subscriptionService.refreshSubscription();
          }, 5000);

          this.toster.success(res.message); // instant


        },
        error: err => {

          setTimeout(() => {
            this.isCanceling = false;

          }, 2000);
          // this.loading = false
        }
      });
  }


  openSubscriptionModal(): void {
    this.subscriptionModalService.open();
  }
}
