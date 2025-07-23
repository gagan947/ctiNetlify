import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { Country, State, City } from 'country-state-city'
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [NgxIntlTelInputModule, ReactiveFormsModule, FormsModule, CommonModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO
  countries: any;
  showPassword: boolean = false; // Initially, password is hidden
  loading: boolean = false
  ngOnInit(): void {
    this.countries = Country.getAllCountries()
  };

  signupForm: FormGroup;


  constructor(private fb: FormBuilder, private apiservice: ApiService, private message: NzMessageService, private router: Router) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: [null, [Validators.required]],
      location: ['', Validators.required],
      currency: [{ value: 'Indian Rupees', disabled: true }],
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

    const phoneData = this.signupForm.value.phone;
    const formattedPhoneNumber = phoneData.dialCode + phoneData.number;
    const payload = {
      email: this.signupForm.value.email,
      name: this.signupForm.value.name,
      phoneNumber: +(formattedPhoneNumber),
      location: this.signupForm.value.location,
      currency: 'INR',  // Since it is disabled, sending manually
      password: this.signupForm.value.password
    };
    this.apiservice.postAPI(`api/user/signUp`, payload)
      .subscribe({
        next: (res: any) => {
          if (res.success == true) {
            this.message.success(res.message);
            this.router.navigate(['/login']);
          } else {
            // this.loading = false
          }
        },
        error: err => {
          this.loading = false
          this.message.error(err.error.message);
        }
      });


  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword; // Toggle password visibility
  }
}
