import {digest} from '../http.mjs';
import {uuidPattern} from '../enquiry.mjs';
import {ChatError,must,stateFor} from './data.mjs';
export async function estimateRecord(admin,input,checkFresh=true){
  if(!uuidPattern.test(input.chatbot_estimate_id||'')||typeof input.chatbot_estimate_token!=='string'||input.chatbot_estimate_token.length>100)throw new ChatError('Review and confirm a valid estimate first.',400);
  const row=must(await admin.from('chatbot_estimates').select('*').eq('id',input.chatbot_estimate_id).maybeSingle());
  if(!row||await digest(input.chatbot_estimate_token)!==row.token_hash)throw new ChatError('This estimate reference is invalid. Generate a new estimate.',403);
  if(input.estimate_confirmed!==true)throw new ChatError('Confirm that you have reviewed the preliminary estimate.');
  if(checkFresh){
    const state=await stateFor(admin);
    if(!state.enabled||state.active_release_id!==row.release_id||state.catalog_revision!==row.catalog_revision||new Date(row.expires_at).getTime()<Date.now())throw new ChatError('The estimate expired or the catalogue changed. Review your scope and generate a fresh estimate.',409);
    if(input.billing_period&&input.billing_period!==row.billing_period)throw new ChatError('The billing preference does not match this estimate. Review it again.',409);
  }
  return row;
}
