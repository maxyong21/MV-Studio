// A tiny inline format for article text: **bold** and [anchor](/path or https://...).
// Kept as a plain function so it can be tested without a browser.
export function parseInline(text){
  const parts=[],pattern=/\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last=0,match;
  const source=String(text);
  while((match=pattern.exec(source))){
    if(match.index>last)parts.push({type:'text',text:source.slice(last,match.index)});
    parts.push(match[1]?{type:'link',text:match[1],href:match[2]}:{type:'bold',text:match[3]});
    last=pattern.lastIndex;
  }
  if(last<source.length)parts.push({type:'text',text:source.slice(last)});
  return parts;
}
export const isExternal=href=>/^https?:\/\//i.test(href);
export const plainText=text=>parseInline(text).map(part=>part.text).join('');
// Words for reading-time checks. Chinese is counted by character, other languages by word.
export const wordCount=text=>{
  const plain=plainText(text);
  const han=(plain.match(/[一-鿿]/g)||[]).length;
  return han?han:plain.split(/\s+/).filter(Boolean).length;
};
