require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const rules = require('./rules');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

function soloAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token de administradora requerido' });
  }
  next();
}

// R2: los pedidos reservados que vencieron pasan a "vencido" y devuelven el stock.
async function liberarVencidos(client) {
  const vencidos = await client.query(
    `UPDATE pedidos SET estado = 'vencido'
     WHERE estado = 'reservado' AND vence_en < now()
     RETURNING prenda_id, cantidad`
  );
  for (const p of vencidos.rows) {
    await client.query('UPDATE prendas SET stock = stock + $1 WHERE id = $2', [p.cantidad, p.prenda_id]);
  }
}

app.get('/prendas', async (req, res) => {
  const r = await pool.query('SELECT * FROM prendas ORDER BY id');
  res.json(r.rows);
});

app.post('/prendas', soloAdmin, async (req, res) => {
  const { nombre, precio, stock } = req.body;
  if (!nombre || !Number.isInteger(precio) || precio <= 0 || !Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: 'nombre, precio (entero > 0) y stock (entero >= 0) son obligatorios' });
  }
  const r = await pool.query(
    'INSERT INTO prendas (nombre, precio, stock) VALUES ($1, $2, $3) RETURNING *',
    [nombre, precio, stock]
  );
  res.status(201).json(r.rows[0]);
});

app.get('/pedidos', soloAdmin, async (req, res) => {
  const r = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
  res.json(r.rows);
});

// R1 + R2 + R3
app.post('/pedidos', async (req, res) => {
  const { prendaId, cantidad, cliente, email } = req.body;
  if (!Number.isInteger(prendaId) || !Number.isInteger(cantidad) || cantidad <= 0 || !cliente || !email) {
    return res.status(400).json({ error: 'prendaId, cantidad (entero > 0), cliente y email son obligatorios' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await liberarVencidos(client);

    // Descuento atómico: si dos piden la última unidad, solo una actualiza una fila.
    const upd = await client.query(
      'UPDATE prendas SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING precio',
      [prendaId, cantidad]
    );
    if (upd.rowCount === 0) {
      const existe = await client.query('SELECT 1 FROM prendas WHERE id = $1', [prendaId]);
      await client.query('ROLLBACK');
      return existe.rowCount === 0
        ? res.status(404).json({ error: 'La prenda no existe' })
        : res.status(409).json({ error: 'Stock insuficiente' });
    }

    const pagados = await client.query(
      "SELECT count(*)::int AS n FROM pedidos WHERE email = $1 AND estado = 'pagado'",
      [email]
    );
    const ahora = new Date();
    const precio = rules.calcularPrecio({
      precioUnitario: upd.rows[0].precio,
      cantidad,
      fecha: ahora,
      pedidosPagados: pagados.rows[0].n,
    });
    const ins = await client.query(
      `INSERT INTO pedidos (prenda_id, cantidad, cliente, email, subtotal, descuento, envio, total, creado_en, vence_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [prendaId, cantidad, cliente, email, precio.subtotal, precio.descuento, precio.envio, precio.total,
       ahora, rules.calcularVencimiento(ahora)]
    );
    await client.query('COMMIT');
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

app.post('/pedidos/:id/pagar', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await liberarVencidos(client);
    const r = await client.query(
      `UPDATE pedidos SET estado = 'pagado', pagado_en = now()
       WHERE id = $1 AND estado = 'reservado' RETURNING *`,
      [req.params.id]
    );
    await client.query('COMMIT');
    if (r.rowCount === 0) {
      return res.status(409).json({ error: 'El pedido no existe o no se puede pagar (vencido, cancelado o ya pagado)' });
    }
    res.json(r.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// R4
app.post('/pedidos/:id/cancelar', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await liberarVencidos(client);
    const found = await client.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (found.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El pedido no existe' });
    }
    const p = found.rows[0];
    if (!rules.puedeCancelar(p.estado)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `No se puede cancelar un pedido ${p.estado}` });
    }
    const penalidad = rules.calcularPenalidad({
      estado: p.estado, total: p.total, creadoEn: new Date(p.creado_en), ahora: new Date(),
    });
    await client.query('UPDATE prendas SET stock = stock + $1 WHERE id = $2', [p.cantidad, p.prenda_id]);
    const r = await client.query(
      "UPDATE pedidos SET estado = 'cancelado', penalidad = $2 WHERE id = $1 RETURNING *",
      [p.id, penalidad]
    );
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

module.exports = app;
