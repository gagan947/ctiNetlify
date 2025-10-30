import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SubmitButtonComponent } from "../shared/submit-button/submit-button.component";
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
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
  phoneNumber: string = ''
  otpVisible: boolean = false;
  otp: any
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService,) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      contact: [''],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    localStorage.clear();
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
      this.loginForm.get('contact')?.updateValueAndValidity();
      this.loginForm.get('email')?.clearValidators();
      this.loginForm.get('email')?.updateValueAndValidity();
      this.loginForm.get('password')?.clearValidators();
      this.loginForm.get('password')?.updateValueAndValidity();
    } else {
      this.loginForm.get('email')?.setValidators([Validators.required]);
      this.loginForm.get('password')?.setValidators([Validators.required]);
      this.loginForm.get('email')?.updateValueAndValidity();
      this.loginForm.get('password')?.updateValueAndValidity();
      this.loginForm.get('contact')?.clearValidators();
      this.loginForm.get('contact')?.updateValueAndValidity();
      this.loginForm.get('otp')?.clearValidators();
      this.loginForm.get('otp')?.updateValueAndValidity();
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
    const phoneData = this.loginForm.value.contact;
    const formattedPhoneNumber = phoneData.number;
    const payload = {
      phoneNumber: formattedPhoneNumber,
      country_code: phoneData.dialCode
    }
    let url = 'api/user/sendOtpNumber';
    this.apiService.postAPI(url, payload)
      .subscribe({
        next: (res: any) => {
          if (res.success == true) {
            this.message.success(res.message);
            this.startCountdown()
          }
        },
        error: err => {
          this.message.error(err.error.message);
        }
      });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      let payload: any = {};
      let apiUrl = '';

      const caseKey = `${this.isPhone}_${this.otpVisible}`;

      switch (caseKey) {
        case 'true_false':
          payload = {
            phoneNumber: this.loginForm.value.contact.number,
            country_code: this.loginForm.value.contact.dialCode,
          };
          apiUrl = 'api/user/sendOtpNumber';
          break;

        case 'true_true':
          payload = {
            phoneNumber: this.loginForm.value.contact.number,
            otp: this.otp
          };
          apiUrl = 'api/user/verifyOtp';
          break;

        case 'false_false':
        default:
          payload = {
            emailOrPhone: this.loginForm.value.email,
            password: this.loginForm.value.password
          };
          apiUrl = 'api/user/signIn';
          break;
      }

      this.apiService.postAPI(apiUrl, payload).subscribe({
        next: (res: any) => {
          if (res.success === true) {
            this.message.success(res.message);
            switch (caseKey) {
              case 'true_false':
                this.phoneNumber = this.loginForm.value.contact.number
                this.otpVisible = true;
                this.startCountdown()
                break;
              case 'true_true':
              case 'false_false':
                this.apiService.setToken(res.data.token);
                localStorage.setItem('userDetailCTI', JSON.stringify(res.data.user));
               
                if (res.data.user.profile_visited) {
                  this.router.navigate(['/main']);
                } else {
                  this.router.navigate(['/profile']);
                }
                break;
            }
          } else {
            this.message.error(res.message);
          }
          this.isLoading = false;
        },
        error: err => {
          console.log(err);
          switch (true) {
            case err.status === 0:
              this.message.error('Network error, please check your connection.');
              break;
            case !!err.error?.message:
              this.message.error(err.error.message);
              break;
            default:
              this.message.error('Unexpected error occurred.');
          }
          this.isLoading = false;
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  get formControls() {
    return this.loginForm.controls;
  }

  loginWithGoogle() {
  
    this.apiService.googleLogin().then((res: any) => {

      const formData = {
        token: res.user.accessToken,
      }

      this.apiService.postAPI(`api/user/googleLogin`, formData)
        .subscribe({
          next: (res: any) => {
            if (res.success == true) {
              this.apiService.setToken(res.data.token);
              localStorage.setItem('userDetailCTI', JSON.stringify(res.data.user));
              this.message.success(res.message)

              if (res.data.user.profile_visited) {
                this.router.navigate(['/main']);
              } else {
                this.router.navigate(['/profile']);
              }
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