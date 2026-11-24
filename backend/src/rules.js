// Reglas del negocio en funciones puras (sin base de datos), fáciles de testear.
const PORCENTAJE_DESCUENTO = 10;
const COSTO_ENVIO = 3500;
const ENVIO_GRATIS_DESDE = 50000;
const HORAS_RESERVA = 24;
const HORAS_SIN_PENALIDAD = 2;
const PORCENTAJE_PENALIDAD = 20;
const PEDIDOS_PARA_FRECUENTE = 3;

// El servidor trabaja en UTC; las reglas del negocio, en hora de Argentina (UTC-3).
function diaSemanaArgentina(fecha) {
  const arg = new Date(fecha.getTime() - 3 * 60 * 60 * 1000);
  return arg.getUTCDay(); // 0 domingo ... 2 martes ... 6 sábado
}

function esMartes(fecha) {
  return diaSemanaArgentina(fecha) === 2;
}

function esFrecuente(pedidosPagados) {
  return pedidosPagados >= PEDIDOS_PARA_FRECUENTE;
}

function calcularPrecio({ precioUnitario, cantidad, fecha, pedidosPagados = 0 }) {
  const subtotal = precioUnitario * cantidad;
  const aplicaDescuento = esMartes(fecha) || esFrecuente(pedidosPagados);
  const descuento = aplicaDescuento ? Math.round((subtotal * PORCENTAJE_DESCUENTO) / 100) : 0;
  const conDescuento = subtotal - descuento;
  const envio = conDescuento >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
  return { subtotal, descuento, envio, total: conDescuento + envio };
}

function calcularVencimiento(creadoEn) {
  return new Date(creadoEn.getTime() + HORAS_RESERVA * 60 * 60 * 1000);
}

function calcularPenalidad({ estado, total, creadoEn, ahora }) {
  if (estado !== 'pagado') return 0;
  const horas = (ahora.getTime() - creadoEn.getTime()) / (60 * 60 * 1000);
  if (horas <= HORAS_SIN_PENALIDAD) return 0;
  return Math.round((total * PORCENTAJE_PENALIDAD) / 100);
}

function puedeCancelar(estado) {
  return estado === 'reservado' || estado === 'pagado';
}

module.exports = {
  diaSemanaArgentina,
  esMartes,
  esFrecuente,
  calcularPrecio,
  calcularVencimiento,
  calcularPenalidad,
  puedeCancelar,
};
