import { CONFIG } from "@/config/environment";
import { httpClient } from "@/services/httpClient";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await httpClient.post<LoginResponse>(CONFIG.api.endpoints.authLogin, payload);
  return response.data;
};

export const refreshToken = async (payload: RefreshRequest): Promise<LoginResponse> => {
  const response = await httpClient.post<LoginResponse>(CONFIG.api.endpoints.authRefresh, payload);
  return response.data;
};
