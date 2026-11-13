import {createClient} from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@10.3.1';
import {createReportHandler} from '../_shared/report-handler.mjs';
import {createGmailSendMail} from '../_shared/notify.mjs';
const env=(name:string)=>Deno.env.get(name);
const sendMail=createGmailSendMail(nodemailer,env);
Deno.serve(createReportHandler({env,sendMail,createAdmin:()=>createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})}));
