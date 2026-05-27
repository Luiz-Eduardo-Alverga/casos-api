import axios, { AxiosError } from 'axios';
import { SoftFlowApiResponse } from '../types/production-analysis.js';

interface SoftFlowLoginResponse {
  success: boolean;
  authorization: {
    token: string;
    type: string;
  };
}

interface SoftFlowRefreshResponse {
  success: boolean;
  authorization: {
    token: string;
    type: string;
  };
}

/**
 * Cliente HTTP singleton para a API SoftFlow.
 * Gerencia autenticação dinamicamente: faz login na primeira chamada,
 * tenta refresh em 401 e, se falhar, realiza novo login.
 */
class SoftFlowClient {
  private token: string | null = null;

  private getBaseUrl(): string {
    const url = process.env.SOFTFLOW_API_URL;
    if (!url) {
      throw new Error('Variável de ambiente SOFTFLOW_API_URL não configurada.');
    }
    return url;
  }

  private getCredentials(): { email: string; senha: string } {
    const email = process.env.SOFTFLOW_LOGIN_EMAIL;
    const senha = process.env.SOFTFLOW_LOGIN_SENHA;
    if (!email || !senha) {
      throw new Error(
        'Variáveis de ambiente SOFTFLOW_LOGIN_EMAIL e SOFTFLOW_LOGIN_SENHA não configuradas.',
      );
    }
    return { email, senha };
  }

  /**
   * Realiza login e armazena o token em memória.
   */
  private async login(): Promise<void> {
    const { email, senha } = this.getCredentials();
    const baseUrl = this.getBaseUrl();

    const response = await axios.post<SoftFlowLoginResponse>(
      `${baseUrl}/api/auth/login`,
      { usuario: email, senha },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    );

    if (!response.data?.success || !response.data?.authorization?.token) {
      throw new Error('Falha no login da API SoftFlow: resposta inválida.');
    }

    this.token = response.data.authorization.token;
  }

  /**
   * Renova o token usando o endpoint de refresh.
   * Retorna true se o refresh foi bem-sucedido, false caso contrário.
   */
  private async refresh(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const baseUrl = this.getBaseUrl();

      const response = await axios.post<SoftFlowRefreshResponse>(
        `${baseUrl}/api/auth/refresh`,
        {},
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          timeout: 15000,
        },
      );

      if (!response.data?.success || !response.data?.authorization?.token) {
        return false;
      }

      this.token = response.data.authorization.token;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executa um GET autenticado na API SoftFlow.
   * Em caso de 401, tenta refresh → re-login → lança erro.
   */
  async get<T = SoftFlowApiResponse>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    if (!this.token) {
      await this.login();
    }

    try {
      const response = await axios.get<T>(`${this.getBaseUrl()}${path}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        params,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status !== 401) {
        throw error;
      }

      // Token expirado — tenta refresh
      const refreshed = await this.refresh();

      if (refreshed) {
        const retryResponse = await axios.get<T>(`${this.getBaseUrl()}${path}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          params,
          timeout: 30000,
        });
        return retryResponse.data;
      }

      // Refresh falhou — tenta novo login
      await this.login();

      const retryResponse = await axios.get<T>(`${this.getBaseUrl()}${path}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        params,
        timeout: 30000,
      });

      return retryResponse.data;
    }
  }
}

export const softFlowClient = new SoftFlowClient();
