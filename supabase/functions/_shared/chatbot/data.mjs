import {uuidPattern} from '../enquiry.mjs';
import {providerConfig,providerHash,embedTexts} from './providers.mjs';
import {chunkDocuments} from './retrieval.mjs';
import {validateSnapshot} from './flow.mjs';
export class ChatError extends Error{constructor(message,status=400,fields){super(message);this.status=status;this.fields=fields;}}
export const must=result=>{if(result.error)throw result.error;return result.data;};
export const stateFor=async admin=>must(await admin.from('chatbot_state').select('*').eq('id',1).single());
export const catalogueFor=async admin=>must(await admin.from('feature_options').select('id,name,description,category,billing_type,price,annual_free_months,sort_order,active').eq('active',true).order('sort_order'))||[];
export async function requireAdmin(request,admin){
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)throw new ChatError('Sign in to the administrator workspace.',401);
  const result=await admin.auth.getUser(token);
  if(result.error||!result.data?.user)throw new ChatError('Your session expired. Sign in again.',401);
  const membership=await admin.from('admin_users').select('user_id').eq('user_id',result.data.user.id).maybeSingle();
  if(membership.error||!membership.data)throw new ChatError('Administrator access is required.',403);
  return result.data.user.id;
}
export async function draftFor(admin){
  const names=['chatbot_settings','chatbot_documents','chatbot_questions','chatbot_options','chatbot_rules'];
  const values=await Promise.all(names.map(name=>admin.from(name).select('*')));
  const rows=Object.fromEntries(names.map((name,index)=>[name.replace('chatbot_',''),must(values[index])]));
  return {settings:rows.settings[0],documents:rows.documents.filter(v=>v.active),questions:rows.questions.filter(v=>v.active),options:rows.options.filter(v=>v.active),rules:rows.rules.filter(v=>v.active)};
}
export async function releaseFor(admin,id){
  if(!uuidPattern.test(id||''))throw new ChatError('Choose a valid release.');
  const release=must(await admin.from('chatbot_releases').select('*').eq('id',id).maybeSingle());
  if(!release)throw new ChatError('This release is unavailable.',404);
  return release;
}
export const chunksFor=async(admin,id)=>must(await admin.from('chatbot_chunks').select('source_id,title,content,embedding').eq('release_id',id))||[];
export function publicFlow(release,catalogue){
  const {settings,questions,options,rules}=release.snapshot;
  return {ok:true,available:true,release_id:release.id,release_label:release.label,settings:{name:settings.name,greeting:settings.greeting,handoff_message:settings.handoff_message},questions,options,rules,catalogue};
}
export async function buildRelease(admin,userId,label,deps){
  const state=await stateFor(admin),snapshot=await draftFor(admin),errors=validateSnapshot(snapshot);
  if(errors.length)throw new ChatError(errors.join('\n'));
  snapshot.providers=providerConfig(deps.env);
  if(snapshot.settings.answer_mode==='groq'&&(!deps.env('GROQ_API_KEY')||!snapshot.providers.chat_model))throw new ChatError('Set GROQ_API_KEY and GROQ_CHAT_MODEL in Edge Function secrets, or choose extractive answers.');
  const services=must(await admin.from('services').select('*').eq('active',true));
  const documents=[...snapshot.documents,...services.map(v=>({id:`service-${v.id}`,title:`${v.name}: scope and policies`,body:[v.summary,v.scope,v.revisions,v.third_party_costs,v.maintenance_terms,v.support_terms,v.payment_terms].filter(Boolean).join('\n')})).filter(v=>v.body.length>=10)];
  const chunks=chunkDocuments(documents);
  if(snapshot.settings.retrieval_mode==='hybrid'){
    const embeddings=await embedTexts(chunks.map(v=>`${v.title}\n${v.content}`),{...deps,admin,config:snapshot.providers});
    chunks.forEach((chunk,index)=>{chunk.embedding=embeddings[index];});
  }
  const id=crypto.randomUUID(),hash=await providerHash(deps.env);
  must(await admin.rpc('chatbot_store_release',{p_id:id,p_label:label,p_revision:state.draft_revision,p_hash:hash,p_snapshot:snapshot,p_chunks:chunks,p_admin:userId}));
  return {id,label,sections:chunks.length,mode:snapshot.settings.retrieval_mode};
}

const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function validateDraftRow(table,input){
  const fields={
    chatbot_documents:['title','body','category','active','sort_order'],
    chatbot_questions:['key','title','help_text','kind','required','allow_unsure','min_value','max_value','catalog_categories','active','sort_order'],
    chatbot_options:['question_key','value','label','description','keywords','active','sort_order'],
    chatbot_rules:['question_key','source_key','operator','values','active','sort_order'],
    chatbot_test_cases:['name','kind','prompt','expected_action','expected_terms','forbidden_terms','answers','expected_one_time','expected_monthly','expected_annual','active','sort_order'],
  }[table];
  if(!fields)throw new ChatError('This draft section cannot be edited.');
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ChatError('Enter valid draft fields.');
  const row={},errors={};
  for(const key of fields){
    const value=input[key];if(value===undefined)continue;
    if(['active','required','allow_unsure'].includes(key)){if(typeof value!=='boolean')errors[key]='Choose yes or no.';else row[key]=value;}
    else if(['sort_order','min_value','max_value'].includes(key)){if(!Number.isInteger(Number(value))||Number(value)<0||Number(value)>2147483647||value==='')errors[key]='Enter a whole number from 0 to 2,147,483,647.';else row[key]=Number(value);}
    else if(key.startsWith('expected_')&&['expected_one_time','expected_monthly','expected_annual'].includes(key)){if(value===''||value===null)row[key]=null;else if(!Number.isFinite(Number(value))||Number(value)<0)errors[key]='Enter zero or more.';else row[key]=Number(value);}
    else if(['keywords','values','catalog_categories','expected_terms','forbidden_terms'].includes(key)){
      if(!Array.isArray(value)||value.length>30||value.some(v=>typeof v!=='string'||!v.trim()||v.length>200))errors[key]='Use up to 30 non-empty values, each within 200 characters.';else row[key]=value.map(v=>v.trim());
    }else if(key==='answers'){if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>10000)errors[key]='Use answers from the preview or a valid answer object.';else row[key]=value;}
    else{const max=key==='body'?8000:key==='prompt'?2000:['description','help_text'].includes(key)?1000:['label','name'].includes(key)||key==='title'&&table==='chatbot_documents'?160:200;if(typeof value!=='string'||value.length>max)errors[key]=`Use text within ${max} characters.`;else row[key]=text(value,max);}
  }
  const required={chatbot_documents:['title','body'],chatbot_questions:['key','title','kind'],chatbot_options:['question_key','value','label'],chatbot_rules:['question_key','source_key','operator'],chatbot_test_cases:['name','kind']}[table];
  for(const key of required)if(!row[key])errors[key]='This field is required.';
  for(const key of ['title','name'])if(row[key]&&row[key].length<2)errors[key]='Use at least two characters.';
  for(const key of ['key','question_key'])if(row[key]&&!/^[a-z][a-z0-9_]{1,39}$/.test(row[key]))errors[key]='Use 2–40 lowercase letters, numbers or underscores, starting with a letter.';
  if(row.value&&!/^[a-z][a-z0-9_]{0,59}$/.test(row.value))errors.value='Use a lowercase option identifier without spaces.';
  if(row.source_key&&row.source_key!=='$has_recurring'&&!/^[a-z][a-z0-9_]{1,39}$/.test(row.source_key))errors.source_key='Select a question or the recurring-services condition.';
  if(table==='chatbot_documents'&&(row.title?.length<2||row.body?.length<10))errors.body='Add a title and at least 10 characters of approved information.';
  if(table==='chatbot_questions'){
    if(!['single','multi','goals','billing','number','text','date','features'].includes(row.kind))errors.kind='Choose a supported card type.';
    if(row.min_value>row.max_value)errors.max_value='Maximum must be at least the minimum.';
    if(row.catalog_categories?.some(v=>!['core','third_party','maintenance'].includes(v)))errors.catalog_categories='Choose valid feature categories.';
  }
  if(table==='chatbot_rules'&&!['equals','not_equals','includes_any','gte','lte','answered'].includes(row.operator))errors.operator='Choose a supported rule operator.';
  if(table==='chatbot_rules'&&row.operator!=='answered'&&!row.values?.length)errors.values='Add at least one matching value.';
  if(table==='chatbot_rules'&&['gte','lte'].includes(row.operator)&&(row.values?.length!==1||!Number.isFinite(Number(row.values?.[0]))))errors.values='Add exactly one numeric comparison value.';
  if(table==='chatbot_test_cases'){
    if(!['answer','quote'].includes(row.kind))errors.kind='Choose an answer or quote test.';
    if(row.kind==='answer'&&(!row.prompt||!['answer','guide','clarify','handoff'].includes(row.expected_action)))errors.prompt='Enter a question and expected action.';
    if(row.kind==='quote'&&[row.expected_one_time,row.expected_monthly,row.expected_annual].every(v=>v===null||v===undefined))errors.expected_one_time='Set at least one expected total for a meaningful quote test.';
  }
  if(Object.keys(errors).length)throw new ChatError('Review the highlighted draft fields.',400,errors);
  return {...row,updated_at:new Date().toISOString()};
}
