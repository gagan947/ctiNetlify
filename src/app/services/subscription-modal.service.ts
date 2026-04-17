import { Injectable } from '@angular/core';
import { ModalOptions, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { SubcriptionPageComponent } from '../components/client_buildcard_pages/subcription-page/subcription-page.component';
import { BuyMoreCreditsComponent } from '../components/client_buildcard_pages/buy-more-credits/buy-more-credits.component';

export interface SubscriptionModalData {
  selectedTemplateId: string;
}

export interface SubscriptionModalResult {
  action: 'closed';
  reason?: 'cancel' | 'dismiss';
}

export interface SubscriptionModalOpenOptions {
  selectedTemplateId?: string;
  modalOptions?: ModalOptions<SubcriptionPageComponent, SubscriptionModalData, SubscriptionModalResult>;
}

export interface BuyMoreCreditsModalResult {
  action: 'closed';
  reason?: 'cancel' | 'dismiss';
}

export interface BuyMoreCreditsModalOpenOptions {
  modalOptions?: ModalOptions<BuyMoreCreditsComponent, object, BuyMoreCreditsModalResult>;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionModalService {
  private activeModalRef?: NzModalRef<SubcriptionPageComponent, SubscriptionModalResult>;
  private activeBuyMoreCreditsModalRef?: NzModalRef<BuyMoreCreditsComponent, BuyMoreCreditsModalResult>;

  constructor(private modalService: NzModalService) { }

  get currentRef(): NzModalRef<SubcriptionPageComponent, SubscriptionModalResult> | undefined {
    return this.activeModalRef;
  }

  get currentBuyMoreCreditsRef(): NzModalRef<BuyMoreCreditsComponent, BuyMoreCreditsModalResult> | undefined {
    return this.activeBuyMoreCreditsModalRef;
  }

  open(
    selectedTemplateIdOrOptions: string | SubscriptionModalOpenOptions = ''
  ): NzModalRef<SubcriptionPageComponent, SubscriptionModalResult> {
    const options = this.normalizeOpenOptions(selectedTemplateIdOrOptions);

    this.activeModalRef?.destroy();

    const modalRef = this.modalService.create<
      SubcriptionPageComponent,
      SubscriptionModalData,
      SubscriptionModalResult
    >({
      nzContent: SubcriptionPageComponent,
      nzData: {
        selectedTemplateId: options.selectedTemplateId || ''
      },
      nzFooter: null,
      nzClosable: true,
      nzMaskClosable: true,
      nzKeyboard: true,
      nzWidth: 1250,
      nzStyle: { top: '20px' },
      nzClassName: 'subscription-modal-shell',
      nzBodyStyle: {
        padding: '0',
        overflow: 'hidden',
        borderRadius: '24px'
      },
      ...options.modalOptions
    });

    this.activeModalRef = modalRef;
    modalRef.afterClose.subscribe(() => {
      if (this.activeModalRef === modalRef) {
        this.activeModalRef = undefined;
      }
    });

    return modalRef;
  }

  close(result: SubscriptionModalResult = { action: 'closed', reason: 'dismiss' }): void {
    this.activeModalRef?.close(result);
  }

  openBuyMoreCreditsModal(
    options: BuyMoreCreditsModalOpenOptions = {}
  ): NzModalRef<BuyMoreCreditsComponent, BuyMoreCreditsModalResult> {
    this.activeBuyMoreCreditsModalRef?.destroy();

    const modalRef = this.modalService.create<
      BuyMoreCreditsComponent,
      object,
      BuyMoreCreditsModalResult
    >({
      nzContent: BuyMoreCreditsComponent,
      nzFooter: null,
      nzClosable: false,
      nzMaskClosable: true,
      nzKeyboard: true,
      nzWidth: 960,
      nzStyle: { top: '20px' },
      nzClassName: 'buy-more-credits-modal-shell',
      nzBodyStyle: {
        padding: '0',
        overflow: 'hidden',
        borderRadius: '24px'
      },
      ...options.modalOptions
    });

    this.activeBuyMoreCreditsModalRef = modalRef;
    modalRef.afterClose.subscribe(() => {
      if (this.activeBuyMoreCreditsModalRef === modalRef) {
        this.activeBuyMoreCreditsModalRef = undefined;
      }
    });

    return modalRef;
  }

  closeBuyMoreCreditsModal(
    result: BuyMoreCreditsModalResult = { action: 'closed', reason: 'dismiss' }
  ): void {
    this.activeBuyMoreCreditsModalRef?.close(result);
  }

  private normalizeOpenOptions(
    selectedTemplateIdOrOptions: string | SubscriptionModalOpenOptions
  ): SubscriptionModalOpenOptions {
    if (typeof selectedTemplateIdOrOptions === 'string') {
      return {
        selectedTemplateId: selectedTemplateIdOrOptions
      };
    }

    return selectedTemplateIdOrOptions || {};
  }
}
