import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input';
type BillingCycle = 'monthly' | 'yearly';
type PlanType = 'personal' | 'creative' | 'booster';
declare var window: any;
@Component({
  selector: 'app-subcription-page',
  standalone: true,
  imports: [FormsModule, CommonModule,ReactiveFormsModule,NgxIntlTelInputModule],
  templateUrl: './subcription-page.component.html',
  styleUrl: './subcription-page.component.css'
})
export class SubcriptionPageComponent {
  @Input() subscriptionModalOpen = false;
  @Output() close = new EventEmitter<void>();
  billingSummaryModalOpen = false;
  billingCycle = signal<BillingCycle>('monthly');
  BASE_PRICES = {
    personal: 49,
    creative: 99,
    booster: 199
  };
  YEARLY_DISCOUNT = 0.2;

  PLAN_PRICES = {
    monthly: {
      personal: 49,
      creative: 99,
      booster: 199
    },
    yearly: {
      personal: 39,
      creative: 89,
      booster: 179
    }
  };


    billingDetails = {
    name: '',
    email: '',
    phoneNumber: ''
  };
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO

 

selectedPlan = signal<PlanType>('creative');
  constructor(private apiService: ApiService,private fb: FormBuilder){

  }
  billingForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [null as any, Validators.required]
  });



setBilling(cycle: BillingCycle) {
  this.billingCycle.set(cycle);
}

planPrices = computed(() => {
  return this.PLAN_PRICES[this.billingCycle()];
});


selectPlan(plan: PlanType) {
  this.selectedPlan.set(plan);
}


getStarted(plan: PlanType){
this.close.emit();
this.selectedPlan.set(plan);
this.subscriptionModalOpen = false;
this.billingSummaryModalOpen = true;
}


selectedSubscriptionCost = computed(() => {
  return this.planPrices()[this.selectedPlan()];
});

displayPrice = computed(() => {
  return this.PLAN_PRICES[this.billingCycle()][this.selectedPlan()];
});

chargeAmount = computed(() => {
  const monthly = this.PLAN_PRICES.yearly[this.selectedPlan()];
  return this.billingCycle() === 'yearly'
    ? monthly * 12
    : this.PLAN_PRICES.monthly[this.selectedPlan()];
});

planKey = computed(() => {
  return `${this.selectedPlan()}_${this.billingCycle()}`;
});


initiateSubscriptionCheckout(billingDetails :any) {
  this.apiService.postAPI('api/payment/create-subscription', {
    planKey: this.planKey(),
    user: billingDetails
  }).subscribe((res: any) => {
    // ⬇️ THIS IS THE KEY
    this.openCashfreeSubscriptionCheckout(res.subscription_session_id);
  });
}

isInvalid(controlName: string) {
  const control = this.billingForm.get(controlName);
  return control?.invalid && control?.touched;
}

confirmAndPay() {
  if (this.billingForm.invalid) {
    this.billingForm.markAllAsTouched();
    return;
  }

  const raw = this.billingForm.getRawValue();

  const billingDetails = {
    name: raw.name,
    email: raw.email,
    phoneNumber: raw.phoneNumber.e164Number, // ✅ USE THIS
    countryCode: raw.phoneNumber.countryCode
  };

  this.initiateSubscriptionCheckout(billingDetails)

 
}


openCashfreeSubscriptionCheckout(subscriptionSessionId: string) {
 
  if (!subscriptionSessionId) {
    console.error("Missing subscription_session_id!");
    return;
  }

  const cashfree = new (window as any).Cashfree({
    mode: "sandbox", // use "production" in live
  });

  cashfree
    .subscriptionsCheckout({
      subsSessionId: subscriptionSessionId, // << correct param
      redirectTarget: "_blank",            // or "_blank"
    })
    .then((result: any) => {
      if (result.error) {
        console.error("Cashfree subscription error:", result.error.message);
        alert(result.error.message);
      } else if (result.redirect) {
        console.log("Redirecting to Cashfree subscription checkout...");
      }
    })
    .catch((err: any) => {
      console.error("Unexpected Cashfree subscription error:", err);
    });
}



closeModal(){
  this.close.emit();
this.subscriptionModalOpen = false;
this.billingSummaryModalOpen = false;
}





}
