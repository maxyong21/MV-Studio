-- Anyone could list the file names in the public image folder (site-media), including images of
-- projects that are not published yet. Public file addresses keep working: a public bucket serves its
-- files by address without any policy, so the website's images are not affected. Only LISTING is
-- limited, to administrators (the admin media picker lists files as a signed-in administrator).
-- Safe to run more than once. Run it in the Supabase SQL Editor, then check an image on the website.
drop policy if exists "Public can view site media" on storage.objects;
drop policy if exists "Admins view site media" on storage.objects;
create policy "Admins view site media" on storage.objects
for select to authenticated using (bucket_id = 'site-media' and (select public.is_admin()));
