// Keep editable Supabase seed SQL in sync with the reviewed content source.
import {readFile,writeFile} from 'node:fs/promises';
import {industryDocuments,industryQuestions,industryOptions,industryRules,industryTests,industryCatalogue} from '../supabase/functions/_shared/chatbot/industry-content.mjs';
const literal=value=>Array.isArray(value)?`array[${value.map(literal).join(',')}]::text[]`:typeof value==='boolean'?String(value):typeof value==='number'?String(value):value===null?'null':`'${String(value).replaceAll("'","''")}'`;
const insert=(table,rows)=>rows.map(row=>`insert into public.${table} (${Object.keys(row).map(key=>`"${key}"`).join(',')}) values (${Object.values(row).map(literal).join(',')}) on conflict do nothing;`).join('\n');
const migration=`-- Industry discovery and approved knowledge: draft content only, never auto-publish.
-- Existing articles, choices, rules and tests are preserved on reruns.
begin;
do $$ begin
 if not exists(select 1 from public.chatbot_questions where key='business_goal' and kind='goals' and active and sort_order<18) then
  raise exception 'This starter pack needs the active business_goal goals card before order 18. Adapt the pack to your custom flow before applying it.';
 end if;
end $$;
${insert('chatbot_documents',industryDocuments)}
${insert('chatbot_questions',industryQuestions)}
${insert('chatbot_options',industryOptions)}
${insert('chatbot_rules',industryRules)}
${insert('chatbot_test_cases',industryTests)}
-- Manually quoted requirements have no invented fixed fee. Existing prices win.
${insert('feature_options',industryCatalogue)}
-- A generic "online system" is not proof that a customer wants online selling.
-- Remove only that ambiguous seed keyword, retaining every other admin keyword.
update public.chatbot_options set keywords=array_remove(keywords,'online system')
where question_key='business_goal' and value='online_sales' and 'online system'=any(keywords);
commit;
`;
const migrationPath='supabase/migrations/20261027_chatbot_industries.sql';
const previous=await readFile(migrationPath,'utf8').catch(()=>null);
const marker='-- BEGIN GENERATED INDUSTRY CHATBOT CONTENT';
let schema=await readFile('supabase/schema.sql','utf8');
if(schema.includes(marker)){
 const oldBlock=`${marker}\n${previous}`;
 if(!previous||!schema.includes(oldBlock))throw Error('Existing generated schema block differs. Review it before regenerating.');
 schema=schema.replace(oldBlock,()=>`${marker}\n${migration}`);
}else schema=`${schema.trimEnd()}\n\n${marker}\n${migration}`;
await writeFile(migrationPath,migration);await writeFile('supabase/schema.sql',schema);
console.log(`Generated ${industryDocuments.length} articles, ${industryQuestions.length} questions, ${industryOptions.length} options and ${industryTests.length} answer tests.`);
