import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SubcriptionService {
  private subscriptionSubject = new BehaviorSubject<any>(null);
  subscription$ = this.subscriptionSubject.asObservable();
  private isLoading = false;

  constructor(private appService: ApiService) { }

  loadSubscription(force = false) {
    // if (!force && (this.subscriptionSubject.value || this.isLoading)) {
    //   return;
    // }

    this.isLoading = true;
    return this.appService.getApi('api/user/getMySubscription')
      .subscribe((res: any) => {
        this.isLoading = false;
        if (res.success) {
          this.subscriptionSubject.next(res);
        }
      }, () => {
        this.isLoading = false;
      });
  }

  refreshSubscription() {
    this.loadSubscription(true);
  }

  clearSubscription() {
    this.subscriptionSubject.next(null);
    this.isLoading = false;
  }
}
