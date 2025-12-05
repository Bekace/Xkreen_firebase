-- Create profiles for existing auth users who don't have profiles yet
insert into public.profiles (id, email, full_name)
select 
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.email) as full_name
from auth.users au
left join public.profiles p on au.id = p.id
where p.id is null
on conflict (id) do nothing;
