import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-google-auth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './google-auth-callback.component.html',
  styleUrl: './google-auth-callback.component.css'
})
export class GoogleAuthCallbackComponent implements OnInit, OnDestroy {
  readonly loadingSteps = [
    'Verifying your Google account',
    'Securing your session',
    'Preparing your workspace'
  ];
  activeStepIndex = 0;
  private stepTimer?: ReturnType<typeof setInterval>;

  constructor(private googleAuth: GoogleAuthService) { }

  ngOnInit(): void {
    this.stepTimer = window.setInterval(() => {
      this.activeStepIndex = (this.activeStepIndex + 1) % this.loadingSteps.length;
    }, 1400);

    this.googleAuth.completeRedirectLogin(window.location.hash);
  }

  ngOnDestroy(): void {
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
    }
  }
}
