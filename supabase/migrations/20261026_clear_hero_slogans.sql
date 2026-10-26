-- Update original starter copy only. Preserve text customised by an administrator.
update public.site_content
set content=jsonb_set(content,'{hero_title}',to_jsonb('Websites and web apps for Malaysian small businesses.'::text)),updated_at=now()
where id=1 and coalesce(content->>'hero_title','') in ('','Digital, made more human.');
update public.site_content
set content=jsonb_set(content,'{hero_description}',to_jsonb('Work directly with the developers—from your first idea to launch and ongoing support.'::text)),updated_at=now()
where id=1 and coalesce(content->>'hero_description','') in ('','We build thoughtful websites and digital tools that help ambitious small businesses move forward.');
update public.site_content
set content=content||jsonb_build_object('hero_slogan_2','Get a clear scope and a tailored quote before development begins.'),updated_at=now()
where id=1 and not (content ? 'hero_slogan_2');
update public.site_content
set content=content||jsonb_build_object('hero_slogan_3','Build a website your customers can use easily on phones, tablets and desktops.'),updated_at=now()
where id=1 and not (content ? 'hero_slogan_3');
