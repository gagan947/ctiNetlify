import { Component, OnInit } from '@angular/core';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-google-auth-callback',
  standalone: true,
  templateUrl: './google-auth-callback.component.html',
  styleUrl: './google-auth-callback.component.css'
})
export class GoogleAuthCallbackComponent implements OnInit {
  constructor(private googleAuth: GoogleAuthService) { }

  ngOnInit(): void {
    queueMicrotask(() => this.googleAuth.completeRedirectLogin(window.location.hash));
  }
}
