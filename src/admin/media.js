export async function uploadImage(file,storage){
  const folder=`images/${crypto.randomUUID()}`;
  // Store WebP uploads unchanged. Re-encoding an already-WebP image through
  // canvas fails on browsers that cannot encode WebP, even though upload works.
  if(file.type==='image/gif'||file.type==='image/webp'||!('createImageBitmap' in window)){
    const path=`${folder}/original.${file.name.split('.').pop().replace(/[^a-z0-9]/gi,'')}`;
    const result=await storage.upload(path,file,{contentType:file.type});if(result.error)throw result.error;
    return {image_url:storage.getPublicUrl(path).data.publicUrl,image_variants:[]};
  }
  const image=await createImageBitmap(file),uploaded=[];
  try{
    const variants=[];
    for(const width of [...new Set([480,960,1600].map(v=>Math.min(v,image.width)))]){
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(image.height*width/image.width);
      const context=canvas.getContext('2d');if(!context)throw new Error('This browser cannot optimize images.');
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));
      if(!blob||blob.type!=='image/webp')throw new Error('WebP conversion is unavailable. Use a WebP image instead.');
      const path=`${folder}/${width}.webp`;
      const result=await storage.upload(path,blob,{contentType:'image/webp'});if(result.error)throw result.error;
      uploaded.push(path);variants.push({url:storage.getPublicUrl(path).data.publicUrl,width,height:canvas.height});
    }
    return {image_url:variants.at(-1).url,image_variants:variants};
  }catch(error){if(uploaded.length)await storage.remove(uploaded);throw error;}finally{image.close();}
}
