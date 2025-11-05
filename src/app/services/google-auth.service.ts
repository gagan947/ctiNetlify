import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {

  private clientId = '994120717709-6hec26klmpd1h9eif5vcahincbbn2m1u.apps.googleusercontent.com';

  constructor(private zone: NgZone) {}

  initGoogleSignIn(callback: (credential: string) => void) {
    (window as any).google?.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: any) => {
        // The response.credential is a JWT from Google
        this.zone.run(() => callback(response.credential));
      }
    });

    (window as any).google?.accounts.id.renderButton(
      document.getElementById('googleSignInDiv'),
      { theme: 'outline', size: 'large', width: 300 }
    );

    (window as any).google?.accounts.id.prompt();
  }
}
