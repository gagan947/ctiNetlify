import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // apiUrl = 'http://192.168.1.10:4500/'
  // imageUrl = 'http://192.168.29.241:4500/'
  // apiUrl = 'http://192.168.1.40:4500/';
  // apiUrl = 'https://bbpqirh4sk.execute-api.eu-north-1.amazonaws.com/prod/'
  // apiUrl = 'https://api.creativethoughts.ai/';
  // imageUrl = 'https://api.creativethoughts.ai';
  // apiUrl = 'https://dev-api.creativethoughts.ai/';
  imageUrl = 'https://dev-api.creativethoughts.ai';
  apiUrl = 'http://localhost:4500/';
  reactBuildURl = 'http://localhost:4500';
  // reactBuildURl = 'https://api.creativethoughts.ai';


  private clearInputSubject = new Subject<void>();
  private newChatSubject = new Subject<void>();
  _rate = signal<any>(null);
  _imagePreview = signal<any>(null);
  _htmlCode = signal<any>(null);
  _finalPrompt = signal<any>(null);
  constructor(private http: HttpClient, private route: Router) {
    const data: any = localStorage.getItem('userDetailCTI')
    if (data !== 'undefined') {
      const user = JSON.parse(data);
      this.getRates(user?.currency);
    }
  }

  getApi<T>(url: string): Observable<T> {
    return this.http.get<T>(this.apiUrl + url);
  }

  getAllPlans<T>(billingInterval: 'MONTH' | 'YEAR'): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}api/user/getAllPlans?billing_interval=${billingInterval}`);
  }

  getCreditHistory<T>(limit: number, offset: number): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}api/user/getCreditHistory?limit=${limit}&offset=${offset}`);
  }

  deleteApi<T>(url: string): Observable<T> {
    return this.http.delete<T>(this.apiUrl + url);
  }

  getApiNoCache<T>(url: string): Observable<T> {
    const headers = new HttpHeaders({ 'X-Bypass-Cache': 'true' });
    return this.http.get<T>(this.apiUrl + url, { headers });
  }

  getRates(base: any) {
    const key = '5606f101bb2a1853bbe166f02ed4633c'; // mohd faraz acount key
    const today = new Date().toISOString().split('T')[0];

    if (base === 'INR') {
      this._rate.set(1);
      return;
    } else {
      let params = {
        currency_code: base,
        date: today
      };
      return

      this.getApi(`api/user/getCurrencyRate?${new URLSearchParams(params).toString()}`).subscribe({
        next: (res: any) => {
          if (res.success) {
            if (res.data.length > 0) {
              this._rate.set(Number(res.data[0].rate));
            } else {
              const url = `https://api.exchangerate.host/live?access_key=${key}&source=INR&currencies=AUD,AED,SGD,USD,EUR,GBP`;
              this.http.get(url).subscribe((res: any) => {
                if (res.success) {

                  this._rate.set(res.quotes[`INR${base}`]);
                  const result = Object.entries(res.quotes).map(([key, value]) => {
                    return { [key.replace("INR", "")]: value };
                  });

                  this.postAPI('api/user/updateCurrencyRate', {
                    rate: result,
                    todays_date: today
                  }).subscribe();
                }
              });
            }
          }
        },
        error: err => {
          console.log(err);
        }
      });
    }
  }

  isLogedIn() {
    return this.getToken() !== null;
  }

  postAPI<T, U>(url: string, data: U): Observable<T> {
    return this.http.post<T>(this.apiUrl + url, data)
  };

  getBlob(url: string, payload: any): Observable<Blob> {
    return this.http.post<Blob>(this.apiUrl + url, payload, { responseType: 'blob' as 'json' });
  };

  setToken(token: string) {
    localStorage.setItem('tokenCTi', token);
  };

  getToken() {
    return localStorage.getItem('tokenCTi');
  };

  getUserId() {
    return localStorage.getItem('userIdA');
  };

  logout() {
    localStorage.removeItem('tokenCTi');
    localStorage.removeItem('userDetailCTI');
    sessionStorage.removeItem('conversationId');
    this.route.navigateByUrl('/');
  };


  private offersSubject = new Subject<any>();
  offers$ = this.offersSubject.asObservable();

  sendOffers(offers: any) {
    this.offersSubject.next(offers);
  }

  // Observable that components can subscribe to
  clearInput$ = this.clearInputSubject.asObservable();
  newChat$ = this.newChatSubject.asObservable();

  // Method to trigger the clear event
  triggerClearInput() {
    this.clearInputSubject.next();
  }

  triggerNewChat() {
    this.newChatSubject.next();
  }

  private userDataSubject = new BehaviorSubject<any>(null);
  userData$ = this.userDataSubject.asObservable();

  updateUserDetail(userDetails: any) {
    this.userDataSubject.next(userDetails)
  }


  deleteConversationID() {
    sessionStorage.removeItem('conversationId');
  }

  resetWorkspaceChatState() {
    sessionStorage.removeItem('conversationId');
    sessionStorage.removeItem('publicEnquiryId');
    sessionStorage.removeItem('projectData');
    this.triggerClearInput();
    this.triggerNewChat();
  }
}
