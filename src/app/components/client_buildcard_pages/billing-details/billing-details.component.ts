import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Feature } from '../../../models/projects';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { Country } from 'country-state-city'
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { MobileViewComponent } from "../main/mobile-view/mobile-view.component";
import { ExchangeRatePipe } from '../../../helper/exchange-rate.pipe';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-billing-details',
  standalone: true,
  imports: [NgxIntlTelInputModule, CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SidebarComponent, MobileViewComponent, ExchangeRatePipe],
  templateUrl: './billing-details.component.html',
  styleUrl: './billing-details.component.css'
})
export class BillingDetailsComponent {
  projectsFeatures: Feature[] = [];
  projectsData: any;
  totalSubFeatures: any;
  countries: any;
  states: any;
  cities: any;
  billingForm!: FormGroup;
  countryCode: string = '';
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO
  billingDetails: any;
  countryName: string = '';
  rate: any
  private modal = inject(ModalService);
  constructor(private fb: FormBuilder, private apiService: ApiService, private message: NzMessageService, private router: Router) {
    effect(() => {
      this.rate = this.apiService._rate()
    })
    let userData = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
    if (this.projectsData.projectLogo) {
      this.apiService._imagePreview.set(this.projectsData.projectLogo);
    }
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.billingDetails = this.projectsData.bellingDetails ? this.projectsData.bellingDetails[0] : userData;
    this.totalSubFeatures = this.projectsData.no_of_features
  };

  ngOnInit(): void {
    this.countries = Country.getAllCountries();
    this.billingForm = this.fb.group({
      customer_type: [this.billingDetails.customer_type || 'individual', Validators.required],
      company_name: [this.billingDetails.company_name || this.billingDetails.companyName || ''],
      email: [this.billingDetails.email || '', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      company_location: [this.billingDetails.company_location || '', Validators.required],
      address_line_1: [this.billingDetails.address_line_1 || '', Validators.required],
      address_line_2: [this.billingDetails.address_line_2 || ''],
      city: [this.billingDetails.city || '', Validators.required],
      state: [this.billingDetails.state || ''],
      postal_code: [this.billingDetails.postal_code || '', [Validators.required, Validators.pattern(/^\d{5,6}$/)]],
      full_name: [this.billingDetails.full_name || this.billingDetails.name || '', Validators.required],
    });

    this.billingForm.patchValue({
      phoneNumber: {
        number: this.billingDetails.phoneNumber,
        internationalNumber: `${this.billingDetails.country_code} ${this.billingDetails.phoneNumber}`,
        nationalNumber: this.billingDetails.phoneNumber,
        e164Number: `${this.billingDetails.country_code}${this.billingDetails.phoneNumber}`,
        dialCode: this.billingDetails.country_code,
        countryCode: this.billingDetails.country_code.replace('+', '') // optional mapping
      }
    })

    this.billingForm.get('customer_type')?.valueChanges.subscribe(value => {
      if (value === 'company') {
        this.billingForm.get('company_name')?.setValidators([Validators.required]);
        this.billingForm.get('company_name')?.updateValueAndValidity();
      } else {
        this.billingForm.get('company_name')?.clearValidators();
        this.billingForm.get('company_name')?.updateValueAndValidity();
      }
    })
  };


  onSubmit() {
    this.billingForm.markAllAsTouched()
    if (this.billingForm.invalid) {
      return;
    }

    let country_code = {
      country_code: this.billingForm.value.phoneNumber.dialCode
    }
    let data = { ...this.billingForm.value, ...country_code };
    data.phoneNumber = data.phoneNumber.number;

    let formData = {
      formNumber: 6,
      currentRoutes: this.router.url,
      bankInfo: [
        data
      ]
    }

    this.apiService.postAPI(`api/user/addClientInquries?inquiryId=${this.projectsData.clientEnquryId}`, formData).subscribe({
      next: (res: any) => {
        if (res.success == true) {
          // this.message.success(res.message);
          this.router.navigate(['/payment-plan']);
        }
      },
      error: err => {
        console.error('Error:', err);
        this.message.error(err.error.message);
      }
    })
  }

  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }
}
