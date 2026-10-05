require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { query } = require('./config/db');
const authRoutes = require('./routes/auth');
const jobsRoutes = require('./routes/jobs');
const applicationsRoutes = require('./routes/applications');
const usersRoutes = require('./routes/users');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT || 3001);

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',').map(x => x.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000',10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100',10),
  standardHeaders: true, legacyHeaders: false,
  message: {success:false,message:'Demasiadas solicitudes. Intenta más tarde.'}
});
const authLimiter = rateLimit({windowMs:15*60*1000,max:10,message:{success:false,message:'Demasiados intentos de autenticación. Espera 15 minutos.'}});
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use(compression());
app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true,limit:'2mb'}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', async (req,res) => {
  try {
    await query('SELECT 1');
    res.json({success:true,status:'OK',service:'ZitaJobs API',version:'1.1.0',timestamp:new Date().toISOString(),environment:process.env.NODE_ENV,database:'connected'});
  } catch (err) {
    res.status(503).json({success:false,status:'DEGRADED',service:'ZitaJobs API',database:'unavailable'});
  }
});

app.use('/api/auth',authRoutes);
app.use('/api/jobs',jobsRoutes);
app.use('/api/applications',applicationsRoutes);
app.use('/api/users',usersRoutes);
app.use(notFound);
app.use(errorHandler);

async function init(){
  const schema=fs.readFileSync(path.join(__dirname,'../database/schema.sql'),'utf8');
  await query(schema);
  if(process.env.SEED_DEMO_DATA==='true') {
    const { spawn } = require('child_process');
    const child=spawn(process.execPath,[path.join(__dirname,'../database/seed.js')],{stdio:'inherit',env:process.env});
    child.on('exit',code=>{if(code!==0)console.error('Seed terminó con código',code);});
  }
  app.listen(PORT,'0.0.0.0',()=>console.log(`ZitaJobs API escuchando en 0.0.0.0:${PORT}`));
}

if(require.main===module){
  init().catch(err=>{console.error('No se pudo inicializar la aplicación:',err);process.exit(1);});
}

module.exports=app;
