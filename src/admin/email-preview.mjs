import {renderMarketing} from '../../supabase/functions/_shared/marketing.mjs';
export function emailPreviewHtml(content){
 // Keep the preview sandbox restricted. Links belong in the real test email;
 // disabling navigation here avoids mailto/tel launches and scanner opt-outs.
 return renderMarketing(content,{}).html
  .replace(/<a\b([^>]*?)\bhref="[^"]*"([^>]*?)>/g,'<a$1$2 aria-disabled="true" tabindex="-1">')
  .replace('<head>','<head><style>html{scrollbar-width:none}::-webkit-scrollbar{display:none}a{cursor:default}</style>');
}
