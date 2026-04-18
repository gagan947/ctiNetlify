import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

export const loginGuard: CanActivateFn = () => {
      const router = inject(Router);
      const authService = inject(ApiService);
      if (authService.isLogedIn()) {
            router.navigate(['/main']);
            return false;
      } else {
            return true;
      }
};
