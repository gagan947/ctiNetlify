import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor() { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authToken = localStorage.getItem('tokenCTi');

    if(request.url.startsWith('https://api.frankfurter')) {
      return next.handle(request);
      
    }else{
      if (request.body instanceof FormData) {
      
        const modifiedRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${authToken}`
          }
        });
        return next.handle(modifiedRequest);
      } else {
        
        const modifiedRequest = request.clone({
          setHeaders: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        });
        return next.handle(modifiedRequest);
      }
    }
    return next.handle(request);

  }
}
