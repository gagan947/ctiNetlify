import { Injectable } from '@angular/core';
import { ModalOptions, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { SubcriptionPageComponent } from '../components/client_buildcard_pages/subcription-page/subcription-page.component';
import { BuyMoreCreditsComponent } from '../components/client_buildcard_pages/buy-more-credits/buy-more-credits.component';
import { UserPlansComponent } from '../components/client_buildcard_pages/user-plans/user-plans.component';

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

export interface UserPlansModalResult {
  action: 'closed';
  reason?: 'cancel' | 'dismiss';
}

export interface UserPlansModalOpenOptions {
  modalOptions?: ModalOptions<UserPlansComponent, object, UserPlansModalResult>;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionModalService {
  private activeModalRef?: NzModalRef<SubcriptionPageComponent, SubscriptionModalResult>;
  private activeBuyMoreCreditsModalRef?: NzModalRef<BuyMoreCreditsComponent, BuyMoreCreditsModalResult>;
  private activeUserPlansModalRef?: NzModalRef<UserPlansComponent, UserPlansModalResult>;

  constructor(private modalService: NzModalService) { }

  get currentRef(): NzModalRef<SubcriptionPageComponent, SubscriptionModalResult> | undefined {
    return this.activeModalRef;
  }

  get currentBuyMoreCreditsRef(): NzModalRef<BuyMoreCreditsComponent, BuyMoreCreditsModalResult> | undefined {
    return this.activeBuyMoreCreditsModalRef;
  }

  get currentUserPlansRef(): NzModalRef<UserPlansComponent, UserPlansModalResult> | undefined {
    return this.activeUserPlansModalRef;
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
      nzMaskClosable: false,
      nzKeyboard: true,
      nzCentered: true,
      nzWidth: 833,
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
      nzClosable: true,
      nzMaskClosable: false,
      nzKeyboard: true,
      nzCentered: true,
      nzWidth: 833,
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

  openUserPlansModal(
    options: UserPlansModalOpenOptions = {}
  ): NzModalRef<UserPlansComponent, UserPlansModalResult> {
    this.activeUserPlansModalRef?.destroy();

    const modalRef = this.modalService.create<
      UserPlansComponent,
      object,
      UserPlansModalResult
    >({
      nzContent: UserPlansComponent,
      nzFooter: null,
      nzClosable: true,
      nzMaskClosable: false,
      nzKeyboard: true,
      nzCentered: true,
      nzWidth: 866,
      nzClassName: 'user-plans-modal-shell',
      nzBodyStyle: {
        padding: '0',
        overflow: 'hidden',
        borderRadius: '32px'
      },
      ...options.modalOptions
    });

    this.activeUserPlansModalRef = modalRef;
    modalRef.afterClose.subscribe(() => {
      if (this.activeUserPlansModalRef === modalRef) {
        this.activeUserPlansModalRef = undefined;
      }
    });

    return modalRef;
  }

  closeUserPlansModal(
    result: UserPlansModalResult = { action: 'closed', reason: 'dismiss' }
  ): void {
    this.activeUserPlansModalRef?.close(result);
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
