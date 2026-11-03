import {buildQuote,visibleQuestions,optionsFor,featuresFor,pruneAnswers,validateAnswers,scopeSummary,UNSURE} from '../chatbot/flow.mjs';
import {validateContact,hasPricedSelection} from '../enquiry.mjs';

const button=(id,title)=>({id,title});
const menu=[button('plan','Plan my project'),button('ask','Ask a question'),button('human','Talk to team')];
const controls=[button('back','Back'),button('human','Talk to team'),button('stop','Stop')];
const money=value=>`RM ${Number(value||0).toFixed(2)}`;
const contacts=['name','company_name','phone','email'];
const contactLabels={name:'your name',company_name:'your company / business name',phone:'your contact number (include country code)',email:'your email address'};
export const freshState=()=>({mode:'menu',answers:{},completed:[],contact:{}});
export const quoteFingerprint=quote=>JSON.stringify({lines:quote.lines,billing_period:quote.billing_period,summary:quote.summary});
function choicesFor(q,snapshot,catalogue){return q.kind==='features'?featuresFor(q,catalogue).map(v=>({value:v.id,label:`${v.name} (${v.billing_type==='quote'||v.price===null?'manual quote':money(v.price)+(v.billing_type==='monthly'?'/month':' once')})` })):optionsFor(snapshot,q.key);}
function current(state,snapshot,catalogue){return visibleQuestions(snapshot,state.answers,catalogue).find(q=>!state.completed.includes(q.key));}
function ask(state,snapshot,catalogue){
  state.scope=scopeSummary(snapshot,state.answers,catalogue);
  const q=current(state,snapshot,catalogue);
  if(!q){state.mode='contact';return contactPrompt(state);}
  state.mode='planning';state.question=q.key;
  const choices=choicesFor(q,snapshot,catalogue),page=state.page||0,start=page*15;
  let text=`${q.title}${q.help_text?'\n'+q.help_text:''}`;
  if(choices.length){text+='\n\n'+choices.slice(start,start+15).map((o,i)=>`${start+i+1}. ${o.label.slice(0,140)}`).join('\n');text+=['multi','goals','features'].includes(q.kind)?'\nReply with numbers separated by commas, e.g. 1,3.':'\nReply with one option number.';if(choices.length>15)text+=`\nPage ${page+1}/${Math.ceil(choices.length/15)}. Type MORE / PREV for other choices.`;}
  else if(q.kind==='number')text+=`\nEnter a whole number from ${q.min_value} to ${q.max_value}.`;
  else if(q.kind==='date')text+='\nUse YYYY-MM-DD.';
  else text+='\nReply with your answer (up to 1,000 characters).';
  if(q.allow_unsure)text+='\nType NOT SURE if you need advice.';
  if(!q.required)text+='\nType SKIP to leave this optional question unanswered.';
  return {text:text+'\nYou can type PAUSE, HUMAN or STOP anytime.',buttons:controls};
}
function contactPrompt(state){
  const field=contacts.find(key=>!state.contact[key]);
  if(!field){state.mode='review';return null;}
  state.contact_field=field;
  return {text:`Before submitting, please enter ${contactLabels[field]}.\nYour details will be saved for our team to respond to this enquiry.\nType BACK to edit your scope, HUMAN for assistance, or STOP to end.`,buttons:controls};
}
function review(state,snapshot,catalogue){
  const quote=buildQuote(snapshot,state.answers,catalogue);
  if(quote.errors){state.mode='planning';state.completed=state.completed.filter(key=>!quote.errors[key]);return ask(state,snapshot,catalogue);}
  const fingerprint=quoteFingerprint(quote);
  if(state.quote_fingerprint&&state.quote_fingerprint!==fingerprint)state.submission_id=crypto.randomUUID();
  state.quote_fingerprint=fingerprint;state.mode='review';
  state.scope=quote.summary;
  const prices=quote.lines.map(v=>`- ${v.name}: ${v.unit_price===null||v.billing_type==='quote'?'manual quotation':money(v.unit_price)+(v.billing_type==='monthly'?`/month; ${money(v.annual_price)}/year`:' once')}`).join('\n');
  const total=hasPricedSelection(quote.lines)?`\nPriced subtotal: ${money(quote.one_time_estimate)} once + ${money(quote.billing_period==='yearly'?quote.annual_estimate:quote.monthly_estimate)}/${quote.billing_period==='yearly'?'year':'month'}`:'\nScope and pricing require team review.';
  return {text:`Please review before submitting:\n${quote.summary.map(v=>`${v.label}: ${v.value}`).join('\n')}\n\n${prices}${total}\n\n${contacts.map(k=>`${k.replaceAll('_',' ')}: ${state.contact[k]}`).join('\n')}\n\nPreliminary estimate only. Custom work, third-party costs and final scope require team confirmation.\nType CONTACT to edit contact details, BACK to edit scope, or STOP to cancel.`,buttons:[button('submit','Submit to team'),button('back','Edit scope'),button('human','Talk to team')]};
}

// All transitions are persisted by the worker before any outbound message is sent.
export async function transition(conversation,event,deps){
  const state=structuredClone(conversation.state||freshState());
  state.answers||={};state.completed||=[];state.contact||={};
  let assigned=conversation.assigned_to,enquiry=conversation.enquiry_id;
  const result=reply=>({state,assigned,enquiry,reply});
  if(event.kind!=='customer'){
    delete state.last_admin_error;
    if(event.kind==='claim'){
      if(['stopped','closed'].includes(state.mode))throw new Error('This conversation is stopped or closed. Wait for the customer to request assistance again.');
      if(assigned&&assigned!==event.actor_id)throw new Error('Another teammate owns this conversation.');
      assigned=event.actor_id;state.mode='human';return result(null);
    }
    if(!assigned||assigned!==event.actor_id)throw new Error('Claim this conversation before managing it.');
    if(event.kind==='reply'){
      if(state.mode!=='human')throw new Error('Human conversation is not active.');
      return result({text:event.payload.text,buttons:[]});
    }
    if(event.kind==='release'){assigned=null;state.mode='queued';return result(null);}
    if(event.kind==='close'){assigned=null;state.mode='closed';return result({text:'Our team has closed this conversation. If you need anything else, send MENU to start again.',buttons:[]});}
    return result(null);
  }
  const text=String(event.payload.text||'').trim(),cmd=text.toLowerCase().replace(/^\//,'');
  const handoff=()=>{state.mode='queued';state.submission_id||=crypto.randomUUID();return result({text:deps.settings.handoff_message,buttons:[]});};
  if(['stop','quit','cancel','stop messaging me','unsubscribe'].includes(cmd)){state.mode='stopped';assigned=null;return result({text:'Automated guidance has stopped. Your unfinished answers have not been submitted. Previously submitted enquiries remain saved. We will not send automatic reminders. Type MENU if you want to start again.',buttons:[]});}
  if(['human','agent','talk to team','talk to human'].includes(cmd)||/\b(talk|speak|connect|transfer)\b.{0,60}\b(human|person|agent|team|someone)\b/i.test(text)){
    if(['queued','human'].includes(state.mode))return result({text:deps.settings.handoff_message,buttons:[]});
    return handoff();
  }
  // Sending a fresh website enquiry is an explicit request to continue, even after STOP.
  const ref=text.match(/MV-WA:([A-Za-z0-9_.-]+)/)?.[1];
  if(ref||(/^(Hi MV Studio,)/i.test(text)&&/Name:|My enquiry:|Interested services:/i.test(text))){
    if(ref){const linked=await deps.link(ref,conversation.phone);if(linked)enquiry=linked;}
    state.website_context=text.replace(/^MV-WA:[A-Za-z0-9_.-]+\s*$/gm,'').trim().slice(0,6000);
    if(['queued','human'].includes(state.mode))return result(null);
    return handoff();
  }
  if(['queued','human'].includes(state.mode))return result(null); // Never interrupt a human conversation.
  if(cmd==='pause'){state.resume_mode=state.mode;state.mode='paused';return result({text:'Your progress is paused. We will not send reminders. Type CONTINUE to resume, HUMAN for our team, or STOP to end.',buttons:[]});}
  if(['paused','stopped','closed'].includes(state.mode)){
    if(cmd==='continue'&&state.mode==='paused'){
      state.mode=state.resume_mode||'menu';
      if(deps.release&&state.release_id===deps.release.id){
        if(state.mode==='planning')return result(ask(state,deps.release.snapshot,deps.catalogue)||review(state,deps.release.snapshot,deps.catalogue));
        if(state.mode==='contact')return result(contactPrompt(state)||review(state,deps.release.snapshot,deps.catalogue));
        if(state.mode==='review')return result(review(state,deps.release.snapshot,deps.catalogue));
      }
      return deps.release?result({text:'Choose how you would like to continue.',buttons:menu}):handoff();
    }
    else if(!['menu','start','restart'].includes(cmd))return result({text:'The guide is not running. Choose how you would like to continue.',buttons:[button('continue','Continue'),button('menu','Main menu'),button('human','Talk to team')]});
  }
  if(!deps.release)return handoff();
  if(cmd==='restart'){state.confirm_restart=true;return result({text:'Start again and clear your unfinished answers?',buttons:[button('confirm_restart','Start again'),button('continue','Keep my progress'),button('human','Talk to team')]});}
  if(cmd==='confirm_restart'&&state.confirm_restart){for(const key of Object.keys(state))delete state[key];Object.assign(state,freshState());enquiry=null;}
  if(cmd==='continue'&&state.confirm_restart){
    delete state.confirm_restart;
    if(deps.release&&state.release_id===deps.release.id){
      if(state.mode==='planning')return result(ask(state,deps.release.snapshot,deps.catalogue)||review(state,deps.release.snapshot,deps.catalogue));
      if(state.mode==='contact')return result(contactPrompt(state)||review(state,deps.release.snapshot,deps.catalogue));
      if(state.mode==='review')return result(review(state,deps.release.snapshot,deps.catalogue));
    }
    return result({text:deps.settings.greeting,buttons:menu});
  }
  if(['menu','start','help','confirm_restart'].includes(cmd)||!text){state.mode='menu';state.introduced=true;return result({text:event.payload.unsupported?'Please send a text message or use the choices below. Attachments are not processed by this assistant.':deps.settings.greeting,buttons:menu});}
  if(cmd==='ask'){state.mode='faq';return result({text:'What would you like to know about our services? You can type PLAN for guided requirements, HUMAN for our team, or STOP.',buttons:[button('plan','Plan my project'),button('human','Talk to team'),button('stop','Stop')]});}
  if(cmd==='plan'){
    if(!deps.release)return handoff();
    if(state.submitted){for(const key of Object.keys(state))delete state[key];Object.assign(state,freshState());enquiry=null;}
    if(state.completed.length){state.mode='paused';state.resume_mode='planning';return result({text:'You have unfinished answers. Type CONTINUE to keep them or RESTART to clear them.',buttons:[button('continue','Continue'),button('restart','Start again'),button('human','Talk to team')]});}
    state.release_id=deps.release.id;state.submission_id||=crypto.randomUUID();return result(ask(state,deps.release.snapshot,deps.catalogue));
  }
  if(['planning','contact','review'].includes(state.mode)){
    if(!deps.release||state.release_id!==deps.release.id){state.mode='menu';state.completed=[];state.answers={};delete state.quote_fingerprint;return result({text:'Our project guide has been updated. Please start again with the latest options, or speak with our team.',buttons:menu});}
    const snapshot=deps.release.snapshot;
    if(cmd==='back'){
      const visible=visibleQuestions(snapshot,state.answers,deps.catalogue),last=state.completed.pop();
      if(last){const index=visible.findIndex(q=>q.key===last);state.completed=state.completed.filter(key=>visible.findIndex(q=>q.key===key)<index);}
      state.page=0;delete state.quote_fingerprint;return result(ask(state,snapshot,deps.catalogue));
    }
    if(state.mode==='planning'){
      const q=current(state,snapshot,deps.catalogue);
      if(!q){const prompt=contactPrompt(state);return result(prompt||review(state,snapshot,deps.catalogue));}
      const choices=choicesFor(q,snapshot,deps.catalogue);
      if(['more','prev'].includes(cmd)){state.page=Math.max(0,Math.min(Math.ceil(choices.length/15)-1,(state.page||0)+(cmd==='more'?1:-1)));return result(ask(state,snapshot,deps.catalogue));}
      let value=text;
      if(cmd==='not sure'||cmd==='unsure')value=UNSURE;
      else if(cmd==='skip'&&!q.required)value=undefined;
      else if(['single','billing','multi','goals','features'].includes(q.kind)){
        const tokens=text.split(',').map(v=>v.trim());
        if(tokens.some(v=>!/^\d+$/.test(v)||!choices[Number(v)-1]))return result({text:'Please reply with the option number(s) shown. Type HUMAN for help or STOP to end.',buttons:controls});
        const selected=[...new Set(tokens.map(v=>choices[Number(v)-1].value))];
        value=['single','billing'].includes(q.kind)?selected.length===1?selected[0]:null:selected;
      }else if(q.kind==='number')value=/^\d+$/.test(text)?Number(text):NaN;
      const next={...state.answers,[q.key]:value};if(value===undefined)delete next[q.key];
      const checked=validateAnswers(snapshot,next,deps.catalogue,false);
      if(checked.errors[q.key])return result({text:checked.errors[q.key]+' Type BACK to review, HUMAN for help, or STOP.',buttons:controls});
      state.answers=pruneAnswers(snapshot,next,deps.catalogue);state.completed.push(q.key);state.completed=state.completed.filter(key=>visibleQuestions(snapshot,state.answers,deps.catalogue).some(q=>q.key===key));state.page=0;
      const reply=ask(state,snapshot,deps.catalogue);return result(reply||review(state,snapshot,deps.catalogue));
    }
    if(cmd==='contact'){state.contact={};state.mode='contact';return result(contactPrompt(state));}
    if(state.mode==='contact'){
      const key=contacts.find(key=>!state.contact[key]);
      if(key){const candidate={...state.contact,[key]:text},error=validateContact(candidate)[key];if(error)return result({text:error,buttons:controls});state.contact=candidate;}
      return result(contactPrompt(state)||review(state,snapshot,deps.catalogue));
    }
    if(cmd==='submit'){
      const quote=buildQuote(snapshot,state.answers,deps.catalogue);
      if(quote.errors||quoteFingerprint(quote)!==state.quote_fingerprint)return result({...(review(state,snapshot,deps.catalogue)),text:'The scope or pricing changed. Please review and submit again.\n\n'+review(state,snapshot,deps.catalogue).text});
      const checked=validateContact(state.contact);if(Object.keys(checked).length){state.contact={};state.mode='contact';return result(contactPrompt(state));}
      state.submission_id||=crypto.randomUUID();
      const saved=await deps.submit(state,quote);
      if(!saved.ok&&saved.status===409){state.submission_id=crypto.randomUUID();return result(review(state,snapshot,deps.catalogue));}
      if(!saved.ok)return result({text:'We could not confirm your submission. Your answers are kept. Type SUBMIT to retry, HUMAN for help, or STOP.',buttons:[button('submit','Retry submission'),button('human','Talk to team'),button('stop','Stop')]});
      enquiry=saved.id;state.submitted=true;return handoff();
    }
    return result(review(state,snapshot,deps.catalogue));
  }
  if(!deps.release)return handoff();
  if(state.mode==='menu'&&!state.introduced){state.introduced=true;return result({text:deps.settings.greeting+'\nYour message is saved in this conversation. Choose how you would like to continue.',buttons:menu});}
  const answer=await deps.answer(text);
  if(answer.action==='handoff')return handoff();
  state.mode='faq';return result({text:answer.answer.slice(0,3400),buttons:[button('plan','Plan my project'),button('human','Talk to team'),button('stop','Stop')]});
}
