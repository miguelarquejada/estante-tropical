import { describe, expect, it } from 'vitest'
import { buildQuery, mapVolume } from './googleBooks'

describe('buildQuery', () => {
  it('detecta ISBN-13 e ISBN-10 ignorando hífens', () => {
    expect(buildQuery('978-85-359-0277-5')).toBe('isbn:9788535902775')
    expect(buildQuery('85-359-0277-5')).toBe('isbn:8535902775')
    expect(buildQuery('080442957X')).toBe('isbn:080442957X')
  })
  it('mantém busca livre por título/autor', () => {
    expect(buildQuery('  dom casmurro machado ')).toBe('dom casmurro machado')
  })
})

describe('mapVolume', () => {
  it('normaliza capa para https e escolhe ISBN-13', () => {
    const r = mapVolume({
      id: 'abc',
      volumeInfo: {
        title: 'Dom Casmurro',
        authors: ['Machado de Assis'],
        pageCount: 256,
        imageLinks: { thumbnail: 'http://books.google.com/x?id=1&edge=curl' },
        industryIdentifiers: [{ type: 'ISBN_10', identifier: '1' }, { type: 'ISBN_13', identifier: '2' }],
      },
    })
    expect(r.coverUrl).toBe('https://books.google.com/x?id=1')
    expect(r.isbn).toBe('2')
    expect(r.totalPages).toBe(256)
  })
})
