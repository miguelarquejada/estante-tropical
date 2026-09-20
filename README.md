# Estante Tropical

PWA mobile-first, em pt-BR, para organizar leituras pelo **tempo investido em cada livro**.
React + Vite + TypeScript + Tailwind v4, Dexie (IndexedDB), Supabase (auth + Postgres + Storage), Framer Motion.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes de domínio, busca e sincronização
npm run build && npm run preview   # build de produção com Service Worker (http://localhost:4173)
```

Sem `.env`, o app roda em **modo local**: tudo funciona (estantes, sessões, offline), mas os dados ficam só neste aparelho e não há login.

## Ativando contas e sincronização (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute `supabase/migrations/0001_init.sql` (tabelas, RLS por usuário e bucket `covers`).
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Settings → API).
4. Em **Authentication → URL Configuration**, adicione a URL do app (local e produção) em *Site URL* / *Redirect URLs*.
5. Opcional, login com Google: **Authentication → Providers → Google** com o Client ID/Secret do Google Cloud.
6. Para cadastro sem confirmação por e-mail (testes), desative *Confirm email* em Authentication → Providers → Email.

## Busca no Google Books

A busca funciona sem chave, mas a cota anônima é compartilhada e costuma esgotar (o app avisa e oferece o cadastro manual).
Crie uma chave gratuita no Google Cloud (API "Books API") e defina `GOOGLE_BOOKS_KEY` (sem prefixo `VITE_`) no `.env` e, em produção, como variável de ambiente na Vercel. A chave fica só no servidor: o navegador chama `/api/books` (`api/books.ts`), que repassa a busca ao Google.

## Como funciona

- **Tempo por timestamps.** Uma sessão guarda segmentos `{start, end}` de tempo de foco. O tempo é sempre calculado como soma dos segmentos contra `Date.now()`; nenhum `setInterval` acumula nada. Fechar o app ou apagar a tela não perde a contagem (`src/domain/session.ts`).
- **Pomodoro.** Pausas nunca geram segmentos, então não entram no total do livro. Se o app ficou fechado, o fim do foco é registrado no instante exato em que ele terminou. Terminada a pausa, a sessão espera o usuário iniciar o próximo foco, para que horas esquecidas não virem tempo de leitura.
- **Local-first.** A UI lê e escreve sempre no IndexedDB. Cada mutação entra numa fila (`outbox`) enviada ao Supabase ao logar, ao reconectar, ao voltar ao app e após alterações. Conflitos: última escrita vence (`updated_at`). Capas enviadas manualmente sobem para o Storage na sincronização.
- **Offline.** O Service Worker faz precache do app, cache das capas e das fontes, e cache com rede-primeiro da busca.

## Limitações conhecidas

- Avisos de fim de foco/pausa com o app **fechado** exigem Web Push (servidor). Hoje o tempo continua correto e o aviso (vibração + notificação) ocorre enquanto o app está vivo ou ao reabri-lo.
- Dois aparelhos editando o mesmo registro offline resolvem por relógio do cliente (last-write-wins).
- A integração com o Supabase real depende das suas credenciais; os testes usam um cliente simulado.

## Deploy

Qualquer hospedagem estática com HTTPS (Vercel, Netlify, Cloudflare Pages): build `npm run build`, pasta `dist`, com fallback de SPA para `index.html`. Defina as variáveis `VITE_*` no painel da hospedagem.

## Ícones

`public/logo.svg` é a fonte. Para regenerar os PNGs: `npm run generate-icons`.
