// Holds the article text. The server (prerender) fills it at start-up; in the browser it is loaded
// on demand, so visitors who never open a guide never download the text.
let content=null;
export const getGuideContent=()=>content;
export const setGuideContent=value=>{content=value;};
export async function loadGuideContent(){
  if(!content)content=(await import('./articles.mjs')).default;
  return content;
}
