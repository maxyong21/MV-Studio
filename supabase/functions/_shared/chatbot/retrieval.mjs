const stop=new Set('a an the is are was were i me my we our you your do does can could would should what which how it this that for to of and or with in on have has about tell please'.split(' '));
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('und',{granularity:'word'}):null;
export function tokens(text){
  const value=String(text).normalize('NFKC').toLowerCase();
  const words=segmenter?[...segmenter.segment(value)].filter(v=>v.isWordLike).map(v=>v.segment):value.match(/[\p{L}\p{N}]+/gu)||[];
  return words.filter(v=>!stop.has(v)&&v.length>1);
}
export function bm25(query,documents){
  const terms=[...new Set(tokens(query))],sets=documents.map(v=>tokens(`${v.title} ${v.content}`));
  const average=sets.reduce((n,v)=>n+v.length,0)/(sets.length||1)||1;
  const frequencies=sets.map(words=>{const map=new Map();for(const word of words)map.set(word,(map.get(word)||0)+1);return map;});
  const documentFrequency=new Map();
  for(const map of frequencies)for(const term of terms)if(map.has(term))documentFrequency.set(term,(documentFrequency.get(term)||0)+1);
  return documents.map((doc,index)=>{
    const words=sets[index];let score=0;
    for(const term of terms){
      const df=documentFrequency.get(term)||0,frequency=frequencies[index].get(term)||0;
      const idf=Math.log(1+(sets.length-df+.5)/(df+.5));
      score+=idf*(frequency*2.2)/(frequency+1.2*(.25+.75*words.length/average)||1);
    }
    return {...doc,keyword_score:score};
  }).filter(v=>v.keyword_score>0).sort((a,b)=>b.keyword_score-a.keyword_score);
}
export function cosine(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return -1;
  let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}
  return aa&&bb?dot/Math.sqrt(aa*bb):-1;
}
export function retrieve(query,chunks,embedding=null){
  const lexical=bm25(query,chunks),semantic=embedding?chunks.map(v=>({...v,semantic_score:cosine(embedding,v.embedding)})).filter(v=>v.semantic_score>=.6).sort((a,b)=>b.semantic_score-a.semantic_score):[];
  const results=new Map();
  for(const list of [lexical,semantic])list.slice(0,12).forEach((item,index)=>{
    const key=item.source_id,old=results.get(key);results.set(key,{...item,score:(old?.score||0)+1/(50+index+1)});
  });
  return [...results.values()].sort((a,b)=>b.score-a.score).slice(0,3);
}
export function chunkDocuments(documents){
  const chunks=[];
  for(const document of documents){
    let rest=document.body.trim(),index=0;
    while(rest){
      let cut=rest.length<=1100?rest.length:rest.lastIndexOf('\n',1100);
      if(cut<400)cut=rest.lastIndexOf(' ',1100);if(cut<400)cut=Math.min(rest.length,1100);
      chunks.push({source_id:`${document.id}:${index++}`,title:document.title,content:rest.slice(0,cut).trim(),embedding:null});
      rest=rest.slice(cut).trim();
    }
  }
  if(chunks.length>120)throw new Error('The knowledge base is too large for one release. Keep it within 120 short sections.');
  return chunks;
}
export const redact=text=>String(text||'').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email removed]').replace(/\+?\d[\d ()-]{6,}\d/g,'[contact number removed]');
