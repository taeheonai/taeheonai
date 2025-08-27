export interface UserInfo {
  auth_id: string;
  name?: string;
  email?: string;
  corporation_id?: number | null;
  industry?: string;
  birth?: string | null;
}

export interface LoginResponse {
  access_token?: string;
  name?: string;
  email?: string;
  corporation_id?: number | null;
  industry?: string;
  birth?: string | null;
}

export interface SignupPayload {
  companyname: string;        // ✅ company_name → companyname (백엔드와 일치)
  corporation_id?: number | null;
  industry?: string | null;
  email?: string | null;
  name?: string | null;
  birth?: string | null;
  auth_id: string;
  auth_pw: string;
}
