export interface SubscriptionResponse {
  success: boolean;
  access?: boolean;
  allowProjectCreate: boolean;
  availableCredits?: number;
  creditBalance?: number;
  creditsPerCycle?: number;
  creditGrantInterval?: string;
  limitsEnforced?: boolean;
  message: string;
  planType: string;
  planName: string;
  projectCount: number;
  projectLimit: number;
  variationLimit?: number;
  canDeploy?: number;
  supportType?: string;
  githubIntegration?: number;
  customFeatures?: number;
  canDelete?: number;
  paymentStatus?: string;
  template_limit: number;
  freeCredits?: CreditBucket;
  planCredits?: CreditBucket;
  topupCredits?: CreditBucket;
  topupAllowed?: number;
  subscription: SubscriptionData | null;
  activePaymentMethod: paymentMethod | null;
  billingInterval: string;
  pricingPlan: string;
  discountPercent?: number;
  isIntro?: number;
  next_charge_date: string;
  start_date: string;
  subscriptionStatus: string;
}

export interface CreditBucket {
  left: number;
  total: number;
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
  type: string;
  card?: string;
  bank?: string;
  card_number?: string;
  country?: string;
  network?: string;
  upi_id?: string;
}
