const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const BUCKET_CV = process.env.SUPABASE_CV_BUCKET || 'cvs';
const BUCKET_LOGOS = process.env.SUPABASE_LOGO_BUCKET || 'logos';

async function uploadBuffer(bucket, filePath, buffer, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
    contentType,
    upsert: true,
    cacheControl: '3600'
  });
  if (error) throw error;
  return filePath;
}

async function removeFile(bucket, filePath) {
  if (!filePath) return;
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) console.warn('No se pudo eliminar archivo de storage:', error.message);
}

async function createSignedUrl(bucket, filePath, expiresIn = 300) {
  if (!filePath) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

function publicUrl(bucket, filePath) {
  if (!filePath) return null;
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}

module.exports = { supabase, BUCKET_CV, BUCKET_LOGOS, uploadBuffer, removeFile, createSignedUrl, publicUrl };
