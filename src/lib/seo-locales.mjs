// Search titles and descriptions for the translated home pages. The English ones are typed in the
// admin (Website settings), so only the Bahasa Malaysia and Chinese ones are fixed here.
// Written by the developer, not a professional translator: have a native speaker review them.
export const homeSeo={
  ms:{
    title:'Reka Bentuk Laman Web Malaysia | Laman Web Mampu Milik | MV Studio',
    description:'MV Studio mereka bentuk dan membina laman web, kedai dalam talian dan aplikasi web yang mampu milik untuk perniagaan kecil di Malaysia. Harga jelas. Berurusan terus dengan pembangun.',
  },
  zh:{
    title:'马来西亚网站设计 | 实惠网站制作 | MV Studio',
    description:'MV Studio 为马来西亚小型企业设计并制作实惠的网站、网店和网页应用。价格清晰，直接与开发者沟通。',
  },
};

// The page title and description for a home page in one language. English comes from the admin settings.
export function homeMeta(lang,content={}){
  if(homeSeo[lang])return homeSeo[lang];
  return {
    title:content.seo_title||'Web Design Malaysia | Affordable Websites | MV Studio',
    description:content.seo_description||content.hero_description||'',
  };
}
