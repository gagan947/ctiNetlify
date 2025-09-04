export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  country_code: string | null;
  phoneNumber: string | null;
  location: string | null;
  currency: string | null;
  auth_provider: string | null;
  genToken: string | null;
  otp: string | null;
  verified: number; // 0 or 1
  gst_number: string | null;
  vat_number: string | null;
  tan_number: string | null;
  profile_image: string | null;
  is_email_verified: number;
  is_phone_verified: number;
  companyName: string | null;
  profile_visited: number; // 0 or 1
  status: number;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T[];
}