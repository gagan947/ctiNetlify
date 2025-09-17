import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authToken = localStorage.getItem('tokenCTi');

    // Skip certain URLs
    if (request.url.includes('exchangerate.host') || request.url.startsWith('https://api.frankfurter')) {
      return next.handle(request);
    }

    // Clone request and add Authorization header
    let modifiedRequest = request;
    if (request.body instanceof FormData) {
      modifiedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
    } else {
      modifiedRequest = request.clone({
        setHeaders: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });
    }

    // Handle response and catch errors
    return next.handle(modifiedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          localStorage.clear()
          this.router.navigate(['/login']); // redirect to login page
        }
        return throwError(() => error); // rethrow the error if needed
      })
    );
  }
}
