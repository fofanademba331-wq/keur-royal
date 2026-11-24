-- À coller dans Supabase : SQL Editor > New query > Run

-- Biens : lecture réservée aux membres connectés, aucune écriture depuis le site (vous les ajoutez dans Table Editor).
create table public.biens (
  id bigint generated always as identity primary key,
  titre text not null check (char_length(titre) <= 120),
  ville text not null,
  type text not null check (type in ('Villa','Appartement','Terrain','Local commercial')),
  prix bigint not null check (prix > 0),
  surface int, chambres int,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.biens enable row level security;
create policy "lecture membres" on public.biens for select to authenticated using (disponible = true);

-- Profils : chaque utilisateur ne voit et ne modifie que le sien.
create table public.profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text check (char_length(nom) <= 80),
  telephone text check (char_length(telephone) <= 20),
  created_at timestamptz not null default now()
);
alter table public.profils enable row level security;
create policy "lire son profil" on public.profils for select using (auth.uid() = id);
create policy "modifier son profil" on public.profils for update using (auth.uid() = id) with check (auth.uid() = id);

-- Création automatique du profil à l'inscription.
create function public.creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, nom, telephone)
  values (new.id, left(new.raw_user_meta_data->>'nom', 80), left(new.raw_user_meta_data->>'telephone', 20));
  return new;
end; $$;
create trigger apres_inscription after insert on auth.users
for each row execute function public.creer_profil();

-- Exemples de biens (à remplacer par les vôtres).
insert into public.biens (titre, ville, type, prix, surface, chambres) values
('Villa moderne avec jardin','Keur Massar','Villa',65000000,300,4),
('Appartement lumineux','Dakar','Appartement',38000000,95,3),
('Terrain viabilisé','Keur Massar','Terrain',12000000,200,null);
