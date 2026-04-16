import { AfterViewInit, Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Country, State, City } from 'country-state-city'
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router, RouterLink } from '@angular/router';
import { SubmitButtonComponent } from "../shared/submit-button/submit-button.component";
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
import { GoogleAuthService } from '../../services/google-auth.service';
declare var FB: any;
declare const AppleID: any;
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [NgxIntlTelInputModule, ReactiveFormsModule, FormsModule, CommonModule, RouterLink, SubmitButtonComponent, NzIconModule, NzSelectModule, NgxIntlTelInputModule, NzFlexDirective, NzInputOtpComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements AfterViewInit {
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO
  countries: any;
  showPassword: boolean = false;
  isLoading: boolean = false;
  selectedCountry = CountryISO.India
  isPhone: boolean = false;
  isResendDisabled: boolean = false;
  countdown: number = 60;
  interval: any;
  otpVisible: boolean = false;
  phoneNumber: string = '';
  otp: any

  ngOnInit(): void {
    localStorage.clear();
    this.countries = Country.getAllCountries()
  };

  ngAfterViewInit(): void {
    FB.init({
      appId: '1487976079653760',
      cookie: true,
      xfbml: true,
      version: 'v19.0'
    });

    AppleID.auth.init({
      clientId: 'ai.creativethoughts.web',
      scope: 'name email',
      redirectURI: 'https://creativethoughts.ai/auth/apple/callback',
      state: 'origin:web',
      usePopup: true
    });
  }

  signupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiservice: ApiService,
    private message: NzMessageService,
    private router: Router,
    private googleAuth: GoogleAuthService
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: [null],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        ]
      ]
    });
  };

  get f() {
    return this.signupForm.controls;
  }

  onSubmit() {
    this.signupForm.markAllAsTouched();
    if (this.signupForm.invalid) {
      return;
    }

    this.isLoading = true;

    const phoneData = this.signupForm.value.phone || {};
    const formattedPhoneNumber = phoneData.number || '';
    this.phoneNumber = phoneData.dialCode + formattedPhoneNumber || '';

    let url = '';
    let payload: any = {};

    const caseKey = `${this.isPhone}_${this.otpVisible}`;

    switch (caseKey) {
      case 'true_false':
        payload = {
          email: this.signupForm.value.email,
          phoneNumber: +(formattedPhoneNumber),
          country_code: phoneData.dialCode,
          password: this.signupForm.value.password
        };
        url = 'api/user/userSignUpPhoneNumber';
        break;

      case 'false_false':
        payload = {
          email: this.signupForm.value.email,
          password: this.signupForm.value.password
        };
        url = 'api/user/signUp';
        break;

      case 'true_true':
        payload = {
          phoneNumber: +(formattedPhoneNumber),
          otp: this.otp,
        };
        url = 'api/user/verifyOtp';
        break;

      case 'false_true':
        payload = {
          email: this.signupForm.value.email,
          otp: this.otp
        };
        url = 'api/user/verifyEmailOtp';
        break;
    }

    this.apiservice.postAPI(url, payload).subscribe({
      next: (res: any) => {
        if (res.success === true) {
          this.message.success(res.message);

          switch (caseKey) {
            case 'true_false':
              this.otpVisible = true;
              this.startCountdown()
              break;

            case 'true_true':
              this.router.navigate(['/login']);
              break;

            case 'false_false':
              this.phoneNumber = this.signupForm.value.email
              this.otpVisible = true;
              this.startCountdown()
              break;

            case 'false_true':
              this.router.navigate(['/login']);
              break;
          }
        }
        this.isLoading = false;
      },
      error: err => {
        this.isLoading = false;
        this.message.error(err.error.message);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleOTPLogin() {
    this.isPhone = !this.isPhone;
    if (this.isPhone) {
      this.signupForm.get('phone')?.setValidators([Validators.required]);
      this.signupForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
      this.signupForm.get('phone')?.updateValueAndValidity();
      this.signupForm.get('otp')?.updateValueAndValidity();
      this.signupForm.get('email')?.clearValidators();
      this.signupForm.get('email')?.updateValueAndValidity();
    } else {
      this.signupForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.signupForm.get('password')?.setValidators([Validators.required]);
      this.signupForm.get('email')?.updateValueAndValidity();
      this.signupForm.get('password')?.updateValueAndValidity();
      this.signupForm.get('phone')?.clearValidators();
      this.signupForm.get('phone')?.updateValueAndValidity();
    }
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
    let url = '';
    let payload: any = {};
    if (this.signupForm.value.phone) {
      const phoneData = this.signupForm.value.phone;
      const formattedPhoneNumber = phoneData.number;
      payload = {
        phoneNumber: +(formattedPhoneNumber),
        country_code: phoneData.dialCode,
        password: this.signupForm.value.password
      }
      url = 'api/user/userSignUpPhoneNumber';
    } else {
      payload = {
        email: this.signupForm.value.email,
        password: this.signupForm.value.password
      }
      url = 'api/user/signUp';
    }
    this.apiservice.postAPI(url, payload)
      .subscribe({
        next: (res: any) => {
          if (res.success == true) {
            this.message.success(res.message);
            this.otpVisible = true
          }
        },
        error: err =>
          this.message.error(err.error.message)
      })
  };

  loginWithGoogle() {
    this.googleAuth.startRedirectLogin();
  }

  loginWithFacebook() {
    FB.login((response: any) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        this.apiservice.postAPI(`api/user/facebookLogin`, { accessToken: accessToken })
          .subscribe({
            next: (res: any) => {
              if (res.success == true) {
                this.apiservice.setToken(res.data.token);
                localStorage.setItem('userDetailCTI', JSON.stringify(res.data.user));
                this.message.success(res.message)
                if (res.data.user.profile_visited) {
                  this.router.navigate(['/main']);
                } else {
                  this.router.navigate(['/profile']);
                }
              } else {
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
            }
          })
      } else {
        console.log('User cancelled Facebook login or did not fully authorize.');
      }
    }, { scope: 'email,public_profile' });
  }

  loginWithApple() {
    AppleID.auth.signIn().then((response: any) => {
      const formData = {
        identityToken: response.authorization.id_token,
        user: response.user
      };

      this.apiservice.postAPI(`api/user/appleLogin`, formData)
        .subscribe({
          next: (res: any) => {
            if (res.success == true) {
              this.apiservice.setToken(res.data.token);
              localStorage.setItem('userDetailCTI', JSON.stringify(res.data.user));
              this.message.success(res.message)

              if (res.data.user.profile_visited) {
                this.router.navigate(['/main']);
              } else {
                this.router.navigate(['/profile']);
              }
            } else {
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
          }
        });
    }).catch((error: any) => {
      console.error('Apple Sign-In error:', error);
      this.message.error('Apple Sign-In failed. Please try again.');
    });
  }
}
