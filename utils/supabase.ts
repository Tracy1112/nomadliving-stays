import { createClient } from '@supabase/supabase-js';

const bucket = 'home-away-draft';

// 环境变量验证
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_KEY must be set'
  );
}

const supabase = createClient(url, key);

export const uploadImage = async (image: File) => {
  const timestamp = Date.now();
  // 清理文件名，移除特殊字符，防止路径遍历攻击
  const sanitizedFileName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const newName = `${timestamp}-${sanitizedFileName}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(newName, image, { cacheControl: '3600' });
    
  if (error || !data) {
    throw new Error(`Image upload failed: ${error?.message || 'Unknown error'}`);
  }
  
  return supabase.storage.from(bucket).getPublicUrl(newName).data.publicUrl;
};
