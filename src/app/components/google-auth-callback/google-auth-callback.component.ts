import { Component } from '@angular/core';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-google-auth-callback',
  standalone: true,
  template: '<p>Signing you in with Google...</p>'
})
export class GoogleAuthCallbackComponent {
  constructor(private googleAuth: GoogleAuthService) { }

  ngOnInit(): void {
    this.googleAuth.completeRedirectLogin(window.location.hash);
  }
}
