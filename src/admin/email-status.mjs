const staleAfterMs=10*60*1000;
export function recoverStaleEmail(row,now=Date.now()){
  if(row?.notification_status!=='pending')return row;
  const updated=Date.parse(row.updated_at||row.created_at||'');
  if(!Number.isFinite(updated)||now-updated<staleAfterMs)return row;
  return {...row,notification_status:'failed',notification_error:row.notification_error||'Email status did not update. Check for the notification before retrying because an ambiguous SMTP failure can result in a duplicate email.'};
}
