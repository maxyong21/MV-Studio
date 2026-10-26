-- Dedicated WhatsApp destination; ordinary call numbers remain unchanged.
update public.site_content
set content=content||jsonb_build_object('whatsapp_number','011-5403 9173'),updated_at=now()
where id=1 and content->>'whatsapp_number' is distinct from '011-5403 9173';
update public.site_content
set content=jsonb_set(content,'{hero_cta}',to_jsonb('Discuss your project'::text)),updated_at=now()
where id=1 and coalesce(content->>'hero_cta','') in ('','Tell us what you’re building');
