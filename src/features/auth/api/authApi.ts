import { apiRequest } from '../../../shared/api/apiClient'
import type {
  CadastroRequest,
  CadastroResponse,
  LoginRequest,
  LoginResponse,
  GoogleLoginResponse,
} from '../types/auth'

export function cadastrarUsuario(data: CadastroRequest) {
  return apiRequest<CadastroResponse>('/usuarios', { method: 'POST', body: data })
}

export function loginComGoogle(credential: string) {
  return apiRequest<GoogleLoginResponse>('/autenticacao/google', {
    method: 'POST', body: { credential },
  })
}

export function vincularGoogle(credential: string, senhaAtual: string) {
  return apiRequest<GoogleLoginResponse>('/autenticacao/google/vincular', {
    method: 'POST', body: { credential, senhaAtual },
  })
}

export function login(data: LoginRequest) {
  return apiRequest<LoginResponse>('/autenticacao/login', {
    method: 'POST',
    body: data,
  })
}

export function refresh(refreshToken: string) {
  return apiRequest<LoginResponse>('/autenticacao/refresh', {
    method: 'POST', body: { refreshToken },
  })
}

export function logout(refreshToken: string) {
  return apiRequest<void>('/autenticacao/logout', {
    method: 'POST', body: { refreshToken },
  })
}
