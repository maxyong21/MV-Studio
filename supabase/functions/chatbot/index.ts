import {createClient} from 'npm:@supabase/supabase-js@2';
import {createChatbotHandler} from '../_shared/chatbot/handler.mjs';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(createChatbotHandler({env,createAdmin:()=>createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})}));
