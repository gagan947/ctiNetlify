import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../../services/api.service';
import { SubscriptionModalService } from '../../../services/subscription-modal.service';
import { SubscriptionResponse } from '../../../models/subcription';
import { SubcriptionService } from '../../../services/subcription.service';
import { WorkspaceHeaderComponent } from '../workspace-header/workspace-header.component';

interface CreditHistoryResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    page: number;
    limit: number;
    total: number;
    items: CreditHistoryEntry[];
  };
}

interface CreditHistoryEntry {
  id: number;
  transaction_type: string;
  source_key: string;
  action_name: string;
  credits: number;
  credit_delta: number;
  balance_after: number;
  plan_credits_delta: number | null;
  topup_credits_delta: number | null;
  plan_balance_after: number | null;
  topup_balance_after: number | null;
  amount_inr: string | null;
  currency: string | null;
  reference_type: string;
  reference_id: string;
  meta_json: Record<string, unknown> | null;
  created_at: string;
}

interface CreditTransactionItem {
  id: number;
  title: string;
  subtitle: string;
  delta: number;
  time: string;
  icon: 'bolt' | 'comment' | 'plus' | 'edit' | 'wallet';
  iconClass: 'positive' | 'negative';
  balanceAfter: number;
}

interface CreditTransactionGroup {
  label: string;
  items: CreditTransactionItem[];
}

interface CreditBalanceSummary {
  total: number;
  plan: number;
  topup: number;
  free: number;
}

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
  isCreditHistoryLoading = false;
  creditHistoryError = '';
  creditHistoryGroups: CreditTransactionGroup[] = [];
  creditBalanceSummary: CreditBalanceSummary = {
    total: 0,
    plan: 0,
    topup: 0,
    free: 0
  };
  private readonly creditHistoryLimit = 20;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private apiService: ApiService,
    private toster: NzMessageService,
    private subscriptionService: SubcriptionService,
    private subscriptionModalService: SubscriptionModalService
  ) { }

  ngOnInit(): void {
    this.subscriptionService.loadSubscription();
    this.subscriptionService.subscription$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subscription) => {
        if (subscription) {
          this.subscriptionPlan = subscription;
          this.planName = subscription.planName;
        }
      });

    this.loadCreditHistory();
  }

  get monthlyPriceLabel(): string {
    if (!this.subscriptionPlan?.pricingPlan) {
      return 'Free';
    }

    return `Rs. ${this.subscriptionPlan.pricingPlan} / ${this.subscriptionPlan.billingInterval === 'YEAR' ? 'year' : 'month'}`;
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

  get hasCreditHistory(): boolean {
    return this.creditHistoryGroups.some((group) => group.items.length > 0);
  }

  loadCreditHistory(offset = 0): void {
    this.isCreditHistoryLoading = true;
    this.creditHistoryError = '';

    this.apiService.getCreditHistory<CreditHistoryResponse>(this.creditHistoryLimit, offset)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response?.data?.items || [];
          this.creditHistoryGroups = this.groupCreditTransactions(items);
          this.creditBalanceSummary = this.buildCreditBalanceSummary(items);
          this.isCreditHistoryLoading = false;
        },
        error: (error) => {
          console.error(error);
          this.creditHistoryError = 'Unable to load credit history right now.';
          this.creditHistoryGroups = [];
          this.creditBalanceSummary = {
            total: 0,
            plan: 0,
            topup: 0,
            free: 0
          };
          this.isCreditHistoryLoading = false;
        }
      });
  }

  getCreditAmountLabel(value: number): string {
    return `${Math.abs(value).toLocaleString('en-IN')} cr`;
  }

  trackByHistoryGroup(_index: number, group: CreditTransactionGroup): string {
    return group.label;
  }

  trackByHistoryItem(_index: number, item: CreditTransactionItem): number {
    return item.id;
  }

  cancelSubcription(): void {
    this.isCanceling = true;
    this.apiService.getApi(`api/user/cancelSubscription`)
      .subscribe({
        next: (res: any) => {
          setTimeout(() => {
            this.isCanceling = false;
            this.subscriptionService.refreshSubscription();
          }, 5000);

          this.toster.success(res.message);
        },
        error: () => {
          setTimeout(() => {
            this.isCanceling = false;
          }, 2000);
        }
      });
  }

  openSubscriptionModal(): void {
    this.subscriptionModalService.open();
  }

  openBuyCreditsModal(): void {
    this.subscriptionModalService.openBuyMoreCreditsModal();
  }

  private buildCreditBalanceSummary(items: CreditHistoryEntry[]): CreditBalanceSummary {
    const latestItem = items[0];
    if (!latestItem) {
      return {
        total: 0,
        plan: 0,
        topup: 0,
        free: 0
      };
    }

    const total = Number(latestItem.balance_after || 0);
    const plan = Number(latestItem.plan_balance_after || 0);
    const topup = Number(latestItem.topup_balance_after || 0);
    const free = Math.max(total - plan - topup, 0);

    return { total, plan, topup, free };
  }

  private groupCreditTransactions(entries: CreditHistoryEntry[]): CreditTransactionGroup[] {
    const groupedTransactions = new Map<string, CreditTransactionItem[]>();

    entries.forEach((entry) => {
      const label = this.getDayLabel(entry.created_at);
      const items = groupedTransactions.get(label) || [];
      items.push(this.mapCreditTransaction(entry));
      groupedTransactions.set(label, items);
    });

    return Array.from(groupedTransactions.entries()).map(([label, items]) => ({
      label,
      items
    }));
  }

  private mapCreditTransaction(entry: CreditHistoryEntry): CreditTransactionItem {
    const delta = Number(entry.credit_delta ?? entry.credits ?? 0);
    const transactionType = (entry.transaction_type || '').toLowerCase();
    const sourceKey = (entry.source_key || '').toLowerCase();
    const actionName = entry.action_name || this.toTitleCase(entry.source_key || 'Credit Update');
    const meta = entry.meta_json || {};
    const title = this.resolveTransactionTitle(actionName, transactionType, sourceKey);

    return {
      id: entry.id,
      title,
      subtitle: this.resolveTransactionSubtitle(entry, meta),
      delta,
      time: this.formatTransactionTime(entry.created_at),
      icon: this.resolveTransactionIcon(transactionType, sourceKey, title),
      iconClass: delta >= 0 ? 'positive' : 'negative',
      balanceAfter: Number(entry.balance_after || 0)
    };
  }

  private resolveTransactionTitle(actionName: string, transactionType: string, sourceKey: string): string {
    if (sourceKey.includes('topup') || transactionType.includes('credit')) {
      return 'Credit Top-up';
    }

    if (sourceKey.includes('chat') || actionName.toLowerCase().includes('chat')) {
      return 'AI Assistant Chat';
    }

    if (sourceKey.includes('edit') || actionName.toLowerCase().includes('edit')) {
      return 'Asset Edit';
    }

    if (sourceKey.includes('project') || actionName.toLowerCase().includes('project')) {
      return 'Project Generation';
    }

    return actionName;
  }

  private resolveTransactionSubtitle(
    entry: CreditHistoryEntry,
    meta: Record<string, unknown>
  ): string {
    const metaTitle = this.readMetaString(meta, [
      'project_name',
      'projectTitle',
      'template_name',
      'templateName',
      'pack_name',
      'packName',
      'description',
      'message'
    ]);

    if (metaTitle) {
      return metaTitle;
    }

    if (entry.reference_type) {
      return this.toTitleCase(entry.reference_type.replace(/_/g, ' '));
    }

    return this.toTitleCase((entry.source_key || 'Transaction').replace(/_/g, ' '));
  }

  private resolveTransactionIcon(
    transactionType: string,
    sourceKey: string,
    title: string
  ): CreditTransactionItem['icon'] {
    if (sourceKey.includes('topup') || transactionType.includes('credit')) {
      return 'plus';
    }

    if (sourceKey.includes('chat') || title === 'AI Assistant Chat') {
      return 'comment';
    }

    if (sourceKey.includes('edit') || title === 'Asset Edit') {
      return 'edit';
    }

    if (sourceKey.includes('project') || title === 'Project Generation') {
      return 'bolt';
    }

    return 'wallet';
  }

  private readMetaString(meta: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private getDayLabel(dateString: string): string {
    const transactionDate = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTransactionDay = new Date(
      transactionDate.getFullYear(),
      transactionDate.getMonth(),
      transactionDate.getDate()
    );
    const diffInDays = Math.round(
      (startOfToday.getTime() - startOfTransactionDay.getTime()) / 86400000
    );

    if (diffInDays === 0) {
      return 'Today';
    }

    if (diffInDays === 1) {
      return 'Yesterday';
    }

    return transactionDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  }

  private formatTransactionTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private toTitleCase(value: string): string {
    return value
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
}
