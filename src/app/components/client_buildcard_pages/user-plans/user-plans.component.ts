import { Component, Optional } from '@angular/core';
import { SubscriptionResponse } from '../../../models/subcription';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { SubcriptionService } from '../../../services/subcription.service';
import { BuyMoreCreditsModalResult, SubscriptionModalService, UserPlansModalResult } from '../../../services/subscription-modal.service';
import { NzModalRef } from 'ng-zorro-antd/modal';

interface CreditTransactionItem {
  id: string;
  title: string;
  subtitle: string;
  delta: number;
  time: string;
  icon: string;
  iconClass: string;
}

interface CreditTransactionGroup {
  label: string;
  items: CreditTransactionItem[];
}

@Component({
  selector: 'app-user-plans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-plans.component.html',
  styleUrl: './user-plans.component.css'
})
export class UserPlansComponent {
  planName = 'Free Plan';
  subscriptionPlan!: SubscriptionResponse;
  isCanceling = false;
  readonly transactionGroups: CreditTransactionGroup[] = [
    {
      label: 'Today',
      items: [
        {
          id: 'project-generation',
          title: 'Project Generation',
          subtitle: 'Vanguard Branding Campaign',
          delta: -25,
          time: '14:22 PM',
          icon: 'fa-bolt',
          iconClass: 'ct_transaction_icon--blue'
        },
        {
          id: 'ai-chat',
          title: 'AI Assistant Chat',
          subtitle: 'Advanced Logic Processing',
          delta: -5,
          time: '11:05 AM',
          icon: 'fa-comment-dots',
          iconClass: 'ct_transaction_icon--purple'
        }
      ]
    },
    {
      label: 'Oct 24',
      items: [
        {
          id: 'credit-topup',
          title: 'Credit Top-up',
          subtitle: 'Professional Bundle Purchase',
          delta: 500,
          time: '09:15 AM',
          icon: 'fa-plus',
          iconClass: 'ct_transaction_icon--green'
        },
        {
          id: 'asset-edit',
          title: 'Asset Edit',
          subtitle: 'Social Media Pack #04',
          delta: -10,
          time: '16:40 PM',
          icon: 'fa-pen-to-square',
          iconClass: 'ct_transaction_icon--indigo'
        }
      ]
    },
    {
      label: 'Oct 22',
      items: [
        {
          id: 'render-suite',
          title: 'Project Generation',
          subtitle: 'Interior Renderings Suite',
          delta: -50,
          time: '10:02 AM',
          icon: 'fa-bolt',
          iconClass: 'ct_transaction_icon--blue'
        },
        {
          id: 'monthly-allocation',
          title: 'Monthly Allocation',
          subtitle: 'Plan credit refresh',
          delta: 1000,
          time: '08:00 AM',
          icon: 'fa-wallet',
          iconClass: 'ct_transaction_icon--slate'
        }
      ]
    }
  ];

  constructor(
    private apiService: ApiService,
    private toster: NzMessageService,
    private subscriptionService: SubcriptionService,
    private subscriptionModalService: SubscriptionModalService,
    @Optional() private modalRef?: NzModalRef<UserPlansComponent, UserPlansModalResult | BuyMoreCreditsModalResult>
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

  get totalBalance(): number {
    return Number((this.subscriptionPlan as any)?.creditBalance || 0);
  }

  get planCredits(): number {
    const rawPlanCredits = (this.subscriptionPlan as any)?.planCredits;
    return Number(rawPlanCredits?.left ?? rawPlanCredits?.total ?? (this.subscriptionPlan as any)?.creditsPerCycle ?? 0);
  }

  get freeCredits(): number {
    const raw = this.subscriptionPlan as any;
    return Number(raw?.freeCredits?.left ?? raw?.freeCredits ?? (this.subscriptionPlan?.planType === 'FREE' ? this.planCredits : 0));
  }

  get topUpCredits(): number {
    const raw = this.subscriptionPlan as any;
    const directValue = raw?.topUpCredits?.left ?? raw?.topUpCredits ?? raw?.bonusCredits?.left ?? raw?.bonusCredits;
    if (directValue !== undefined && directValue !== null) {
      return Number(directValue);
    }

    return Math.max(this.totalBalance - this.planCredits - this.freeCredits, 0);
  }

  formatCredits(value: number): string {
    return `${Number(value || 0).toLocaleString('en-IN')} cr`;
  }

  formatDelta(value: number): string {
    const prefix = value >= 0 ? '+' : '-';
    return `${prefix} ${Math.abs(value)} cr`;
  }

  closeModal(): void {
    this.modalRef?.close({ action: 'closed', reason: 'cancel' });
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
        error: () => {

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

  openBuyMoreCreditsModal(): void {
    this.closeModal();
    this.subscriptionModalService.openBuyMoreCreditsModal();
  }
}
