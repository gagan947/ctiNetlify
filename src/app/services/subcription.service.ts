import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SubcriptionService {
  private subscriptionSubject = new BehaviorSubject<any>(null);
  subscription$ = this.subscriptionSubject.asObservable();

  constructor(private appService: ApiService) {}

  loadSubscription() {
    return this.appService.getApi('api/user/getMySubscription')
      .subscribe((res: any) => {
        if (res.success) {
          this.subscriptionSubject.next(res.data);
        }
      });
  }

  refreshSubscription() {
    this.loadSubscription();
  }

  clearSubscription() {
    this.subscriptionSubject.next(null);
  }
}
