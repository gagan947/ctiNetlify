import { Component, inject, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from "../client_buildcard_pages/sidebar/sidebar.component";
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ApiService } from '../../services/api.service';
import { ApiResponse, UserProfile } from '../../models/userProfile';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
import { NgxIntlTelInputModule } from 'ngx-intl-tel-input-gg';
import { CountryISO, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SubmitButtonComponent } from "../shared/submit-button/submit-button.component";
declare var bootstrap: any;
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, SidebarComponent, CommonModule, FormsModule, NzSelectModule, NgxIntlTelInputModule, NzInputOtpComponent, NzFlexDirective, SubmitButtonComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  @ViewChild('profilePhoneForm') profilePhoneForm!: NgForm;
  selectedType: string = 'VAT';
  user: UserProfile | null = null;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.India;
  phone: any;
  verifyOtp = false;
  currencies = [
    { code: 'USD', name: 'United States Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'AED', name: 'UAE Dirham' }
  ];
  otp: any;
  isResendDisabled: boolean = false;
  isOtpError: boolean = false;
  countdown: number = 60;
  interval: any;
  isLoading: boolean = false;
  selectedCurrency: string = 'USD'; // default
  private apiService = inject(ApiService);
  private message = inject(NzMessageService); // Inject the service

  ngOnInit() {
    this.getProfile();

  }

  getProfile() {
    this.apiService.getApi<ApiResponse<UserProfile>>('api/user/getUserProfile').subscribe((res) => {
      if (res.success && res.data.length > 0) {
        this.user = res.data[0];

        // Pre-select tax type based on existing data
        if (this.user.gst_number) this.selectedType = 'GST';
        else if (this.user.vat_number) this.selectedType = 'VAT';
        else if (this.user.tan_number) this.selectedType = 'TAN';

        if (this.user.country_code && this.user.phoneNumber) {
          this.phone = {
            number: this.user.phoneNumber,
            internationalNumber: `${this.user.country_code} ${this.user.phoneNumber}`,
            nationalNumber: this.user.phoneNumber,
            e164Number: `${this.user.country_code}${this.user.phoneNumber}`,
            dialCode: this.user.country_code,
            countryCode: this.user.country_code.replace('+', '') // optional mapping
          };
        }
      }
    });
  }

  verifyEmail() {

  }
  verifySendOtp(form: NgForm) {
    if (form.invalid || !this.phone?.number) {
      console.log("Invalid form", form);
      return;
    }
  
    console.log("Valid form, phone:", this.phone);
    const userData = {
      phoneNumber: this.phone!.number,
      country_code: this.phone!.dialCode,
    }
 
    this.apiService.postAPI('api/user/sendOtpNumberProfile', userData).subscribe((res: any) => {
      if (res.success) {
        this.startCountdown()
        const otpModalEl = document.getElementById('otpVerifyModal');
        if (otpModalEl) {
          const modal = new bootstrap.Modal(otpModalEl);
          modal.show();
        }
      }
    })
  };

  verifyOtpNumber() {
    const userData = {
      otp: this.otp
    }
    this.apiService.postAPI('api/user/verifyOtpNumberProfile', userData).subscribe((res: any) => {
      if (res.success) {
        this.message.success('OTP verified successfully');
        const otpModalEl = document.getElementById('otpVerifyModal');
        if (otpModalEl) {
          const modal = new bootstrap.Modal(otpModalEl);
          modal.hide();
        }
        this.getProfile();
      }
    })
  }

  updateProfile() {
    if (this.phone && this.user) {
      this.user.country_code = this.phone!.dialCode;
      this.user.phoneNumber = this.phone!.number;
    }

    this.apiService.postAPI('api/user/updateUserProfile', this.user).subscribe((res: any) => {
      if (res.success) {
        this.message.success('Profile updated successfully');
        this.getProfile();
      }else{
        this.message.error(res.message);
      }
    });
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
    // const phoneData = ''
    // const formattedPhoneNumber = phoneData.number;
    // const payload = {
    //   phoneNumber: +(formattedPhoneNumber),
    // }
    // let url = 'api/user/sendOtpNumber';
    // this.apiService.postAPI(url, payload)
    //   .subscribe({
    //     next: (res: any) => {
    //       if (res.success == true) {
    //         this.message.success(res.message);
    //         this.startCountdown()
    //       }
    //     },
    //     error: err => {
    //       this.message.error(err.error.message);
    //     }
    //   });
  }


}

