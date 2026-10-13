-- Jalankan seluruh SQL ini di Supabase > SQL Editor.
-- 1) Tabel film
create table if not exists public.films (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year text,
  genre text,
  poster_url text,
  video_url text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- 2) Aktifkan RLS
alter table public.films enable row level security;

-- Semua orang boleh melihat film.
create policy "Public can view films"
on public.films for select
to anon, authenticated
using (true);

-- Hanya user yang email-nya tercantum sebagai admin boleh insert/delete.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;

create policy "Admins can read own admin row"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can insert films"
on public.films for insert
to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "Admins can delete films"
on public.films for delete
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- 3) Storage bucket video publik.
insert into storage.buckets (id, name, public)
values ('videos','videos',true)
on conflict (id) do update set public = true;

-- Hanya admin boleh upload.
create policy "Admins can upload videos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'videos'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "Admins can delete videos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'videos'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

-- Setelah membuat akun admin di Authentication > Users,
-- jalankan:
-- insert into public.admin_users (user_id) values ('UUID_USER_ADMIN');


-- Poster film: bucket publik agar gambar bisa tampil di website
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do update set public = true;

create policy "Admins can upload posters"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'posters'
  and exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);

create policy "Admins can delete posters"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'posters'
  and exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);
