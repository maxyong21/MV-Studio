import {optionsFor} from './flow.mjs';
import {retrieve,redact} from './retrieval.mjs';
import {embedTexts,chooseSources} from './providers.mjs';

const unsafe=/ignore\s+(all\s+|previous\s+)?instructions|system\s*prompt|service.role|api[ _-]?key|reveal.*secret|drop\s+table/i;
const planning=/\b(i want|i need|looking for|build|create|develop|bakery|web ?site|online system)\b|我想|我需要|想做|saya (nak|mahu|perlu)/i;
const pricing=/how much|\b(price|cost|discount|quotation|quote|cheaper|free hosting)\b|多少钱|多少錢|报价|harga|berapa/i;
export async function answerQuestion(message,release,chunks,deps){
  const text=redact(message).slice(0,2000),snapshot=release.snapshot,goals=optionsFor(snapshot,snapshot.questions.find(q=>q.kind==='goals')?.key);
  const base={sources:[],suggested_options:[],mode:'extractive',degraded:false};
  if(unsafe.test(text))return {...base,action:'handoff',answer:'I can help with published services and project planning. Our team handles private information and any exceptional quotation requests.'};
  if(pricing.test(text))return {...base,action:'clarify',answer:'I can prepare an itemized preliminary estimate from the current feature catalogue. Please confirm your scope in the guided cards; custom work requires our team’s review.'};
  let embedding=null,degraded=false;
  if(snapshot.settings.retrieval_mode==='hybrid')try{embedding=(await embedTexts([text],{...deps,config:snapshot.providers,query:true}))[0];}catch{degraded=true;}
  let matches=retrieve(text,chunks,embedding),suggested=goals.filter(g=>(g.keywords||[]).some(word=>text.toLowerCase().includes(word.toLowerCase()))).map(v=>v.value).slice(0,4);
  let mode=embedding?'hybrid':'extractive';
  if(snapshot.settings.answer_mode==='groq')try{
    const selected=await chooseSources(text,matches,goals,{...deps,config:snapshot.providers});
    matches=matches.filter(v=>selected.source_ids.includes(v.source_id));suggested=selected.suggested_options;mode+=' + groq';
  }catch{degraded=true;}
  if(planning.test(text)||suggested.length)return {...base,action:'guide',answer:'Let’s clarify your scope. Choose the goals below, then we can narrow down the features and prepare a preliminary estimate.',suggested_options:suggested,mode,degraded};
  if(!matches.length)return {...base,action:'handoff',answer:snapshot.settings.handoff_message,mode,degraded};
  const sources=matches.slice(0,2).map(v=>({id:v.source_id,title:v.title,excerpt:v.content}));
  return {...base,action:'answer',answer:sources.map(v=>v.excerpt).join('\n\n'),sources,mode,degraded};
}
