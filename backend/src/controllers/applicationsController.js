const path = require('path');
const { query } = require('../config/db');
const { uploadBuffer, BUCKET_CV, createSignedUrl } = require('../config/storage');
const { v4: uuidv4 } = require('uuid');

const apply = async (req,res,next)=>{try{
  const {jobId,coverLetter}=req.body;
  if(!jobId)return res.status(400).json({success:false,message:'ID del empleo requerido'});
  const job=await query('SELECT id FROM jobs WHERE id=$1 AND active=true',[jobId]);
  if(!job.rowCount)return res.status(404).json({success:false,message:'Empleo no encontrado'});
  const exists=await query('SELECT id FROM applications WHERE job_id=$1 AND candidate_id=$2',[jobId,req.user.id]);
  if(exists.rowCount)return res.status(409).json({success:false,message:'Ya te postulaste a este empleo'});
  const candidate=await query('SELECT id,name,email,cv FROM users WHERE id=$1',[req.user.id]);
  if(!candidate.rowCount)return res.status(404).json({success:false,message:'Usuario no encontrado'});
  let cv=candidate.rows[0].cv;
  if(req.file){const ext=path.extname(req.file.originalname).toLowerCase();const filePath=`${req.user.id}/${uuidv4()}${ext}`;cv=await uploadBuffer(BUCKET_CV,filePath,req.file.buffer,req.file.mimetype);await query('UPDATE users SET cv=$1,updated_at=NOW() WHERE id=$2',[cv,req.user.id]);}
  const r=await query(`INSERT INTO applications(job_id,candidate_id,candidate_name,candidate_email,cv,cover_letter) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[jobId,req.user.id,candidate.rows[0].name,candidate.rows[0].email,cv,coverLetter||'']);
  res.status(201).json({success:true,message:'Postulación enviada correctamente. Estaremos en contacto contigo.',application:r.rows[0]});
}catch(e){next(e);}};

const myApplications=async(req,res,next)=>{try{const r=await query(`SELECT a.*,j.title AS job_title,j.location AS job_location,j.type AS job_type,u.company_name,u.logo FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=j.company_id WHERE a.candidate_id=$1 ORDER BY a.created_at DESC`,[req.user.id]);res.json({success:true,applications:r.rows.map(a=>({...a,job:{id:a.job_id,title:a.job_title,location:a.job_location,type:a.job_type},company:{name:a.company_name,logo:a.logo}}))});}catch(e){next(e);}};

const jobApplications=async(req,res,next)=>{try{const r=await query(`SELECT a.*,u.name,u.email,u.phone,u.skills,u.experience,u.education,j.title FROM applications a JOIN users u ON u.id=a.candidate_id JOIN jobs j ON j.id=a.job_id WHERE a.job_id=$1 AND j.company_id=$2 ORDER BY a.created_at DESC`,[req.params.jobId,req.user.id]);if(!r.rowCount){const j=await query('SELECT id FROM jobs WHERE id=$1 AND company_id=$2',[req.params.jobId,req.user.id]);if(!j.rowCount)return res.status(403).json({success:false,message:'Sin acceso a este empleo'});}res.json({success:true,applications:r.rows.map(a=>({...a,candidate:{id:a.candidate_id,name:a.name,email:a.email,phone:a.phone,skills:a.skills,experience:a.experience,education:a.education}})),jobTitle:r.rows[0]?.title||''});}catch(e){next(e);}};

const updateStatus=async(req,res,next)=>{try{const {status}=req.body;if(!['revision','aceptado','rechazado'].includes(status))return res.status(400).json({success:false,message:'Estado inválido. Use: revision, aceptado, rechazado'});const r=await query(`UPDATE applications a SET status=$1,updated_at=NOW() FROM jobs j WHERE a.id=$2 AND a.job_id=j.id AND j.company_id=$3 RETURNING a.*`,[status,req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({success:false,message:'Postulación no encontrada o sin permisos'});res.json({success:true,message:'Estado actualizado',application:r.rows[0]});}catch(e){next(e);}};

const getCvUrl=async(req,res,next)=>{try{const r=await query(`SELECT a.cv,a.candidate_id,j.company_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1`,[req.params.id]);if(!r.rowCount)return res.status(404).json({success:false,message:'CV no encontrado'});const row=r.rows[0];if(row.candidate_id!==req.user.id&&row.company_id!==req.user.id)return res.status(403).json({success:false,message:'Sin permisos'});if(!row.cv)return res.status(404).json({success:false,message:'No hay CV adjunto'});res.json({success:true,url:await createSignedUrl(BUCKET_CV,row.cv,300)});}catch(e){next(e);}};

module.exports={apply,myApplications,jobApplications,updateStatus,getCvUrl};
