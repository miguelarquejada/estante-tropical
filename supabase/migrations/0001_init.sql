-- Estante Tropical: esquema inicial.
-- Todos os timestamps são epoch em milissegundos (bigint), gerados no cliente
-- para permitir criação offline e resolução last-write-wins por updated_at.

create table if not exists public.books (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  author text not null default '',
  cover_url text,
  isbn text,
  google_books_id text,
  total_pages integer check (total_pages is null or total_pages > 0),
  status text not null check (status in ('want', 'reading', 'read')),
  current_page integer,
  progress_pct integer check (progress_pct is null or progress_pct between 0 and 100),
  started_at bigint,
  finished_at bigint,
  rating smallint check (rating is null or rating between 1 and 5),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table if not exists public.reading_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  mode text not null check (mode in ('free', 'pomodoro')),
  status text not null check (status in ('running', 'paused', 'finished', 'discarded')),
  segments jsonb not null default '[]'::jsonb,
  focus_ms bigint not null,
  break_ms bigint not null,
  phase text not null check (phase in ('focus', 'break')),
  phase_started_at bigint not null,
  phase_elapsed_ms bigint not null default 0,
  ended_at bigint,
  duration_ms bigint not null default 0,
  page_at_end integer,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create index if not exists books_user_updated_idx on public.books (user_id, updated_at);
create index if not exists sessions_user_updated_idx on public.reading_sessions (user_id, updated_at);
create index if not exists sessions_book_idx on public.reading_sessions (book_id);

alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;

create policy "books: dono lê" on public.books for select using (user_id = auth.uid());
create policy "books: dono insere" on public.books for insert with check (user_id = auth.uid());
create policy "books: dono atualiza" on public.books for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sessions: dono lê" on public.reading_sessions for select using (user_id = auth.uid());
create policy "sessions: dono insere" on public.reading_sessions for insert with check (user_id = auth.uid());
create policy "sessions: dono atualiza" on public.reading_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Capas enviadas manualmente: leitura pública, escrita apenas na pasta do próprio usuário.
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;

create policy "covers: leitura pública" on storage.objects for select using (bucket_id = 'covers');
create policy "covers: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers: dono atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
