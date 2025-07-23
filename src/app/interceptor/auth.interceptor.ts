import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor() { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authToken = localStorage.getItem('tokenCTi');

    // Check if the request body is FormData
    if (request.body instanceof FormData) {
      // If it's FormData, set the Content-Type header to 'multipart/form-data'
      const modifiedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
      return next.handle(modifiedRequest);
    } else {
      // For other requests, keep the original Content-Type header
      const modifiedRequest = request.clone({
        setHeaders: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });
      return next.handle(modifiedRequest);
    }
  }
}
