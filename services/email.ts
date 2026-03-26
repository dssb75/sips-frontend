import { CONFIG } from "@/config/environment";
import { httpClient } from "@/services/httpClient";

export interface SendEmailRequest {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResponse {
  message: string;
}

export const sendEmail = async (
  payload: SendEmailRequest,
  accessToken: string,
): Promise<SendEmailResponse> => {
  const response = await httpClient.post<SendEmailResponse>(
    CONFIG.api.endpoints.emailSend,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
};
