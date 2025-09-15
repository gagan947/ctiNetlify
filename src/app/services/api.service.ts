import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // apiUrl = 'http://192.168.29.241:4500/'
  // imageUrl = 'http://192.168.29.241:4500/'
  // apiUrl = 'http://192.168.1.4:3000/prod/'
  // apiUrl = 'https://bbpqirh4sk.execute-api.eu-north-1.amazonaws.com/prod/'
  apiUrl = 'https://api.creativethoughts.ai/';
  imageUrl = 'https://api.creativethoughts.ai';

  // apiUrl = 'http://localhost:4500/';


  private clearInputSubject = new Subject<void>();
  _rate = signal<any>(null);
  _imagePreview = signal<any>(null);
  _htmlCode = signal<any>(null);
  constructor(private http: HttpClient, private route: Router, private auth: Auth) {
    const data: any = localStorage.getItem('userDetailCTI')
    if (data !== 'undefined') {
      const user = JSON.parse(data);
      this.getRates(user?.currency);
    }

  }

  getApi<T>(url: string): Observable<T> {
    return this.http.get<T>(this.apiUrl + url);
  }


  deleteApi<T>(url: string): Observable<T> {
    return this.http.delete<T>(this.apiUrl + url);
  }

  getApiNoCache<T>(url: string): Observable<T> {
    const headers = new HttpHeaders({ 'X-Bypass-Cache': 'true' });
    return this.http.get<T>(this.apiUrl + url, { headers });
  }

  getRates(base: any) {
    const key = 'cd5719e03a530cce0636b0693b6e72c5';
    // this._rate.set(1);
    // return;
    // handle INR directly
    if (base === 'INR') {
      this._rate.set(1);
      return;
    } else {
      let params = {
        currency_code: base,
        date: new Date().toLocaleDateString()
      }
      this.getApi(`api/user/getCurrencyRate?${new URLSearchParams(params).toString()}`).subscribe({
        next: (res: any) => {
          if (res.success) {
            if (res.data.length > 0) {
              this._rate.set(Number(res.data[0].rate));
            } else {
              const url = `https://api.exchangerate.host/live?access_key=${key}&currencies=${base}&source=INR`;
              this.http.get(url).subscribe((res: any) => {
                if (res.success) {
                  this._rate.set(res.quotes[`INR${base}`]);
                  this.postAPI('api/user/updateCurrencyRate', { currency_code: base, rate: this._rate(), todays_date: new Date().toLocaleDateString() }).subscribe();
                }
              });
            }
          }
        }, error: err => {
          console.log(err);
        }
      })
    }
  }


  isLogedIn() {
    return this.getToken() !== null;
  }

  postAPI<T, U>(url: string, data: U): Observable<T> {
    return this.http.post<T>(this.apiUrl + url, data)
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
    localStorage.removeItem('userDetailAuc');
    this.route.navigateByUrl('/');
  };

  private dataKey = 'auctionData';

  setProduct(data: any) {
    localStorage.setItem('auctionProducts', JSON.stringify(data));
  }

  getProduct() {
    const data = localStorage.getItem('auctionProducts');
    return data ? JSON.parse(data) : null;
  };

  clearProducts() {
    localStorage.removeItem('auctionProducts');
  };

  private offersSubject = new Subject<any>();
  offers$ = this.offersSubject.asObservable();

  sendOffers(offers: any) {
    this.offersSubject.next(offers);
  }

  // Observable that components can subscribe to
  clearInput$ = this.clearInputSubject.asObservable();

  // Method to trigger the clear event
  triggerClearInput() {
    this.clearInputSubject.next();
  }

  private userDataSubject = new BehaviorSubject<any>(null);
  userData$ = this.userDataSubject.asObservable();

  updateUserDetail(userDetails: any) {
    this.userDataSubject.next(userDetails)
  }

  async googleLogin() {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.auth, provider);
  }
}
