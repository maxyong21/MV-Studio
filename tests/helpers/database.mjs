import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export async function database(){
  const db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
  `);
  const schema=(await readFile('supabase/schema.sql','utf8')).replace('create extension if not exists pgcrypto;','');
  // gen_random_uuid is built into this PostgreSQL runtime; hosted Supabase has pgcrypto.
  await db.exec(schema);
  return db;
}

// Exercise the handler against PostgreSQL, with a small PostgREST client adapter.
export function client(db,user=null,adminToken='admin-token'){
  const identifier=value=>{if(!/^[a-z_]+$/.test(value))throw new Error('Invalid SQL identifier');return `"${value}"`;};
  return {
    auth:{getUser:async token=>({data:{user:token===adminToken?{id:user}:token==='user-token'?{id:'11111111-1111-4111-8111-111111111111'}:null},error:null})},
    rpc:async(name,p)=>{try{const entries=Object.entries(p),params=entries.map(([,v])=>v!==null&&typeof v==='object'?JSON.stringify(v):v);return {data:(await db.query(`select public.${identifier(name)}(${entries.map(([key],i)=>`${identifier(key)} => $${i+1}`).join(',')}) as result`,params)).rows[0].result,error:null};}catch(error){return {data:null,error};}},
    from(table){
      let op='select',payload=null,columns='*',ordering='',maximum='';const filters=[];
      const q={select(value='*'){columns=value;return q;},insert(value){op='insert';payload=value;return q;},update(value){op='update';payload=value;return q;},delete(){op='delete';return q;},order(key,{ascending=true}={}){ordering=` order by ${identifier(key)} ${ascending?'asc':'desc'}`;return q;},limit(number){maximum=` limit ${Number(number)}`;return q;},eq(key,value){filters.push([key,'=',value]);return q;},lt(key,value){filters.push([key,'<',value]);return q;},in(key,value){filters.push([key,'in',value]);return q;},single(){return run(true);},maybeSingle(){return run(true);},then(resolve,reject){return run(false).then(resolve,reject);}};
      async function run(single){
        const values=[];const param=value=>{values.push(value!==null&&typeof value==='object'?JSON.stringify(value):value);return `$${values.length}`;};
        const arrayFields=new Set(['keywords','values','catalog_categories','expected_terms','forbidden_terms','selected_feature_ids']);
        const columnParam=(key,value)=>arrayFields.has(key)&&Array.isArray(value)?`array[${value.map(param).join(',')}]::${key==='selected_feature_ids'?'uuid':'text'}[]`:param(value);
        const selected=columns==='*'?'*':columns.split(',').map(identifier).join(',');
        let sql;
        const where=()=>filters.length?' where '+filters.map(([key,operator,value])=>operator==='in'?`${identifier(key)} in (${value.map(param).join(',')})`:`${identifier(key)}${operator}${param(value)}`).join(' and '):'';
        if(op==='insert')sql=`insert into public.${identifier(table)} (${Object.keys(payload).map(identifier).join(',')}) values (${Object.entries(payload).map(([key,value])=>columnParam(key,value)).join(',')}) returning ${selected}`;
        else if(op==='update')sql=`update public.${identifier(table)} set ${Object.entries(payload).map(([key,value])=>`${identifier(key)}=${columnParam(key,value)}`).join(',')}${where()} returning ${selected}`;
        else if(op==='delete')sql=`delete from public.${identifier(table)}${where()} returning ${selected}`;
        else sql=`select ${selected} from public.${identifier(table)}${where()}${ordering}${maximum}`;
        try{const result=await db.query(sql,values);return {data:single?result.rows[0]||null:result.rows,error:null};}catch(error){return {data:null,error};}
      }
      return q;
    },
  };
}
