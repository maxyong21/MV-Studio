// What kind of project a portfolio entry is, so visitors are never left guessing
// whether it was paid client work. The admin sets it per project (docs/BUSINESS_TERMS.md).
// A project saved before the column existed has no type and simply shows no label.
export const projectTypes=['client_project','personal_project','demonstration_project'];
// English source text. The public site passes these through t() for BM and Chinese.
export const projectTypeLabels={client_project:'Client project',personal_project:'Personal project',demonstration_project:'Demonstration project'};

export function projectBadge(project){
  const type=project?.project_type;
  if(!projectTypes.includes(type))return null;
  const client=type==='client_project'&&typeof project.client_name==='string'?project.client_name.trim():'';
  return {type,label:projectTypeLabels[type],client};
}
