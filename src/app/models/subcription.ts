export interface SubscriptionResponse {
  success: boolean;
  allowProjectCreate: boolean;
  message: string;

  planType: string;           // "free" | "personal_monthly" | "creative_yearly" etc
  planName: string;
  projectCount: number;
  projectLimit: number;
  template_limit: number;
  subscription: SubscriptionData | null;
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
