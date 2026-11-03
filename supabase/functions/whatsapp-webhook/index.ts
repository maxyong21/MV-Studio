import {createClient} from 'npm:@supabase/supabase-js@2';
import {createWebhook} from '../_shared/whatsapp/handlers.mjs';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(createWebhook({env,createAdmin:()=>createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}),background:(promise:Promise<unknown>)=>EdgeRuntime.waitUntil(promise.catch(error=>console.error('WhatsApp background processing failed',error.code||error.name)))}));
