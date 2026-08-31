import { apiRequest } from '../../../shared/api/apiClient'
import type {
  CadastroRequest,
  CadastroResponse,
  LoginRequest,
  LoginResponse,
} from '../types/auth'

export function cadastrarUsuario(data: CadastroRequest) {
  return apiRequest<CadastroResponse>('/usuarios', { method: 'POST', body: data })
}

export function login(data: LoginRequest) {
  return apiRequest<LoginResponse>('/autenticacao/login', {
    method: 'POST',
    body: data,
  })
}
