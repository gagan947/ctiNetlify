import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private readonly clientId = '994120717709-6hec26klmpd1h9eif5vcahincbbn2m1u.apps.googleusercontent.com';
  private initialized = false;
  private credentialHandler?: (response: any) => void;
  private googleReadyPromise?: Promise<any>;

  constructor(private zone: NgZone) { }

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

  private ensureInitialized(google = (window as any).google) {
    if (this.initialized || !google?.accounts?.id) {
      return;
    }

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
