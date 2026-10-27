import {estimateFeatures} from '../enquiry.mjs';
export const UNSURE='__unsure__';
const clean=value=>typeof value==='string'?value.trim():'';
const active=rows=>(rows||[]).filter(v=>v.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.id||a.key||'').localeCompare(String(b.id||b.key||'')));
export const questionsFor=snapshot=>active(snapshot.questions);
export const optionsFor=(snapshot,key)=>active(snapshot.options).filter(v=>v.question_key===key);
export const featuresFor=(question,catalogue)=>active(catalogue).filter(v=>question.catalog_categories?.includes(v.category));

export function selectedFeatureIds(snapshot,answers,catalogue){
  const allowed=new Set(active(catalogue).map(v=>v.id));
  return [...new Set(questionsFor(snapshot).filter(v=>v.kind==='features').flatMap(v=>Array.isArray(answers[v.key])?answers[v.key]:[]).filter(id=>allowed.has(id)))];
}
function ruleMatches(rule,answers,snapshot,catalogue){
  let value=answers[rule.source_key];
  if(rule.source_key==='$has_recurring')value=selectedFeatureIds(snapshot,answers,catalogue).some(id=>catalogue.find(v=>v.id===id)?.billing_type==='monthly');
  const values=rule.values||[];
  switch(rule.operator){
    case 'equals':return String(value)===values[0];
    case 'not_equals':return value!==undefined&&value!==UNSURE&&String(value)!==values[0];
    case 'includes_any':return (Array.isArray(value)?value:[value]).some(v=>values.includes(String(v)));
    case 'gte':return value!==UNSURE&&value!==undefined&&Number(value)>=Number(values[0]);
    case 'lte':return value!==UNSURE&&value!==undefined&&Number(value)<=Number(values[0]);
    case 'answered':return value!==undefined&&value!==''&&value!==UNSURE;
    default:return false;
  }
}
export function visibleQuestions(snapshot,answers={},catalogue=[]){
  const visible=[],accepted={};
  for(const question of questionsFor(snapshot)){
    const rules=active(snapshot.rules).filter(rule=>rule.question_key===question.key);
    if(rules.every(rule=>ruleMatches(rule,accepted,snapshot,catalogue))){visible.push(question);if(Object.hasOwn(answers,question.key))accepted[question.key]=answers[question.key];}
  }
  return visible;
}
export function pruneAnswers(snapshot,answers={},catalogue=[]){
  const allowed=new Set(visibleQuestions(snapshot,answers,catalogue).map(v=>v.key));
  return Object.fromEntries(Object.entries(answers).filter(([key])=>allowed.has(key)));
}
export function validateAnswers(snapshot,input={},catalogue=[],complete=false){
  const errors={};
  if(!input||typeof input!=='object'||Array.isArray(input))return {errors:{form:'Choose answers using the guided cards.'},answers:{}};
  const known=new Set(questionsFor(snapshot).map(v=>v.key));
  for(const key of Object.keys(input))if(!known.has(key))errors[key]='This question is not part of the published flow.';
  const answers=pruneAnswers(snapshot,input,catalogue);
  for(const question of visibleQuestions(snapshot,answers,catalogue)){
    const value=answers[question.key],missing=value===undefined||value===''||value===null||(Array.isArray(value)&&!value.length);
    if(missing){if(complete&&question.required)errors[question.key]=question.allow_unsure?'Choose an answer or select “Not sure”.':'Choose an answer.';continue;}
    if(value===UNSURE){if(!question.allow_unsure)errors[question.key]='Choose one of the available answers.';continue;}
    if(['single','billing'].includes(question.kind)&&!optionsFor(snapshot,question.key).some(v=>v.value===value))errors[question.key]='Choose an available option.';
    if(['multi','goals'].includes(question.kind)&&(!Array.isArray(value)||value.length>30||value.some(v=>!optionsFor(snapshot,question.key).some(o=>o.value===v))))errors[question.key]='Choose available options.';
    if(question.kind==='features'&&(!Array.isArray(value)||value.length>30||value.some(id=>!featuresFor(question,catalogue).some(v=>v.id===id))))errors[question.key]='A feature is unavailable. Review your selections.';
    if(question.kind==='number'&&(typeof value!=='number'||!Number.isInteger(value)||value<question.min_value||value>question.max_value))errors[question.key]=`Enter a whole number between ${question.min_value} and ${question.max_value}.`;
    if(question.kind==='text'&&(typeof value!=='string'||!value.trim()||value.length>1000))errors[question.key]='Enter up to 1,000 characters.';
    if(question.kind==='date'&&(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value<new Date().toISOString().slice(0,10)))errors[question.key]='Choose today or a future date.';
  }
  return {answers,errors};
}
export function scopeSummary(snapshot,answers,catalogue){
  return visibleQuestions(snapshot,answers,catalogue).filter(q=>answers[q.key]!==undefined).map(q=>{
    const value=answers[q.key];let display=value;
    if(value===UNSURE)display='Not sure yet';
    else if(q.kind==='features')display=(value||[]).map(id=>catalogue.find(v=>v.id===id)?.name||'Unavailable feature').join(', ')||'No additional features';
    else if(['single','multi','goals','billing'].includes(q.kind))display=(Array.isArray(value)?value:[value]).map(v=>optionsFor(snapshot,q.key).find(o=>o.value===v)?.label||v).join(', ');
    return {key:q.key,label:q.title,value:String(display)};
  });
}
export function buildQuote(snapshot,input,catalogue){
  const {answers,errors}=validateAnswers(snapshot,input,catalogue,true);
  if(Object.keys(errors).length)return {errors};
  const ids=selectedFeatureIds(snapshot,answers,catalogue);
  const items=ids.map(id=>catalogue.find(v=>v.id===id));
  const totals=estimateFeatures(items);
  const lines=items.map(v=>({id:v.id,name:v.name,billing_type:v.billing_type,unit_price:v.price===null?null:Number(v.price),annual_free_months:Number(v.annual_free_months||0),annual_price:v.billing_type==='monthly'&&v.price!==null?Math.round(Number(v.price)*100)*(12-Number(v.annual_free_months||0))/100:null}));
  const billing=questionsFor(snapshot).find(q=>q.kind==='billing');
  return {answers,selected_feature_ids:ids,billing_period:billing&&answers[billing.key]==='yearly'?'yearly':'monthly',lines,...totals,summary:scopeSummary(snapshot,answers,catalogue),manual_review:true,notice:'Preliminary estimate only. Subtotals cover selected priced catalogue items. Custom workflows and anything not listed as a priced line need manual quotation. Our team confirms the complete scope, third-party charges, delivery and final quotation.'};
}

export function validateSnapshot(snapshot){
  const errors=[],questions=questionsFor(snapshot);
  if(!questions.length)errors.push('Add at least one active question.');
  if(questions.length>30)errors.push('Keep the flow within 30 active questions.');
  if(!snapshot.settings?.name?.trim()||!snapshot.settings?.greeting?.trim())errors.push('Set an assistant name and greeting.');
  if((snapshot.documents||[]).length>50)errors.push('Keep the initial knowledge base within 50 active articles.');
  const keys=questions.map(v=>v.key);
  for(const q of questions){
    if(['single','multi','goals','billing'].includes(q.kind)&&!optionsFor(snapshot,q.key).length&&!q.allow_unsure)errors.push(`${q.key}: add options or allow “Not sure”.`);
    if(q.kind==='features'&&!q.catalog_categories?.length)errors.push(`${q.key}: choose catalogue categories.`);
    if(q.kind==='billing'&&(q.allow_unsure||optionsFor(snapshot,q.key).length!==2||optionsFor(snapshot,q.key).some(v=>!['monthly','yearly'].includes(v.value))))errors.push('Billing questions must have monthly and yearly options, without “Not sure”.');
  }
  if(questions.filter(q=>q.kind==='billing').length>1||questions.filter(q=>q.kind==='goals').length>1)errors.push('Use at most one goals question and one billing question.');
  for(const rule of active(snapshot.rules)){
    if(!keys.includes(rule.question_key))errors.push(`A rule targets the missing question ${rule.question_key}.`);
    if(rule.source_key!=='$has_recurring'&&(!keys.includes(rule.source_key)||keys.indexOf(rule.source_key)>=keys.indexOf(rule.question_key)))errors.push(`${rule.question_key}: rules must depend on an earlier active question.`);
    if(rule.source_key==='$has_recurring'&&!questions.slice(0,keys.indexOf(rule.question_key)).some(q=>q.kind==='features'))errors.push(`${rule.question_key}: recurring-service rules need an earlier feature question.`);
    if(rule.operator!=='answered'&&!rule.values?.length)errors.push(`${rule.question_key}: enter a rule value.`);
  }
  return errors;
}
