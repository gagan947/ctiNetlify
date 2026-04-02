import { Component, ElementRef, NgZone, Renderer2 } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { SubscriptionResponse } from '../../../models/subcription';
import { FormBuilder } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiSocketService } from '../../../services/ai-socket.service';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { SubcriptionPageComponent } from '../subcription-page/subcription-page.component';
import { WorkspaceHeaderComponent } from "../workspace-header/workspace-header.component";

@Component({
  selector: 'app-user-plans',
  standalone: true,
  imports: [CommonModule, SubcriptionPageComponent, WorkspaceHeaderComponent],
  templateUrl: './user-plans.component.html',
  styleUrl: './user-plans.component.css'
})
export class UserPlansComponent {
  planName = 'Free Plan';
  subscriptionPlan!: SubscriptionResponse;
  showModal = false;
  isCanceling = false;
  // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private toster: NzMessageService
  ) {

  }

  async ngOnInit() {
    this.getUserSubscriptionPlan();

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

  getUserSubscriptionPlan() {
    this.apiService.getApi<SubscriptionResponse>(`api/user/getMySubscription`)
      .subscribe({
        next: (res) => {

          this.subscriptionPlan = res;
          this.planName = res.planName
        },
        error: err => {
          // this.loading = false
        }
      });
  };

  cancelSubcription() {
    this.isCanceling = true
    this.apiService.getApi(`api/user/cancelSubscription`)
      .subscribe({
        next: (res: any) => {

          setTimeout(() => {
            this.isCanceling = false;
            this.getUserSubscriptionPlan();
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


  closeModal() {
    this.showModal = false;
  }
}
