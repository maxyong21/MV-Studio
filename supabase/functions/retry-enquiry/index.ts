import {createClient} from 'npm:@supabase/supabase-js@2';
import {createRetryHandler} from '../_shared/retry-handler.mjs';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(createRetryHandler({env,createAdmin:()=>createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})}));
