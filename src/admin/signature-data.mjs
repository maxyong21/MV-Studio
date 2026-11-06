export function signatureFromTeam(team=[],base={}){
 return {...base,members:team.filter(m=>m.active).map(m=>{
  const previous=(base.members||[]).find(p=>p.team_member_id===m.id||(!p.team_member_id&&p.name?.trim().toLowerCase()===m.name?.trim().toLowerCase()));
  return {team_member_id:m.id,name:m.name||'',email:m.email||'',phone:m.phone||'',portfolio:m.website_url||'',enabled:previous?.enabled??true};
 })};
}
