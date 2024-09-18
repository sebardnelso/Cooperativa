const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000; // Parametrización del puerto

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Crear pool de conexiones a MySQL
const pool = mysql.createPool({
  host: '190.228.29.61',       // Cambia según tu configuración
  user: 'kalel2016',            // Usuario de la base de datos
  password: 'Kalel2016', // Contraseña de la base de datos
  database: 'ausol', // Nombre de la base de datos
  waitForConnections: true,  // Espera a que haya conexiones disponibles
  connectionLimit: 10,       // Límite de conexiones simultáneas
  queueLimit: 0              // Sin límite en la cola de espera
});

// Ruta para manejar login
app.post('/login', (req, res) => {
  console.log('Solicitud de login recibida:', req.body); // Verifica qué datos están llegando al servidor

  const { username, password } = req.body;
  const query = 'SELECT idempleado FROM faemp WHERE username = ? AND password = ?';
  
  pool.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error en la consulta a la base de datos:', err); // Log del error
      return res.status(500).json({ error: 'Error en el servidor al realizar la consulta' });
    }
    
    if (results.length > 0) {
      const idempleado = results[0].idempleado;
      res.json({ success: true, idempleado });
    } else {
      res.json({ success: false, message: 'Credenciales incorrectas' });
    }
  });
});

// Ruta para obtener las zonas
app.get('/zones', (req, res) => {
  const query = 'SELECT * FROM fazon';
  
  pool.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    res.json(results);
  });
});

// Ruta para obtener un cliente por ID
app.get('/client/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT razon, consumo FROM fasoc WHERE id = ?';
  
  pool.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener los datos del cliente' });
    }
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  });
});

// Ruta para actualizar lectura de consumo
app.post('/updateReading', (req, res) => {
  const { nsocio, consumoactual, consumoanterior, consumototal, idempleado } = req.body;

  // Validar que todos los parámetros están presentes
  if (!nsocio || !consumoactual || !consumoanterior || !consumototal || !idempleado) {
    console.error('Faltan parámetros:', { nsocio, consumoactual, consumoanterior, consumototal, idempleado });
    return res.status(400).json({ error: 'Faltan parámetros necesarios' });
  }

  const query = `
    INSERT INTO facon (nsocio, consumoanterior, consumoactual, consumototal, idempleado, fechalectura)
    VALUES (?, ?, ?, ?, ?, NOW());
  `;
  
  pool.query(query, [nsocio, consumoanterior, consumoactual, consumototal, idempleado], (err, result) => {
    if (err) {
      console.error('Error en la inserción:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    // Actualizar el consumo total en la tabla fasoc
    const updateQuery = 'UPDATE fasoc SET consumo = ? WHERE id = ?';
    pool.query(updateQuery, [consumoactual, nsocio], (updateErr) => {
      if (updateErr) {
        console.error('Error en la actualización:', updateErr);
        return res.status(500).json({ error: 'Error actualizando consumo' });
      }
      res.json({ success: true });
    });
  });
});

// Ruta para obtener el siguiente cliente
app.get('/nextClient/:numzona/:orden', (req, res) => {
  const { numzona, orden } = req.params;

  if (!numzona || !orden) {
    return res.status(400).json({ error: 'Faltan parámetros necesarios' });
  }

  const query = `
    SELECT id, orden
    FROM fasoc
    WHERE numzona = ? AND orden > ?
    ORDER BY orden ASC
    LIMIT 1;
  `;
  
  pool.query(query, [numzona, orden], (err, result) => {
    if (err) {
      console.error('Error al obtener el siguiente cliente:', err);
      return res.status(500).json({ error: 'Error al obtener el siguiente cliente' });
    }

    if (result.length > 0) {
      res.json(result[0]); // Retorna el siguiente cliente encontrado
    } else {
      res.json(null); // No hay más clientes
    }
  });
});

// Ruta para obtener clientes por zona
app.get('/clients/:numzona', (req, res) => {
  const { numzona } = req.params;
  const query = 'SELECT * FROM fasoc WHERE numzona = ? ORDER BY orden';
  
  pool.query(query, [numzona], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    res.json(results);
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
