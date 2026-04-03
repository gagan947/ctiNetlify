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

  modalState$ = this.modalStateSubject.asObservable();

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
}
