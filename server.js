const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000; // Puerto por defecto

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Crear conexión a la base de datos MySQL directamente
const connection = mysql.createConnection({
  host: '190.228.29.61',       // Cambia según tu configuración
  user: 'kalel2016',            // Usuario de la base de datos
  password: 'Kalel2016', // Contraseña de la base de datos
  database: 'ausol', // Nombre de la base de datos
});

// Probar conexión a la base de datos
connection.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});


// Ruta para manejar login
app.post('/login', (req, res) => {
  console.log('Solicitud de login recibida:', req.body);  // Verifica qué datos están llegando al servidor

  const { username, password } = req.body;
  const query = 'SELECT idempleado FROM faemp WHERE username = ? AND password = ?';
  
  connection.query(query, [username, password], (err, results) => {
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
  connection.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    res.json(results);
  });
});


app.get('/client/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT razon, consumo FROM fasoc WHERE id = ?';
  connection.query(query, [id], (err, results) => {
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
  connection.query(query, [nsocio, consumoanterior, consumoactual, consumototal, idempleado], (err, result) => {
    if (err) {
      console.error('Error en la inserción:', { error: err, query, params: [nsocio, consumoanterior, consumoactual, consumototal, idempleado] });
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    // Actualizar el consumo total en la tabla fasoc
    const updateQuery = 'UPDATE fasoc SET consumo = ? WHERE id = ?';
    connection.query(updateQuery, [consumoactual, nsocio], (updateErr) => {
      if (updateErr) {
        console.error('Error en la actualización:', { error: updateErr, updateQuery, params: [consumototal, nsocio] });
        return res.status(500).json({ error: 'Error actualizando consumo' });
      }
      res.json({ success: true });
    });
  });
});



app.get('/nextClient/:numzona/:orden', (req, res) => {
  const { numzona, orden } = req.params;

  // Validar que los parámetros están presentes y en el formato correcto
  if (!numzona || !orden) {
    console.error('Faltan parámetros:', { numzona, orden });
    return res.status(400).json({ error: 'Faltan parámetros necesarios' });
  }

  const query = `
    SELECT id, orden
    FROM fasoc
    WHERE numzona = ? AND orden > ?
    ORDER BY orden ASC
    LIMIT 1;
  `;

  connection.query(query, [numzona, orden], (err, result) => {
    if (err) {
      console.error('Error al obtener el siguiente cliente:', { error: err, query, params: [numzona, orden] });
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
  connection.query(query, [numzona], (err, results) => {
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
