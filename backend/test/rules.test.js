const test = require('node:test');
const assert = require('node:assert');
const r = require('../src/rules');

// 2026-10-21 es miércoles; 2026-10-20 es martes.
test('martes en Argentina aplica 10% de descuento', () => {
  const martes = new Date('2026-10-20T15:00:00Z'); // 12:00 ART
  const p = r.calcularPrecio({ precioUnitario: 10000, cantidad: 2, fecha: martes });
  assert.strictEqual(p.subtotal, 20000);
  assert.strictEqual(p.descuento, 2000);
  assert.strictEqual(p.envio, 3500);
  assert.strictEqual(p.total, 21500);
});

test('miércoles sin ser frecuente no tiene descuento', () => {
  const miercoles = new Date('2026-10-21T15:00:00Z');
  const p = r.calcularPrecio({ precioUnitario: 10000, cantidad: 1, fecha: miercoles });
  assert.strictEqual(p.descuento, 0);
  assert.strictEqual(p.total, 13500);
});

test('el día se mide en hora Argentina, no UTC (martes 22:30 ART ya es miércoles UTC)', () => {
  const f = new Date('2026-10-21T01:30:00Z'); // martes 20/10 22:30 ART
  assert.strictEqual(r.esMartes(f), true);
});

test('miércoles 00:30 ART ya no es martes', () => {
  const f = new Date('2026-10-21T03:30:00Z'); // miércoles 21/10 00:30 ART
  assert.strictEqual(r.esMartes(f), false);
});

test('clienta frecuente (3 pagados) tiene 10% y no se acumula con martes', () => {
  const martes = new Date('2026-10-20T15:00:00Z');
  const p = r.calcularPrecio({ precioUnitario: 10000, cantidad: 1, fecha: martes, pedidosPagados: 5 });
  assert.strictEqual(p.descuento, 1000);
});

test('envío gratis desde $50.000 con descuento aplicado', () => {
  const miercoles = new Date('2026-10-21T15:00:00Z');
  const p = r.calcularPrecio({ precioUnitario: 50000, cantidad: 1, fecha: miercoles });
  assert.strictEqual(p.envio, 0);
  assert.strictEqual(p.total, 50000);
});

test('si el descuento deja el total debajo de $50.000 se cobra envío', () => {
  const martes = new Date('2026-10-20T15:00:00Z');
  const p = r.calcularPrecio({ precioUnitario: 52000, cantidad: 1, fecha: martes });
  // 52000 - 5200 = 46800 < 50000
  assert.strictEqual(p.envio, 3500);
  assert.strictEqual(p.total, 50300);
});

test('la reserva vence a las 24 horas', () => {
  const creado = new Date('2026-10-21T15:00:00Z');
  assert.strictEqual(r.calcularVencimiento(creado).toISOString(), '2026-10-22T15:00:00.000Z');
});

test('cancelar un pedido no pagado no tiene penalidad', () => {
  const creadoEn = new Date('2026-10-21T10:00:00Z');
  const ahora = new Date('2026-10-21T20:00:00Z');
  assert.strictEqual(r.calcularPenalidad({ estado: 'reservado', total: 10000, creadoEn, ahora }), 0);
});

test('cancelar un pedido pagado dentro de las 2 horas no tiene penalidad', () => {
  const creadoEn = new Date('2026-10-21T10:00:00Z');
  const ahora = new Date('2026-10-21T11:30:00Z');
  assert.strictEqual(r.calcularPenalidad({ estado: 'pagado', total: 10000, creadoEn, ahora }), 0);
});

test('cancelar un pedido pagado después de 2 horas retiene el 20%', () => {
  const creadoEn = new Date('2026-10-21T10:00:00Z');
  const ahora = new Date('2026-10-21T13:00:00Z');
  assert.strictEqual(r.calcularPenalidad({ estado: 'pagado', total: 10000, creadoEn, ahora }), 2000);
});

test('solo se cancelan pedidos reservados o pagados', () => {
  assert.strictEqual(r.puedeCancelar('reservado'), true);
  assert.strictEqual(r.puedeCancelar('pagado'), true);
  assert.strictEqual(r.puedeCancelar('cancelado'), false);
  assert.strictEqual(r.puedeCancelar('vencido'), false);
});
