import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface SubscriptionModalState {
  isOpen: boolean;
  selectedTemplateId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionModalService {
  private modalStateSubject = new BehaviorSubject<SubscriptionModalState>({
    isOpen: false,
    selectedTemplateId: ''
  });

  private buyMoreCreditsModalStateSubject = new BehaviorSubject<boolean>(false);

  modalState$ = this.modalStateSubject.asObservable();
  buyMoreCreditsModalState$ = this.buyMoreCreditsModalStateSubject.asObservable();

  get currentState(): SubscriptionModalState {
    return this.modalStateSubject.value;
  }

  open(selectedTemplateId = ''): void {
    this.modalStateSubject.next({
      isOpen: true,
      selectedTemplateId
    });
  }

  close(): void {
    this.modalStateSubject.next({
      isOpen: false,
      selectedTemplateId: ''
    });
  }

  openBuyMoreCreditsModal(): void {
    this.buyMoreCreditsModalStateSubject.next(true);
  }

  closeBuyMoreCreditsModal(): void {
    this.buyMoreCreditsModalStateSubject.next(false);
  }
}
