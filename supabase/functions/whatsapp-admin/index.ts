import {createClient} from 'npm:@supabase/supabase-js@2';
import {createWhatsAppAdmin} from '../_shared/whatsapp/handlers.mjs';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(createWhatsAppAdmin({env,createAdmin:()=>createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})}));
