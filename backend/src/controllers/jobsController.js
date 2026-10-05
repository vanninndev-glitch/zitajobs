const { query } = require('../config/db');
const { publicUrl, BUCKET_LOGOS } = require('../config/storage');

const parseJsonArray = (v) => Array.isArray(v) ? v : (v ? String(v).split('\n').map(x => x.trim()).filter(Boolean) : []);
const mapJob = (r) => ({
  id:r.id, companyId:r.company_id, title:r.title, category:r.category, type:r.type, salary:r.salary,
  location:r.location, description:r.description, requirements:r.requirements || [], benefits:r.benefits || [],
  schedule:r.schedule, active:r.active, views:r.views, createdAt:r.created_at, updatedAt:r.updated_at
});
const company = (r) => r.company_id ? { id:r.company_id, name:r.company_name, logo:r.logo ? publicUrl(BUCKET_LOGOS, r.logo) : null, sector:r.sector, website:r.website, phone:r.phone } : null;

const getJobs = async (req,res,next) => {
  try {
    const { q, category, type } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1',10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10',10)));
    const where = ['j.active=true']; const params=[];
    if(q){ params.push(`%${q}%`); where.push(`(j.title ILIKE $${params.length} OR j.description ILIKE $${params.length} OR j.category ILIKE $${params.length})`); }
    if(category){ params.push(category); where.push(`lower(j.category)=lower($${params.length})`); }
    if(type){ params.push(type); where.push(`lower(j.type)=lower($${params.length})`); }
    const whereSql = where.join(' AND ');
    const count = await query(`SELECT COUNT(*)::int AS total FROM jobs j WHERE ${whereSql}`, params);
    params.push(limit, (page-1)*limit);
    const rows = await query(`SELECT j.*,u.company_name,u.logo,u.sector,u.website,u.phone FROM jobs j JOIN users u ON u.id=j.company_id WHERE ${whereSql} ORDER BY j.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params);
    const total = count.rows[0].total;
    res.json({success:true,jobs:rows.rows.map(r=>({...mapJob(r),company:company(r)})),total,totalPages:Math.ceil(total/limit),page});
  } catch(err){next(err);}
};

const getJob = async (req,res,next) => { try {
  const result = await query(`UPDATE jobs SET views=views+1 WHERE id=$1 AND active=true RETURNING *`, [req.params.id]);
  if(!result.rowCount) return res.status(404).json({success:false,message:'Empleo no encontrado'});
  const row = await query(`SELECT j.*,u.company_name,u.logo,u.sector,u.website,u.phone FROM jobs j JOIN users u ON u.id=j.company_id WHERE j.id=$1`,[req.params.id]);
  res.json({success:true,job:{...mapJob(row.rows[0]),company:company(row.rows[0])}});
} catch(err){next(err);} };

const createJob = async (req,res,next) => { try {
  const {title,category,type,salary,location,description,requirements,benefits,schedule}=req.body;
  if(!title||!description||!category) return res.status(400).json({success:false,message:'Título, descripción y categoría son requeridos'});
  const r=await query(`INSERT INTO jobs(company_id,title,category,type,salary,location,description,requirements,benefits,schedule)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[req.user.id,title,category,type||'Tiempo completo',salary||'A convenir',location||'Zitácuaro, Michoacán',description,JSON.stringify(parseJsonArray(requirements)),JSON.stringify(parseJsonArray(benefits)),schedule||'A definir']);
  res.status(201).json({success:true,message:'Oferta de trabajo publicada',job:mapJob(r.rows[0])});
} catch(err){next(err);} };

const updateJob = async (req,res,next) => { try {
  const allowed=['title','category','type','salary','location','description','schedule','active']; const sets=[]; const vals=[];
  allowed.forEach(k=>{if(req.body[k]!==undefined){vals.push(req.body[k]);sets.push(`${k}=$${vals.length}`);}});
  if(req.body.requirements!==undefined){vals.push(JSON.stringify(parseJsonArray(req.body.requirements)));sets.push(`requirements=$${vals.length}`);}
  if(req.body.benefits!==undefined){vals.push(JSON.stringify(parseJsonArray(req.body.benefits)));sets.push(`benefits=$${vals.length}`);}
  if(!sets.length)return res.status(400).json({success:false,message:'No hay cambios'});
  vals.push(new Date(),req.params.id,req.user.id);
  const r=await query(`UPDATE jobs SET ${sets.join(',')},updated_at=$${vals.length-2} WHERE id=$${vals.length-1} AND company_id=$${vals.length} RETURNING *`,vals);
  if(!r.rowCount)return res.status(404).json({success:false,message:'Oferta no encontrada o sin permisos'});
  res.json({success:true,message:'Oferta actualizada',job:mapJob(r.rows[0])});
} catch(err){next(err);} };

const deleteJob=async(req,res,next)=>{try{const r=await query('UPDATE jobs SET active=false,updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({success:false,message:'Oferta no encontrada o sin permisos'});res.json({success:true,message:'Oferta eliminada correctamente'});}catch(e){next(e);}};

const getMyJobs=async(req,res,next)=>{try{const r=await query(`SELECT j.*,COUNT(a.id)::int AS applications_count FROM jobs j LEFT JOIN applications a ON a.job_id=j.id WHERE j.company_id=$1 GROUP BY j.id ORDER BY j.created_at DESC`,[req.user.id]);res.json({success:true,jobs:r.rows.map(x=>({...mapJob(x),applicationsCount:x.applications_count}))});}catch(e){next(e);}};

module.exports={getJobs,getJob,createJob,updateJob,deleteJob,getMyJobs};
