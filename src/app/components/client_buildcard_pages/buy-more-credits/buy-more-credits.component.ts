import { CommonModule } from '@angular/common';
import { Component, Optional } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { BuyMoreCreditsModalResult } from '../../../services/subscription-modal.service';
import { ApiService } from '../../../services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
declare var window: any;

interface TopUpPack {
  id: number;
  pack_key: string;
  pack_name: string;
  price_inr: string;
  credits: number;
  is_active: number;
  sort_order: number;
}

@Component({
  selector: 'app-buy-more-credits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './buy-more-credits.component.html',
  styleUrl: './buy-more-credits.component.css'
})
export class BuyMoreCreditsComponent {
  topUpPacks: TopUpPack[] = [];
  isLoading = false;
  customAmount = '';
  customCredits = 0;
  customAmountError = '';
  private readonly fallbackTopUpPacks: TopUpPack[] = [
    {
      id: 16,
      pack_key: 'topup_small_2000',
      pack_name: 'Small Top-Up',
      price_inr: '2000.00',
      credits: 100,
      is_active: 1,
      sort_order: 10
    },
    {
      id: 17,
      pack_key: 'topup_medium_5000',
      pack_name: 'Medium Top-Up',
      price_inr: '5000.00',
      credits: 260,
      is_active: 1,
      sort_order: 20
    },
    {
      id: 18,
      pack_key: 'topup_large_10000',
      pack_name: 'Large Top-Up',
      price_inr: '10000.00',
      credits: 550,
      is_active: 1,
      sort_order: 30
    }
  ];

  constructor(
    private apiService: ApiService,
    private message: NzMessageService,
    private router: Router,
    @Optional() private modalRef?: NzModalRef<BuyMoreCreditsComponent, BuyMoreCreditsModalResult>,
  ) { }


  ngOnInit(): void {
    this.getAllTopUpPlans();
  }

  getAllTopUpPlans() {
    this.isLoading = true;
    this.apiService.getApi('api/payment/topup-packs').subscribe({
      next: (res: any) => {
        this.topUpPacks = this.extractTopUpPacks(res?.data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.topUpPacks = this.extractTopUpPacks(this.fallbackTopUpPacks);
        this.isLoading = false;
        this.message.error('Failed to fetch top-up plans. Showing the available credit packs.');
      }
    });
  }

  formatPrice(price: string | number): string {
    return Number(price || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getPackBadge(pack: TopUpPack, index: number): string {
    if (index === 1) {
      return 'Best Value';
    }

    if (pack.pack_key.startsWith('topup_')) {
      return pack.pack_name.replace('Top-Up', '').trim() || 'Top Up';
    }

    if (pack.pack_name.toLowerCase().includes('yearly')) {
      return 'Yearly';
    }

    if (pack.pack_name.toLowerCase().includes('monthly')) {
      return 'Monthly';
    }

    return 'Credits';
  }

  isFeatured(index: number): boolean {
    return index === 1;
  }

  getPackSubLabel(pack: TopUpPack): string {
    if (pack.pack_key.startsWith('topup_')) {
      return 'One-time top-up';
    }

    return pack.pack_name;
  }

  getPackHighlights(pack: TopUpPack, index: number): string[] {
    if (index === 0) {
      return [
        'Quick top-up for small usage',
        'Instant credit addition',
        'Works for all users'
      ];
    }

    if (index === 1) {
      return [
        'Balanced for moderate usage',
        'Ideal for ongoing customization',
        'Works for all users'
      ];
    }

    return [
      'Quick top-up for heavy usage',
      'Instant credit addition',
      'Works for all users'
    ];
  }

  trackByPackId(_index: number, pack: TopUpPack): number {
    return pack.id;
  }

  onCustomAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const rawValue = input?.value || '';
    this.customAmount = rawValue.replace(/[^\d.]/g, '');
    if (Number(this.customAmount) < 16.50) {
      this.customCredits = 0;
      this.customAmountError = 'Minimum amount is 16.50 INR';
      return;
    }

    this.customAmountError = '';
    this.customCredits = Math.round(Number(this.customAmount) / 16.50);
  }

  private extractTopUpPacks(packs: TopUpPack[] | null | undefined): TopUpPack[] {
    return (packs || [])
      .filter((pack) => pack.is_active === 1)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  buyCredits(pack: TopUpPack | null) {

    let payload = {};
    if (pack) {
      payload = {
        packKey: pack.pack_key,
        redirectPath: window.location.origin + this.router.url || '/my-plan'
      };
    } else {
      if (Number(this.customAmount) < 16.50 || !this.customAmount || !Number(this.customAmount) || isNaN(Number(this.customAmount))) {
        return;
      }
      payload = {
        customAmountInr: this.customAmount,
        redirectPath: window.location.origin + this.router.url || '/my-plan'
      };
    }
    this.apiService.postAPI('api/payment/create-topup-order', payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          if (res.data.payment_session_id) {
            this.openCashfreeSubscriptionCheckout(res.data.payment_session_id);
          }
        } else {
          this.message.error(res.message || 'Failed to create top-up order. Please try again.');
        }
      },
      error: (err) => {
        console.error(err);
        this.message.error(err.error.message || 'Failed to create top-up order. Please try again.');
      }
    });
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

    cashfree.checkout({
      paymentSessionId: subscriptionSessionId,
      // redirectTarget: "self",
    })
      .then((result: any) => {
        if (result.error) {
          alert(result.error.message);
        }
      })
      .catch((err: any) => {
        console.error("Unexpected Cashfree subscription error:", err);
      });
  }
}
