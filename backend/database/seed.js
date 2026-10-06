require("dotenv").config();
const bcrypt = require("bcryptjs");
const { query, pool } = require("../src/config/db");

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.log(
      "Seed omitido: no se cargan datos de demostración en producción.",
    );
    return;
  }

  const existing = await query("SELECT COUNT(*)::int AS count FROM users");
  if (existing.rows[0].count > 0) {
    console.log("Seed omitido: ya existen usuarios.");
    return;
  }

  const hashCompany1 = await bcrypt.hash("empresa123", 12);
  const hashCompany2 = await bcrypt.hash("empresa456", 12);
  const hashCandidate = await bcrypt.hash("candidato123", 12);

  const c1 = await query(
    `INSERT INTO users
    (name,email,password,role,company_name,sector,description,phone,website,verified)
    VALUES ($1,$2,$3,'empresa',$4,$5,$6,$7,$8,true) RETURNING id`,
    [
      "Grupo Industrial del Valle",
      "rrhh@grupovalle.mx",
      hashCompany1,
      "Grupo Industrial del Valle",
      "Manufactura",
      "Empresa líder en manufactura metalmecánica con más de 20 años en Zitácuaro.",
      "715-123-4567",
      "https://grupovalle.mx",
    ],
  );
  const c2 = await query(
    `INSERT INTO users
    (name,email,password,role,company_name,sector,description,phone,website,verified)
    VALUES ($1,$2,$3,'empresa',$4,$5,$6,$7,$8,true) RETURNING id`,
    [
      "Tech Zitácuaro S.A.",
      "rrhh@techzitacuaro.mx",
      hashCompany2,
      "Tech Zitácuaro S.A.",
      "Tecnología",
      "Startup de tecnología y desarrollo de software orientada al sector regional.",
      "715-654-3210",
      "https://techzita.mx",
    ],
  );
  await query(
    `INSERT INTO users
    (name,email,password,role,phone,skills,experience,education)
    VALUES ($1,$2,$3,'candidato',$4,$5,$6,$7)`,
    [
      "María González López",
      "maria@example.com",
      hashCandidate,
      "715-987-6543",
      JSON.stringify(["JavaScript", "Excel", "Atención al cliente"]),
      "2 años en ventas y atención al cliente",
      "Licenciatura en Administración - UNAM",
    ],
  );

  const jobs = [
    [
      c1.rows[0].id,
      "Operador de Maquinaria CNC",
      "Manufactura",
      "Tiempo completo",
      "$9,500 - $12,000 MXN/mes",
      "Zitácuaro, Michoacán",
      "Buscamos operador de maquinaria CNC con experiencia mínima de 2 años. Responsable del manejo de tornos y fresadoras de control numérico.",
      [
        "2 años de experiencia en maquinaria CNC",
        "Conocimiento en programación G-code",
        "Preparatoria terminada o carrera técnica",
        "Disponibilidad de horario",
      ],
      [
        "IMSS",
        "Infonavit",
        "Aguinaldo",
        "Vacaciones según ley",
        "Comedor subsidiado",
      ],
      "Lunes a Viernes 7:00 - 16:00",
      245,
    ],
    [
      c1.rows[0].id,
      "Auxiliar Administrativo",
      "Administración",
      "Tiempo completo",
      "$7,000 - $9,000 MXN/mes",
      "Zitácuaro, Michoacán",
      "Apoyo en funciones administrativas, manejo de documentación, atención telefónica y coordinación con proveedores.",
      [
        "Experiencia mínima 1 año",
        "Manejo de Office (Excel, Word)",
        "Facilidad de palabra",
        "Licenciatura trunca o terminada en Administración o afín",
      ],
      ["IMSS", "Infonavit", "Aguinaldo", "Bonos por desempeño"],
      "Lunes a Viernes 8:00 - 17:00",
      189,
    ],
    [
      c2.rows[0].id,
      "Desarrollador Web Full Stack",
      "Tecnología",
      "Tiempo completo",
      "$15,000 - $22,000 MXN/mes",
      "Zitácuaro, Michoacán (Remoto parcial)",
      "Desarrollador para proyectos web modernos con stack JavaScript. Trabajarás en aplicaciones web para clientes locales y nacionales.",
      [
        "2+ años experiencia en React o Vue.js",
        "Conocimiento de Node.js / Express",
        "Bases de datos SQL o NoSQL",
        "Git y control de versiones",
      ],
      [
        "IMSS",
        "Aguinaldo",
        "Home Office 2 días/semana",
        "Capacitación continua",
        "Equipo de trabajo",
      ],
      "Lunes a Viernes 9:00 - 18:00",
      412,
    ],
    [
      c2.rows[0].id,
      "Diseñador Gráfico UX/UI",
      "Diseño",
      "Medio tiempo",
      "$8,000 - $12,000 MXN/mes",
      "Zitácuaro, Michoacán",
      "Diseño de interfaces digitales, identidad de marca y materiales gráficos para clientes de la región.",
      [
        "Portfolio de proyectos (requerido)",
        "Figma / Adobe XD",
        "Illustrator y Photoshop",
        "Buena comunicación visual",
      ],
      ["IMSS", "Horario flexible", "Proyectos creativos", "Ambiente dinámico"],
      "Lunes a Jueves 9:00 - 14:00",
      203,
    ],
    [
      c1.rows[0].id,
      "Supervisor de Producción",
      "Manufactura",
      "Tiempo completo",
      "$13,000 - $17,000 MXN/mes",
      "Zitácuaro, Michoacán",
      "Supervisión de líneas de producción, control de calidad, gestión de personal operativo y reporte de indicadores.",
      [
        "Ingeniería Industrial o afín",
        "3 años mínimo supervisando personal",
        "Conocimiento en manufactura",
        "Liderazgo y resolución de problemas",
      ],
      [
        "IMSS",
        "Infonavit",
        "Auto de empresa",
        "Bonos por productividad",
        "Plan de carrera",
      ],
      "Lunes a Sábado 6:00 - 14:00",
      178,
    ],
  ];
  for (const j of jobs) {
    await query(
      `INSERT INTO jobs (company_id,title,category,type,salary,location,description,requirements,benefits,schedule,views,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [
        j[0],
        j[1],
        j[2],
        j[3],
        j[4],
        j[5],
        j[6],
        JSON.stringify(j[7]),
        JSON.stringify(j[8]),
        j[9],
        j[10],
      ],
    );
  }
  console.log("Seed de demostración creado.");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
