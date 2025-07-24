import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const loginGuard: CanActivateFn = (route, state) => {
      const router = inject(Router);
      const authService = inject(AuthService);

      if (authService.isLogedIn()) {
            router.navigate(['/home']);
            return false;
      } else {
            return true;
      }
};