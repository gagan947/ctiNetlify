export interface SubscriptionResponse {
  success: boolean;
  allowProjectCreate: boolean;
  message: string;
  planType: string;           
  planName: string;
  projectCount: number;
  projectLimit: number;
  template_limit: number;
  subscription: SubscriptionData | null;
  activePaymentMethod: paymentMethod | null;
  billingInterval: string;
  pricingPlan: string;
  next_charge_date : string;

}


export interface SubscriptionData {
  id: number;
  user_id: number;
  subscription_id: string;
  plan_key: string;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED';
  start_date: string;
  next_charge_date: string;
  project_limit: number;
  created_at: string;
  updated_at: string;
}
export interface paymentMethod {
type : string;
card : string;
bank : string;
card_number: string;
country: string;

}
