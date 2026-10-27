export const assistantIntroKey='mv-project-assistant-intro-v1';
export function canIntroduceAssistant(storage){
  try{return storage.getItem(assistantIntroKey)===null;}catch{return false;}
}
export function rememberAssistantIntro(storage){
  try{storage.setItem(assistantIntroKey,'seen');return true;}catch{return false;}
}
export function claimAssistantIntro(storage){
  return canIntroduceAssistant(storage)&&rememberAssistantIntro(storage);
}
