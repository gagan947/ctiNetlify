import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SubmitButtonComponent } from "../shared/submit-button/submit-button.component";
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, CommonModule, SubmitButtonComponent, NgxIntlTelInputModule, NzInputOtpComponent, NzFlexDirective],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword: boolean = false;
  isLoading = false
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.India
  isPhone: boolean = false
  isResendDisabled: boolean = false;
  countdown: number = 60;
  interval: any;
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService,) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      contact: [''],
      password: ['', [Validators.required]],
      otp: ['']
    });
  }

  ngOnInit(): void {
    this.startCountdown()
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  restrictToNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  toggleOTPLogin() {
    this.isPhone = !this.isPhone;
    if (this.isPhone) {
      this.loginForm.get('contact')?.setValidators([Validators.required]);
      this.loginForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
      this.loginForm.get('contact')?.updateValueAndValidity();
      this.loginForm.get('otp')?.updateValueAndValidity();
      this.loginForm.get('email')?.clearValidators();
      this.loginForm.get('email')?.updateValueAndValidity();
    } else {
      this.loginForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.loginForm.get('password')?.setValidators([Validators.required]);
      this.loginForm.get('email')?.updateValueAndValidity();
      this.loginForm.get('password')?.updateValueAndValidity();
      this.loginForm.get('contact')?.clearValidators();
      this.loginForm.get('contact')?.updateValueAndValidity();
    }
  }


  startCountdown() {
    this.isResendDisabled = true;
    this.countdown = 60;

    this.interval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--
      } else {
        this.isResendDisabled = false;
        clearInterval(this.interval);
      }
    }, 1000);
  }

  resendOtp() {

  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const payload = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.apiService.postAPI(`api/user/signIn`, payload)
        .subscribe({
          next: (res: any) => {
            if (res.success == true) {
              this.apiService.setToken(res.data.token);
              localStorage.setItem('userDetailCTI', JSON.stringify(res.data.users));
              this.message.success(res.message)
              this.router.navigate(['/main'])
              // this.projectInfo = res.projectInfo
              // this, this.getProjectMedia()
              this.isLoading = false
            } else {
              this.isLoading = false
              // this.loading = false
              this.message.error(res.message)
            }
          },
          error: err => {
            if (err.status === 0) {
              this.message.error('Network error, please check your connection.');
            } else if (err.error?.message) {
              this.message.error(err.error.message);
            } else {
              this.message.error('Unexpected error occurred.');
            }
            this.isLoading = false
          }
        });
    } else {
      this.loginForm.markAllAsTouched()
    }
  }

  get formControls() {
    return this.loginForm.controls;
  }

  loginWithGoogle() {
    this.apiService.googleLogin().then(res => {

      const formData = {
        email: res.user.email,
        fullName: res.user.displayName,
        fcm_token: localStorage.getItem('fcm_token') || ''
      }

      this.apiService.postAPI(`api/user/signIn`, formData)
        .subscribe({
          next: (res: any) => {
            if (res.success == true) {
              this.apiService.setToken(res.data.token);
              localStorage.setItem('userDetailCTI', JSON.stringify(res.data.users));
              this.message.success(res.message)
              this.router.navigate(['/main'])
              // this.projectInfo = res.projectInfo
              // this, this.getProjectMedia()
              this.isLoading = false
            } else {
              this.isLoading = false
              // this.loading = false
              this.message.error(res.message)
            }
          },
          error: err => {
            if (err.status === 0) {
              this.message.error('Network error, please check your connection.');
            } else if (err.error?.message) {
              this.message.error(err.error.message);
            } else {
              this.message.error('Unexpected error occurred.');
            }
            this.isLoading = false
          }
        });
    });
  }
}