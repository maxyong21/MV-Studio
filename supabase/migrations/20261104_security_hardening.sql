-- Tighten server-side request throttling. Apply after the existing enquiry/chatbot migrations.
begin;
create index if not exists enquiry_rate_limits_window_idx on public.enquiry_rate_limits(window_started_at);
create or replace function public.consume_enquiry_rate_limit(p_key text, p_max integer default 5, p_window_seconds integer default 3600)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_window timestamptz; current_count integer;
begin
  if p_key is null or length(p_key)>128 or p_max is null or p_max<1 or p_max>1000 or p_window_seconds is null or p_window_seconds<1 or p_window_seconds>86400 then
    raise exception 'invalid rate limit parameters' using errcode='22023';
  end if;
  -- Opportunistically expire old hashed IP buckets to bound table growth.
  if (pg_catalog.hashtext(p_key)::bigint & 127)=0 then
    delete from public.enquiry_rate_limits where window_started_at < now()-interval '30 days';
  end if;
  insert into public.enquiry_rate_limits(key_hash,window_started_at,submission_count)
  values (p_key,now(),0) on conflict (key_hash) do nothing;
  select window_started_at,submission_count into current_window,current_count
  from public.enquiry_rate_limits where key_hash=p_key for update;
  if current_window < now() - make_interval(secs => p_window_seconds) then
    update public.enquiry_rate_limits set window_started_at=now(),submission_count=1 where key_hash=p_key;
    return true;
  end if;
  if current_count >= p_max then return false; end if;
  update public.enquiry_rate_limits set submission_count=submission_count+1 where key_hash=p_key;
  return true;
end;
$$;
revoke all on function public.consume_enquiry_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_enquiry_rate_limit(text,integer,integer) to service_role;
commit;
