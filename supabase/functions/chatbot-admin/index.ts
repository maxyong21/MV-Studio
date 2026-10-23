import {createClient} from 'npm:@supabase/supabase-js@2';
import {createChatbotAdminHandler} from '../_shared/chatbot/handler.mjs';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(createChatbotAdminHandler({env,createAdmin:()=>createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})}));
