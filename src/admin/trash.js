import {supabase} from '../supabase.js';

// True when the database has not had 20261114_recently_deleted.sql applied yet.
// Callers then fall back to the older permanent delete, with a clear warning,
// so deleting keeps working whichever is deployed first.
export const trashMissing=error=>['PGRST202','PGRST205','42883','42P01'].includes(error?.code)||error?.status===404||/could not find the function|does not exist/i.test(error?.message||'');

export async function moveToTrash(table,id){
  const {error}=await supabase.rpc('admin_trash_delete',{p_table:table,p_id:String(id)});
  if(!error)return 'trashed';
  if(trashMissing(error))return 'unavailable';
  throw error;
}
