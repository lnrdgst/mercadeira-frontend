import { expect, test } from 'vitest'
import { formatarDataContextual } from '../src/shared/formatarDataContextual'

const agora = new Date(2026, 9, 16, 0, 10)

test('usa Hoje e Ontem pelo dia calendário local, preservando a data completa', () => {
  expect(formatarDataContextual(new Date(2026, 9, 16, 0, 5), { agora })).toBe('Hoje, 16/10/2026')
  expect(formatarDataContextual(new Date(2026, 9, 15, 23, 50), { agora })).toBe('Ontem, 15/10/2026')
})

test('usa dia da semana capitalizado para anteontem, datas antigas e viradas de mês/ano', () => {
  expect(formatarDataContextual(new Date(2026, 9, 14), { agora })).toBe('Quarta-feira, 14/10/2026')
  expect(formatarDataContextual(new Date(2026, 8, 2), { agora })).toBe('Quarta-feira, 02/09/2026')
  expect(formatarDataContextual(new Date(2025, 11, 31), { agora })).toBe('Quarta-feira, 31/12/2025')
})

test('formata sábado, domingo e a hora quando solicitada', () => {
  expect(formatarDataContextual(new Date(2026, 9, 10), { agora })).toBe('Sábado, 10/10/2026')
  expect(formatarDataContextual(new Date(2026, 9, 11), { agora })).toBe('Domingo, 11/10/2026')
  expect(formatarDataContextual(new Date(2026, 9, 16, 14, 35), { agora, incluirHora: true })).toBe('Hoje, 16/10/2026 às 14:35')
})
