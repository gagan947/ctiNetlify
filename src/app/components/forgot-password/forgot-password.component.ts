import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../services/api.service';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
import { NzFlexDirective } from 'ng-zorro-antd/flex';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    SubmitButtonComponent,
    NzInputOtpComponent,
    NzFlexDirective
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  resetForm: FormGroup;
  
  otpVisible: boolean = false;
  emailValue: string = '';
  otp: string = '';
  isOtpSubmitted: boolean = false;
  
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  
  isResendDisabled: boolean = false;
  countdown: number = 60;
  interval: any;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordConfirmValidator });
  }

  passwordConfirmValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (!password || !confirmPassword) return null;
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  restrictToNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  startCountdown() {
    this.isResendDisabled = true;
    this.countdown = 60;

    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.isResendDisabled = false;
        clearInterval(this.interval);
      }
    }, 1000);
  }

  onSendOtp() {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.emailValue = this.forgotForm.value.email;
      
      const payload = {
        email: this.emailValue
      };

      this.apiService.postAPI(`api/user/forgotPassword`, payload)
        .subscribe({
          next: (res: any) => {
            this.isLoading = false;
            if (res.success === true) {
              this.message.success(res.message || 'Verification code sent successfully.');
              
              // Store token if returned in forgotPassword directly
              if (res.data?.token) {
                this.apiService.setToken(res.data.token);
              } else if (res.token) {
                this.apiService.setToken(res.token);
              }
              
              this.otpVisible = true;
              this.startCountdown();
            } else {
              this.message.error(res.message || 'Failed to send verification code.');
            }
          },
          error: (err) => {
            this.isLoading = false;
            const errMsg = err.error?.message || 'Error occurred while sending OTP.';
            this.message.error(errMsg);
          }
        });
    } else {
      this.forgotForm.markAllAsTouched();
    }
  }

  resendOtp() {
    if (this.isResendDisabled) return;
    
    this.isLoading = true;
    const payload = {
      email: this.emailValue
    };

    this.apiService.postAPI(`api/user/forgotPassword`, payload)
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res.success === true) {
            this.message.success(res.message || 'Verification code resent successfully.');
            this.startCountdown();
          } else {
            this.message.error(res.message || 'Failed to resend verification code.');
          }
        },
        error: (err) => {
          this.isLoading = false;
          const errMsg = err.error?.message || 'Error occurred while resending OTP.';
          this.message.error(errMsg);
        }
      });
  }

  onResetPassword() {
    this.isOtpSubmitted = true;
    if (!this.otp || this.otp.length < 6) {
      this.message.error('Please enter a valid 6-digit OTP code.');
      return;
    }

    if (this.resetForm.valid) {
      this.isLoading = true;
      
      // Step 1: Verify the OTP first to establish authenticated session context on backend
      const verifyPayload = {
        email: this.emailValue,
        otp: this.otp
      };

      this.apiService.postAPI(`api/user/verifyEmailOtp`, verifyPayload)
        .subscribe({
          next: (verifyRes: any) => {
            if (verifyRes.success === true) {
              // Store verified session token in localStorage so auth.interceptor includes it
              if (verifyRes.data?.token) {
                this.apiService.setToken(verifyRes.data.token);
              } else if (verifyRes.token) {
                this.apiService.setToken(verifyRes.token);
              }

              // Step 2: Reset the password
              const resetPayload = {
                password: this.resetForm.value.password,
                confirm_password: this.resetForm.value.confirmPassword
              };

              this.apiService.postAPI(`api/user/changeForgotPassword`, resetPayload)
                .subscribe({
                  next: (resetRes: any) => {
                    this.isLoading = false;
                    if (resetRes.success === true) {
                      this.message.success(resetRes.message || 'Password reset successful. Please login with your new password.');
                      
                      // Clear the temporary token
                      localStorage.removeItem('tokenCTi');
                      
                      this.router.navigate(['/login']);
                    } else {
                      this.message.error(resetRes.message || 'Failed to reset password.');
                    }
                  },
                  error: (err) => {
                    this.isLoading = false;
                    const errMsg = err.error?.message || 'Error occurred while resetting password.';
                    this.message.error(errMsg);
                  }
                });
            } else {
              this.isLoading = false;
              this.message.error(verifyRes.message || 'OTP verification failed.');
            }
          },
          error: (err) => {
            this.isLoading = false;
            const errMsg = err.error?.message || 'OTP verification error.';
            this.message.error(errMsg);
          }
        });
    } else {
      this.resetForm.markAllAsTouched();
    }
  }

  backToRequestOtp() {
    this.otpVisible = false;
    this.otp = '';
    this.isOtpSubmitted = false;
    this.resetForm.reset();
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.isResendDisabled = false;
    localStorage.removeItem('tokenCTi');
  }
}
