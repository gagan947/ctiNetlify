import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(ApiService);
  if (authService.isLogedIn()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
