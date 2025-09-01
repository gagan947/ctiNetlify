import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Country, State, City } from 'country-state-city'
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router, RouterLink } from '@angular/router';
import { SubmitButtonComponent } from "../shared/submit-button/submit-button.component";
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [NgxIntlTelInputModule, ReactiveFormsModule, FormsModule, CommonModule, RouterLink, SubmitButtonComponent, NzIconModule, NzSelectModule, NgxIntlTelInputModule,NzFlexDirective,NzInputOtpComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO
  countries: any;
  showPassword: boolean = false; // Initially, password is hidden
  isLoading: boolean = false;
  selectedCountry = CountryISO.India
  isPhone: boolean = false;
  isResendDisabled: boolean = false;
  countdown: number = 60;
  interval: any;
  otpVisible: boolean = true;
  phoneNumber: string = '';
  ngOnInit(): void {
    this.countries = Country.getAllCountries()
  };

  signupForm: FormGroup;


  constructor(private fb: FormBuilder, private apiservice: ApiService, private message: NzMessageService, private router: Router) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: [null, [Validators.required]],
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
    this.signupForm.markAllAsTouched()
    if (this.signupForm.invalid) {
      return;
    }
    this.isLoading = true
    const phoneData = this.signupForm.value.phone;
    console.log(phoneData);
    const formattedPhoneNumber = phoneData.number;
    console.log(formattedPhoneNumber);
this.phoneNumber = phoneData.dialCode + formattedPhoneNumber
    // const payload = {
    //   email: this.signupForm.value.email,
    //   name: this.signupForm.value.name,
    //   phoneNumber: +(formattedPhoneNumber),
    //   password: this.signupForm.value.password
    // };

    let url = '';
    let payload = {};
    if (this.isPhone) {
      payload = {
        email: this.signupForm.value.email,
        phoneNumber: +(formattedPhoneNumber),
        country_code : phoneData.dialCode,
        password: this.signupForm.value.password
      }
      url = 'api/user/userSignUpPhoneNumber';
    } else if(!this.isPhone && !this.otpVisible) {
      payload = {
        email: this.signupForm.value.email,
        password: this.signupForm.value.password
      }
      url = 'api/user/signUp';
    }else if(!this.isPhone && this.otpVisible){
      payload = {
        phoneNumber: +(formattedPhoneNumber),
        otp : phoneData.dialCode,
      }
      url = 'api/user/verifyOtp';
    }
    this.apiservice.postAPI(url, payload)
      .subscribe({
        next: (res: any) => {
          if (res.success == true) {
            this.message.success(res.message);
            if(this.isPhone){
              this.otpVisible = true
            }else if{
              this.router.navigate(['/login']);
            }
            this.isLoading = false
          } else {
            this.isLoading = false
          }
        },
        error: err => {
          this.isLoading = false
          this.message.error(err.error.message);
        }
      });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword; // Toggle password visibility
  }

  toggleOTPLogin() {
    this.isPhone = !this.isPhone;
    if (this.isPhone) {
      this.signupForm.get('contact')?.setValidators([Validators.required]);
      this.signupForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
      this.signupForm.get('contact')?.updateValueAndValidity();
      this.signupForm.get('otp')?.updateValueAndValidity();
      this.signupForm.get('email')?.clearValidators();
      this.signupForm.get('email')?.updateValueAndValidity();
    } else {
      this.signupForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.signupForm.get('password')?.setValidators([Validators.required]);
      this.signupForm.get('email')?.updateValueAndValidity();
      this.signupForm.get('password')?.updateValueAndValidity();
      this.signupForm.get('contact')?.clearValidators();
      this.signupForm.get('contact')?.updateValueAndValidity();
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
    this.isLoading = true
    const phoneData = this.signupForm.value.phone;
    const formattedPhoneNumber = phoneData.number;
    const payload = {
      phoneNumber: +(formattedPhoneNumber),
    }
    let url = 'api/user/userSignUpPhoneNumber';
    this.apiservice.postAPI(url, payload)
    .subscribe({
      next: (res: any) => {
        if (res.success == true) {
          this.message.success(res.message);
          this.otpVisible = true
          this.isLoading = false
        } else {
          this.isLoading = false
        }
      },
      error: err => {
        this.isLoading = false
        this.message.error(err.error.message);
      }
    });
  }
}
