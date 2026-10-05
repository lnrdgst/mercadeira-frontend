export type UUID = string
export type Instant = string

export interface CadastroRequest {
  nome: string
  email: string
  senha: string
}

export interface CadastroResponse {
  id: UUID
  nome: string
  email: string
}

export interface LoginRequest {
  email: string
  senha: string
}

export interface LoginResponse {
  token: string
  expiracao: Instant
  refreshToken: string
}

export interface GoogleLoginResponse {
  vinculoNecessario: boolean
  token: string | null
  expiracao: Instant | null
  refreshToken: string | null
}

export interface AuthSession {
  token: string
  expiracao: Instant
  refreshToken: string
}
