declare const process: { env: Record<string, string | undefined> }

const ALLOWED_PARAMS = ['q', 'maxResults', 'printType']

export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url).searchParams
  const params = new URLSearchParams()
  for (const name of ALLOWED_PARAMS) {
    const value = incoming.get(name)
    if (value) params.set(name, value)
  }
  if (!params.get('q')) return Response.json({ error: 'q é obrigatório' }, { status: 400 })

  const key = process.env.GOOGLE_BOOKS_KEY
  if (key) params.set('key', key)

  const upstream = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
  if (!upstream.ok) return Response.json({ error: 'Falha na Google Books API' }, { status: upstream.status })
  return new Response(upstream.body, { headers: { 'Content-Type': 'application/json' } })
}
