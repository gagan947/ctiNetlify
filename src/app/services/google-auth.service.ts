import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private readonly clientId = '316919446938-cj2jdkrjqdgqpf8p411mce8sp6lb0vr2.apps.googleusercontent.com';
  private initialized = false;
  private credentialHandler?: (response: any) => void;
  private googleReadyPromise?: Promise<any>;

  constructor(
    private zone: NgZone,
    private apiService: ApiService,
    private router: Router,
    private message: NzMessageService
  ) { }

  setCredentialHandler(callback: (response: any) => void) {
    this.credentialHandler = callback;
  }

  clearCredentialHandler() {
    this.credentialHandler = undefined;
  }

  renderButton(target: string | HTMLElement | null, options: Record<string, any> = {}) {
    const buttonElement = typeof target === 'string' ? document.getElementById(target) : target;
    if (!buttonElement) {
      return;
    }

    this.waitForGoogle().then((google) => {
      if (!buttonElement.isConnected) {
        return;
      }

      this.ensureInitialized(google);

      buttonElement.innerHTML = '';
      google.accounts.id.renderButton(buttonElement, options);
    });
  }

  prompt() {
    this.waitForGoogle().then((google) => {
      this.ensureInitialized(google);
      google.accounts.id.prompt();
    });
  }

  startRedirectLogin(forceAccountSelection = false) {
    const redirectUri = this.getRedirectUri();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'id_token');
    url.searchParams.set('scope', 'openid email profile');
    if (forceAccountSelection) {
      url.searchParams.set('prompt', 'select_account');
    }
    url.searchParams.set('nonce', this.createNonce());

    window.location.replace(url.toString());
  }

  completeRedirectLogin(hash: string) {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const idToken = params.get('id_token');
    const error = params.get('error');
    window.history.replaceState({}, document.title, this.getRedirectUri());

    if (error) {
      this.message.error('Google Sign-In was cancelled or failed.');
      this.router.navigateByUrl('/', { replaceUrl: true });
      return;
    }

    if (!idToken) {
      this.message.error('Google Sign-In did not return a valid token.');
      this.router.navigateByUrl('/', { replaceUrl: true });
      return;
    }

    this.loginWithCredential(idToken);
  }

  loginWithCredential(credential: string, onComplete?: () => void) {
    this.apiService.postAPI(`api/user/googleLogin`, { credential }).subscribe({
      next: (res: any) => {
        if (res.success === true) {
          this.apiService.setToken(res.data.token);
          localStorage.setItem('userDetailCTI', JSON.stringify(res.data.user));

          if (res.data.user.profile_visited) {
            this.router.navigateByUrl('/main', { replaceUrl: true });
          } else {
            this.router.navigateByUrl('/profile', { replaceUrl: true });
          }
        } else {
          this.message.error(res.message);
        }

        onComplete?.();
      },
      error: (err) => {
        if (err.status === 0) {
          this.message.error('Network error, please check your connection.');
        } else if (err.error?.message) {
          this.message.error(err.error.message);
        } else {
          this.message.error('Unexpected error occurred.');
        }

        onComplete?.();
      }
    });
  }

  private getRedirectUri() {
    return `${window.location.origin}/tool/auth/google/callback`;
    // return `${window.location.origin}/auth/google/callback`;
  }
 

  private createNonce() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private ensureInitialized(google = (window as any).google) {
    if (this.initialized || !google?.accounts?.id) {
      return;
    }
    google.accounts.id.disableAutoSelect();
    google.accounts.id.initialize({
      client_id: this.clientId,
      auto_select: false,
      callback: (response: any) => {
        this.zone.run(() => this.credentialHandler?.(response));
      }
    });

    this.initialized = true;
  }

  private waitForGoogle(): Promise<any> {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      return Promise.resolve(google);
    }

    if (!this.googleReadyPromise) {
      this.googleReadyPromise = new Promise((resolve) => {
        const checkGoogle = () => {
          const availableGoogle = (window as any).google;
          if (availableGoogle?.accounts?.id) {
            resolve(availableGoogle);
            return;
          }

          window.setTimeout(checkGoogle, 100);
        };

        checkGoogle();
      });
    }

    return this.googleReadyPromise;
  }
}
