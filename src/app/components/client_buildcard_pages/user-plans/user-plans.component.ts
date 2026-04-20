import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Optional, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { ApiService } from '../../../services/api.service';
import {
  BuyMoreCreditsModalResult,
  SubscriptionModalService,
  UserPlansModalResult
} from '../../../services/subscription-modal.service';
import { SubcriptionService } from '../../../services/subcription.service';

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
  private destroyRef = inject(DestroyRef);

  transactionGroups: CreditTransactionGroup[] = [];
  isHistoryLoading = false;

  private subscriptionPlan: any = null;

  constructor(
    private apiService: ApiService,
    private toster: NzMessageService,
    private subscriptionService: SubcriptionService,
    private subscriptionModalService: SubscriptionModalService,
    @Optional() private modalRef?: NzModalRef<UserPlansComponent, UserPlansModalResult | BuyMoreCreditsModalResult>
  ) { }

  ngOnInit(): void {
    this.loadSubscriptionDetails();
    this.loadCreditHistory();
  }

  get totalBalance(): number {
    return Number(this.subscriptionPlan?.creditBalance || 0);
  }

  get planCredits(): number {
    const rawPlanCredits = this.subscriptionPlan?.planCredits;
    return Number(rawPlanCredits?.left ?? rawPlanCredits?.total ?? this.subscriptionPlan?.creditsPerCycle ?? 0);
  }

  get freeCredits(): number {
    return Number(this.subscriptionPlan?.freeCredits?.left ?? this.subscriptionPlan?.freeCredits ?? 0);
  }

  get topUpCredits(): number {
    const directValue =
      this.subscriptionPlan?.topUpCredits?.left ??
      this.subscriptionPlan?.topUpCredits ??
      this.subscriptionPlan?.bonusCredits?.left ??
      this.subscriptionPlan?.bonusCredits;

    if (directValue !== undefined && directValue !== null) {
      return Number(directValue);
    }

    return Math.max(this.totalBalance - this.planCredits - this.freeCredits, 0);
  }

  get hasTransactions(): boolean {
    return this.transactionGroups.length > 0;
  }

  formatCredits(value: number): string {
    return `${Number(value || 0).toLocaleString('en-IN')} cr`;
  }

  formatDelta(value: number): string {
    const prefix = value >= 0 ? '+' : '-';
    return `${prefix} ${Math.abs(value).toLocaleString('en-IN')} cr`;
  }

  openBuyMoreCreditsModal(): void {
    this.closeModal();
    this.subscriptionModalService.openBuyMoreCreditsModal();
  }

  private loadSubscriptionDetails(): void {
    this.subscriptionService.loadSubscription();
    this.subscriptionService.subscription$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subscription) => {
        if (subscription) {
          this.subscriptionPlan = subscription;
        }
      });
  }

  private loadCreditHistory(): void {
    this.isHistoryLoading = true;

    this.apiService.getCreditHistory<CreditHistoryResponse>(20, 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.transactionGroups = this.groupTransactions(response?.data?.items ?? []);
          this.isHistoryLoading = false;
        },
        error: () => {
          this.transactionGroups = [];
          this.isHistoryLoading = false;
          this.toster.error('Unable to load credit history right now.');
        }
      });
  }

  private groupTransactions(items: CreditHistoryEntry[]): CreditTransactionGroup[] {
    const groups = new Map<string, CreditTransactionItem[]>();

    items.forEach((item) => {
      const label = this.getGroupLabel(item.created_at);
      const currentItems = groups.get(label) ?? [];
      currentItems.push(this.mapTransactionItem(item));
      groups.set(label, currentItems);
    });

    return Array.from(groups.entries()).map(([label, groupedItems]) => ({
      label,
      items: groupedItems
    }));
  }

  private mapTransactionItem(item: CreditHistoryEntry): CreditTransactionItem {
    const meta = item.meta_json ?? {};
    const packName = typeof meta['pack_name'] === 'string' ? meta['pack_name'] : '';
    const referenceId = item.reference_id ? `Ref: ${item.reference_id}` : '';
    const subtitle = packName || referenceId || item.source_key.replace(/_/g, ' ');

    return {
      id: item.id,
      title: item.action_name,
      subtitle,
      delta: Number(item.credit_delta || 0),
      time: this.formatTime(item.created_at),
      ...this.getTransactionVisuals(item)
    };
  }

  private getTransactionVisuals(item: CreditHistoryEntry): Pick<CreditTransactionItem, 'icon' | 'iconClass'> {
    const transactionType = item.transaction_type?.toUpperCase();
    const sourceKey = item.source_key?.toUpperCase();
    const delta = Number(item.credit_delta || 0);

    if (transactionType === 'TOPUP' || sourceKey.includes('TOPUP')) {
      return { icon: 'fa-circle-plus', iconClass: 'ct_transaction_icon--green' };
    }

    if (transactionType === 'GRANT' || sourceKey.includes('GRANT') || sourceKey.includes('BONUS')) {
      return { icon: 'fa-wallet', iconClass: 'ct_transaction_icon--slate' };
    }

    if (delta < 0) {
      return { icon: 'fa-bolt', iconClass: 'ct_transaction_icon--blue' };
    }

    return { icon: 'fa-clock-rotate-left', iconClass: 'ct_transaction_icon--indigo' };
  }

  private getGroupLabel(dateValue: string): string {
    const createdAt = new Date(dateValue);
    const now = new Date();

    const createdDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffInDays = Math.round((today.getTime() - createdDate.getTime()) / 86400000);

    if (diffInDays === 0) {
      return 'Today';
    }

    if (diffInDays === 1) {
      return 'Yesterday';
    }

    return createdAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: createdAt.getFullYear() === now.getFullYear() ? undefined : 'numeric'
    });
  }

  private formatTime(dateValue: string): string {
    return new Date(dateValue).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private closeModal(): void {
    this.modalRef?.close({ action: 'closed', reason: 'cancel' });
  }
}
