export interface UserInfo {
  auth_id: string;
  name?: string;
  email?: string;
  company_id?: string;
  industry?: string;
  age?: string;
}

export interface LoginResponse {
  access_token?: string;
  name?: string;
  email?: string;
  company_id?: string;
  industry?: string;
  age?: string;
}

export interface SignupPayload {
  company_id?: string | null;
  industry?: string | null;
  email?: string | null;
  name?: string | null;
  age?: string | null;
  auth_id: string;
  auth_pw: string;
}
