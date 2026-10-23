import localMedia from 'virtual:studio-images';
export default function SmartImage({record={},src,alt,sizes='100vw',priority=false,...props}){
  const value=src||record.image_url||'/aphome.png';
  const original=/^(https?:\/\/|\/)/i.test(value)?value:`/${value}`;
  const key=original.startsWith('/')?original:`/${original}`;
  const candidates=(record.image_variants?.length?record.image_variants:localMedia[key])||[];
  const variants=candidates.filter(v=>v.url&&Number(v.width)>0).sort((a,b)=>a.width-b.width);
  const largest=variants.at(-1);
  return <img {...props} src={largest?.url||original} srcSet={variants.length?variants.map(v=>`${v.url} ${v.width}w`).join(', '):undefined} sizes={variants.length?sizes:undefined} width={largest?.width} height={largest?.height} alt={alt||''} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined} decoding="async"/>;
}
