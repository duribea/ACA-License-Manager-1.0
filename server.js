const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

// Configuración de sesiones antes de cualquier otra configuración de middleware
app.use(session({
    secret: 'akva-connect-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Middleware para parsear JSON y formularios
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Servir archivos estáticos DESPUÉS de la configuración de sesión
app.use(express.static('public', {
    index: false // Importante: no servir index.html automáticamente
}));



// Middleware para verificar autenticación
function requireLogin(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        // Si la petición es AJAX, enviar error 401
        if (req.xhr) {
            res.status(401).json({ error: 'No autorizado' });
        } else {
            res.redirect('/login');
        }
    }
}


// Configuración de la conexión a SQL Server
const config = {
    user: 'sa',
    password: '89709061',
    server: 'localhost\\FISHTALK',
    database: 'AkvaLicenseDB',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Pool de conexiones global
let pool;

// Inicializar el pool de conexiones
async function initializePool() {
    try {
        pool = await sql.connect(config);
        console.log('Conectado a la base de datos SQL Server.');
    } catch (err) {
        console.error('Error al conectar a SQL Server:', err);
        throw err;
    }
}


// Inicializar la conexión
initializePool().catch(console.error);

// Ruta de login
app.get('/login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Ruta principal protegida
app.get('/', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Procesar login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Credenciales hardcodeadas
    if (username === 'admin' && password === 'fishtalk') {
        req.session.userId = 1;
        req.session.username = username;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
});

// Ruta de logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});




// Proteger todas las rutas API
app.use('/api/*', requireLogin);




// Nueva ruta para obtener datos del gráfico
app.get('/api/grafico-centros', async (req, res) => {
    const { clienteId, año, mes } = req.query;
    try {
        let resultados = [];
        
        // Obtener datos para los últimos 4 meses (incluyendo el mes actual)
        for (let i = 0; i < 4; i++) {
            let mesConsulta = parseInt(mes) - i;
            let añoConsulta = parseInt(año);
            
            // Ajustar año si retrocedemos más allá de enero
            if (mesConsulta <= 0) {
                mesConsulta += 12;
                añoConsulta--;
            }

            const query = `
                SELECT 
                    sa.NombreSistema,
                    COUNT(*) as Total
                FROM EstadoMensualCentros emc
                JOIN Centros c ON emc.CentroID = c.CentroID
                JOIN SistemasAlimentacion sa ON COALESCE(emc.SistemaID, c.SistemaID) = sa.SistemaID
                WHERE emc.Año = ${añoConsulta}
                AND emc.Mes = ${mesConsulta}
                AND emc.EstadoID = 1  -- Solo centros "Integrando"
                AND emc.CentroConAnalytics = 1  -- Solo centros con Analytics
                ${clienteId !== 'todos' ? `AND c.ClienteID = ${clienteId}` : ''}
                GROUP BY sa.NombreSistema
            `;

            const result = await sql.query(query);
            
            const sistemas = {
                'AKVA Connect 2': 0,
                'AKVA Connect 4': 0,
                'AKVA Control': 0
            };

            result.recordset.forEach(row => {
                sistemas[row.NombreSistema] = row.Total;
            });

            resultados.push({
                mes: mesConsulta,
                año: añoConsulta,
                sistemas
            });
        }

        // Invertir el orden para que el mes más reciente aparezca al final
        resultados.reverse();
        
        res.json(resultados);
    } catch (err) {
        console.error('Error al obtener datos para el gráfico:', err);
        res.status(500).json({ error: err.message });
    }
});


// Ruta para obtener todos los clientes con detalles completos
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.request().query`
      SELECT 
        ClienteID,
        NombreCliente,
        CASE 
          WHEN FechaExpiracionLicencia = '1900-01-01' THEN NULL 
          ELSE FORMAT(FechaExpiracionLicencia, 'dd-MM-yyyy') 
        END as FechaExpiracionLicencia,
        VersionAnalytics,
        VersionConnector,
        VersionAdapter,
        CASE 
          WHEN FechaActualizacion = '1900-01-01' THEN NULL 
          ELSE FORMAT(FechaActualizacion, 'dd-MM-yyyy') 
        END as FechaActualizacion
      FROM Clientes
    `;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({"error": err.message});
  }
});

// Ruta para obtener los centros de un cliente
app.get('/api/centros/:clienteId', async (req, res) => {
    try {
        console.log("Inicio de la función cargarCentros");
        console.log('Cliente ID recibido:', req.params.clienteId);
        const clienteId = req.params.clienteId;

        // Crear una nueva instancia de sql.Request para cada consulta
        const request = new sql.Request(pool);
        request.input('ClienteID', sql.Int, clienteId); // No duplicar 'ClienteID' en el mismo request

        const result = await request.query(`
            SELECT 
                cl.NombreCliente,
                c.NombreCentro,
                c.NombrePonton,
                sa.NombreSistema,
                c.VersionSistema,
                FORMAT(c.FechaInstalacionACA, 'yyyy-MM-dd') as FechaInstalacionACA,
                FORMAT(c.FechaTermino, 'yyyy-MM-dd') as FechaTermino,
                c.CentroID
            FROM Centros c
            JOIN SistemasAlimentacion sa ON c.SistemaID = sa.SistemaID
            JOIN Clientes cl ON c.ClienteID = cl.ClienteID
            WHERE c.ClienteID = @ClienteID;
        `);
        console.log('Resultado de la consulta:', result.recordset);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener centros:', err);
        res.status(500).json({ "error": err.message });
    }
});

// Ruta para añadir un nuevo cliente
app.post('/api/clientes', async (req, res) => {
    const { 
        NombreCliente, 
        FechaExpiracionLicencia,
        VersionAnalytics,
        VersionConnector,
        VersionAdapter,
        FechaActualizacion
    } = req.body;
    
    try {
        const clienteExistente = await pool.request().query`
            SELECT * FROM Clientes WHERE NombreCliente = ${NombreCliente}
        `;
        
        if (clienteExistente.recordset.length > 0) {
            return res.status(400).json({"error": "Ya existe un cliente con ese nombre"});
        }

        const result = await pool.request().query`
            INSERT INTO Clientes (
                NombreCliente, 
                FechaExpiracionLicencia,
                VersionAnalytics,
                VersionConnector,
                VersionAdapter,
                FechaActualizacion
            )
            VALUES (
                ${NombreCliente},
                ${FechaExpiracionLicencia || null},
                ${VersionAnalytics},
                ${VersionConnector},
                ${VersionAdapter},
                ${FechaActualizacion || null}
            );
            SELECT SCOPE_IDENTITY() AS ClienteID;
        `;
        
        res.json({
            "success": true,
            "message": "Cliente añadido con éxito",
            "clienteId": result.recordset[0].ClienteID
        });
    } catch (err) {
        res.status(500).json({"error": err.message});
    }
});

// Ruta para actualizar un cliente
app.put('/api/clientes/:clienteId', async (req, res) => {
  const { 
    NombreCliente, 
    FechaExpiracionLicencia,
    VersionAnalytics,
    VersionConnector,
    VersionAdapter,
    FechaActualizacion
  } = req.body;
  
  try {
    await pool.request().query`
      UPDATE Clientes
      SET 
        NombreCliente = ${NombreCliente},
        FechaExpiracionLicencia = ${FechaExpiracionLicencia || null},
        VersionAnalytics = ${VersionAnalytics},
        VersionConnector = ${VersionConnector},
        VersionAdapter = ${VersionAdapter},
        FechaActualizacion = ${FechaActualizacion || null}
      WHERE ClienteID = ${req.params.clienteId}
    `;
    
    res.json({ success: true, message: "Cliente actualizado con éxito" });
  } catch (err) {
    res.status(500).json({"error": err.message});
  }
});

// Ruta para añadir un nuevo centro
app.post('/api/centros', async (req, res) => {
    const { ClienteID, NombreCentro, NombrePonton, SistemaID, VersionSistema, FechaInstalacionACA, FechaTermino } = req.body;
    try {
        const checkRequest = new sql.Request(pool);
        checkRequest.input('ClienteID', sql.Int, ClienteID);
        checkRequest.input('NombreCentro', sql.NVarChar, NombreCentro);

        const centroExistente = await checkRequest.query(`
            SELECT * FROM Centros 
            WHERE ClienteID = @ClienteID AND NombreCentro = @NombreCentro
        `);

        if (centroExistente.recordset.length > 0) {
            return res.status(400).json({ "error": "Ya existe un centro con ese nombre para este cliente" });
        }

        const insertRequest = new sql.Request(pool);
        insertRequest.input('ClienteID', sql.Int, ClienteID);
        insertRequest.input('NombreCentro', sql.NVarChar, NombreCentro);
        insertRequest.input('NombrePonton', sql.NVarChar, NombrePonton);
        insertRequest.input('SistemaID', sql.Int, SistemaID);
        insertRequest.input('VersionSistema', sql.NVarChar, VersionSistema);
        insertRequest.input('FechaInstalacionACA', sql.Date, FechaInstalacionACA);
        insertRequest.input('FechaTermino', sql.Date, FechaTermino);

        const result = await insertRequest.query(`
            INSERT INTO Centros (ClienteID, NombreCentro, NombrePonton, SistemaID, VersionSistema, FechaInstalacionACA, FechaTermino)
            OUTPUT INSERTED.CentroID
            VALUES (@ClienteID, @NombreCentro, @NombrePonton, @SistemaID, @VersionSistema, @FechaInstalacionACA, @FechaTermino)
        `);

        res.json({
            success: true,
            message: "Centro añadido con éxito",
            CentroID: result.recordset[0].CentroID
        });
    } catch (err) {
        console.error('Error al añadir centro:', err);
        res.status(500).json({ "error": err.message });
    }
});

// Ruta para actualizar un centro
app.put('/api/centros/:centroId', async (req, res) => {
  const { NombreCentro, NombrePonton, SistemaID, VersionSistema, FechaInstalacionACA, FechaTermino } = req.body;
  try {
    const request = pool.request();
    await request
      .input('CentroID', sql.Int, req.params.centroId)
      .input('NombreCentro', sql.NVarChar, NombreCentro)
      .input('NombrePonton', sql.NVarChar, NombrePonton)
      .input('SistemaID', sql.Int, SistemaID)
      .input('VersionSistema', sql.NVarChar, VersionSistema)
      .input('FechaInstalacionACA', sql.Date, FechaInstalacionACA)
      .input('FechaTermino', sql.Date, FechaTermino)
      .query`
        UPDATE Centros
        SET NombreCentro = @NombreCentro,
            NombrePonton = @NombrePonton,
            SistemaID = @SistemaID,
            VersionSistema = @VersionSistema,
            FechaInstalacionACA = @FechaInstalacionACA,
            FechaTermino = @FechaTermino
        WHERE CentroID = @CentroID
      `;
    res.json({ success: true, message: "Centro actualizado con éxito" });
  } catch (err) {
    console.error('Error al actualizar centro:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para obtener el estado mensual de los centros
app.get('/api/estado-mensual', async (req, res) => {
  const { clienteId, año, mes } = req.query;
  try {
    const request = pool.request();
    request.input('Año', sql.Int, año);
    request.input('Mes', sql.Int, mes);

    // Determinar el período anterior
    let añoAnterior = parseInt(año);
    let mesAnterior = parseInt(mes) - 1;
    if (mesAnterior === 0) {
      mesAnterior = 12;
      añoAnterior--;
    }

    request.input('AñoAnterior', sql.Int, añoAnterior);
    request.input('MesAnterior', sql.Int, mesAnterior);

    // Construir la consulta SQL según el valor de clienteId
    let query = `
      WITH DatosPeriodoAnterior AS (
        SELECT 
          CentroID,
          EstadoID as EstadoIDAnterior,
          CentroConAnalytics as CentroConAnalyticsAnterior,
          SistemaID as SistemaIDAnterior,
          VersionSistema as VersionSistemaAnterior
        FROM EstadoMensualCentros
        WHERE Año = @AñoAnterior AND Mes = @MesAnterior
      )
      SELECT 
        cl.NombreCliente,
        c.NombreCentro,
        c.NombrePonton,
        sa.NombreSistema,
        c.VersionSistema,
        COALESCE(emc.VersionSistema, dpa.VersionSistemaAnterior, c.VersionSistema) as VersionSistemaMensual,
        FORMAT(c.FechaInstalacionACA, 'yyyy-MM-dd') as FechaInstalacionACA,
        FORMAT(c.FechaTermino, 'yyyy-MM-dd') as FechaTermino,
        COALESCE(emc.EstadoID, dpa.EstadoIDAnterior, 1) as EstadoID,
        COALESCE(emc.CentroConAnalytics, dpa.CentroConAnalyticsAnterior, 0) as CentroConAnalytics,
        emc.Comentarios,
        COALESCE(emc.SistemaID, dpa.SistemaIDAnterior, c.SistemaID) as SistemaIDMensual,
        c.CentroID
      FROM Centros c
      JOIN Clientes cl ON c.ClienteID = cl.ClienteID
      LEFT JOIN EstadoMensualCentros emc ON c.CentroID = emc.CentroID 
        AND emc.Año = @Año 
        AND emc.Mes = @Mes
      LEFT JOIN DatosPeriodoAnterior dpa ON c.CentroID = dpa.CentroID
      LEFT JOIN SistemasAlimentacion sa ON COALESCE(emc.SistemaID, dpa.SistemaIDAnterior, c.SistemaID) = sa.SistemaID
      WHERE c.FechaInstalacionACA <= EOMONTH(DATEFROMPARTS(@Año, @Mes, 1))
        AND (c.FechaTermino IS NULL OR c.FechaTermino >= DATEFROMPARTS(@Año, @Mes, 1))
    `;

    // Solo filtrar por cliente si clienteId no es "todos"
    if (clienteId !== 'todos') {
      query += ` AND c.ClienteID = @ClienteID`;
      request.input('ClienteID', sql.Int, clienteId);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener estado mensual:', err);
    res.status(500).json({ "error": err.message });
  }
});

// Ruta para obtener datos del gráfico de los últimos 3 meses
app.get('/api/estado-mensual', async (req, res) => {
    const { mes, año, clienteId } = req.query;

    if (!mes || !año || !clienteId) {
        return res.status(400).json({ error: 'Mes, año y clienteId son requeridos.' });
    }

    try {
        const result = await pool.request()
            .input('ClienteID', sql.Int, clienteId)
            .input('Año', sql.Int, año)
            .input('Mes', sql.Int, mes)
            .query(`
                SELECT 
                    sa.NombreSistema,
                    COUNT(c.CentroID) as Total
                FROM Centros c
                JOIN SistemasAlimentacion sa ON c.SistemaID = sa.SistemaID
                WHERE c.ClienteID = @ClienteID
                AND YEAR(c.FechaInstalacionACA) = @Año
                AND MONTH(c.FechaInstalacionACA) = @Mes
                GROUP BY sa.NombreSistema
            `);

        const responseData = {
            akvaConnect2: result.recordset.filter(r => r.NombreSistema === 'AKVA Connect 2').map(r => r.Total)[0] || 0,
            akvaConnect4: result.recordset.filter(r => r.NombreSistema === 'AKVA Connect 4').map(r => r.Total)[0] || 0,
            akvaControl: result.recordset.filter(r => r.NombreSistema === 'AKVA Control').map(r => r.Total)[0] || 0
        };

        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Ruta para actualizar o insertar el estado mensual de un centro
app.post('/api/estado-mensual', async (req, res) => {
  const estados = req.body;
  let transaction;
  
  try {
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    for (const estado of estados) {
      const request = new sql.Request(transaction);
      
      // Primero verificar si existe un registro para este centro en este período
      const existingRecord = await request
        .input('CentroID', sql.Int, estado.CentroID)
        .input('Año', sql.Int, estado.Año)
        .input('Mes', sql.Int, estado.Mes)
        .query(`
          SELECT * FROM EstadoMensualCentros 
          WHERE CentroID = @CentroID AND Año = @Año AND Mes = @Mes
        `);

      // Crear un nuevo request para la operación de inserción/actualización
      const updateRequest = new sql.Request(transaction);
      
      if (existingRecord.recordset.length > 0) {
        // Actualizar registro existente
        await updateRequest
          .input('CentroID', sql.Int, estado.CentroID)
          .input('Año', sql.Int, estado.Año)
          .input('Mes', sql.Int, estado.Mes)
          .input('EstadoID', sql.Int, estado.EstadoID)
          .input('CentroConAnalytics', sql.Bit, estado.CentroConAnalytics)
          .input('Comentarios', sql.NVarChar(sql.MAX), estado.Comentarios)
          .input('SistemaID', sql.Int, estado.SistemaID)
          .input('VersionSistema', sql.NVarChar(50), estado.VersionSistema)
          .query(`
            UPDATE EstadoMensualCentros
            SET EstadoID = @EstadoID,
                CentroConAnalytics = @CentroConAnalytics,
                Comentarios = @Comentarios,
                SistemaID = @SistemaID,
                VersionSistema = @VersionSistema
            WHERE CentroID = @CentroID AND Año = @Año AND Mes = @Mes
          `);
      } else {
        // Insertar nuevo registro
        await updateRequest
          .input('CentroID', sql.Int, estado.CentroID)
          .input('Año', sql.Int, estado.Año)
          .input('Mes', sql.Int, estado.Mes)
          .input('EstadoID', sql.Int, estado.EstadoID)
          .input('CentroConAnalytics', sql.Bit, estado.CentroConAnalytics)
          .input('Comentarios', sql.NVarChar(sql.MAX), estado.Comentarios)
          .input('SistemaID', sql.Int, estado.SistemaID)
          .input('VersionSistema', sql.NVarChar(50), estado.VersionSistema)
          .query(`
            INSERT INTO EstadoMensualCentros 
            (CentroID, Año, Mes, EstadoID, CentroConAnalytics, Comentarios, SistemaID, VersionSistema)
            VALUES 
            (@CentroID, @Año, @Mes, @EstadoID, @CentroConAnalytics, @Comentarios, @SistemaID, @VersionSistema)
          `);
      }
    }
    
    await transaction.commit();
    res.json({ success: true, message: "Estados mensuales actualizados con éxito" });
  } catch (err) {
    console.error('Error al actualizar estados mensuales:', err);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Error durante el rollback:', rollbackErr);
      }
    }
    res.status(500).json({"error": "Error al actualizar estados mensuales: " + err.message});
  }
});


// Ruta para obtener los años disponibles
app.get('/api/años', async (req, res) => {
  try {
    const result = await pool.request().query`SELECT * FROM Años ORDER BY Año DESC`;
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error al obtener años:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para obtener los sistemas de alimentación
app.get('/api/sistemas-alimentacion', async (req, res) => {
  try {
    const result = await pool.request().query`SELECT * FROM SistemasAlimentacion`;
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error al obtener sistemas de alimentación:', err);
    res.status(500).json({"error": err.message});
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Proceso de limpieza al cerrar la aplicación
process.on('SIGINT', async () => {
  try {
    if (pool) {
      await pool.close();
      console.log('Pool de conexiones cerrado correctamente');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error al cerrar el pool de conexiones:', err);
    process.exit(1);
  }
});


// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});


