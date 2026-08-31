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
}

export interface AuthSession {
  token: string
  expiracao: Instant
}
