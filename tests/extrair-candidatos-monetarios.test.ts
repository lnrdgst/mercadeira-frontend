import { expect, test } from 'vitest'
import { extrairCandidatosMonetarios } from '../src/features/shopping/utils/extrairCandidatosMonetarios'
import { normalizarCandidatoMonetario } from '../src/features/shopping/utils/normalizarCandidatoMonetario'
import { combinarCandidatosMonetarios } from '../src/features/shopping/utils/combinarCandidatosMonetarios'

test.each([
  ['R$ 25,90', [25.90]],
  ['3,99', [3.99]],
  ['6,50', [6.50]],
  ['25,90', [25.90]],
  ['R$ 2.092,95', [2092.95]],
  ['1.299,90', [1299.90]],
  ['12.345,67', [12345.67]],
  ['25.90', [25.90]],
  ['25.9O', [25.90]],
  ['R$ 2O,9O', [20.90]],
  ['R$ 17,90 acima de 3 12,50 cada', [17.90, 12.50]],
  ['Clientes Bahamas R$ 13,98 Atacado R$ 14,90 Varejo R$ 15,98', [13.98, 14.90, 15.98]],
  ['acima de 3', []],
  ['produto 10 unidades', []],
  ['PROMOCAO 3 POR 20', []],
  ['9,9', []],
  ['9,90', [9.90]],
  ['0,00', []],
  ['25,900', []],
  ['250 650 399', []],
  ['R$ 25,90 25.90 R$ 25,90', [25.90]],
])('extrai candidatos monetários de %s', (texto, esperado) => {
  expect(extrairCandidatosMonetarios(texto)).toEqual(esperado)
})

test('normaliza O apenas dentro do candidato monetário', () => {
  expect(normalizarCandidatoMonetario('1O,50')).toBe(10.50)
  expect(normalizarCandidatoMonetario('PROMOCAO')).toBeNull()
  expect(normalizarCandidatoMonetario('25,900')).toBeNull()
})

test('combina passagens preservando a ordem e removendo valores repetidos', () => {
  expect(combinarCandidatosMonetarios([[1.39], [1.39, 2.78], [17.9, 12.5]])).toEqual([1.39, 2.78, 17.9, 12.5])
})
