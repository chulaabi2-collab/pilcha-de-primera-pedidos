# Spec: Sistema de pedidos y stock de "Pilcha de Primera"

Autora: Abigail Canelas

Todas las reglas se aplican en el **backend**. El frontend solo muestra botones que llaman a la API.
Las reglas de fecha y hora usan **hora de Argentina (UTC-3)**, aunque el servidor trabaje en UTC.

## Actores
- **Administradora**: carga prendas y ve todos los pedidos. Se identifica con un token (`Authorization: Bearer <ADMIN_TOKEN>`).
- **Clienta**: ve el catálogo, hace pedidos, paga y cancela los suyos. No necesita token.

## Reglas

### R1. Stock
- No se puede pedir una prenda sin stock suficiente.
- Al crear un pedido se descuenta el stock en ese momento (la prenda queda reservada).
- Si dos personas piden la última unidad a la vez, **solo un pedido prospera**; el otro recibe **409**.

### R2. Reserva de 24 horas
- Un pedido nuevo queda en estado `reservado` y vence a las **24 horas**.
- Si vence sin pagarse, pasa a `vencido` y el stock vuelve a la prenda.
- No se puede pagar un pedido vencido (409).

### R3. Precio
- Subtotal = precio de la prenda x cantidad.
- **Descuento del 10%** si el pedido se hace un **martes** (hora Argentina) o si la clienta es **frecuente** (3 o más pedidos pagados anteriores con el mismo email).
- Los descuentos **no se acumulan**: el máximo es 10%.
- **Envío**: $3.500. **Gratis** si el total con descuento es de $50.000 o más.

### R4. Cancelaciones
- Se puede cancelar un pedido `reservado` o `pagado`. Uno `cancelado` o `vencido` no (409).
- Un pedido `reservado` (no pagado) se cancela **sin penalidad**.
- Un pedido `pagado` cancelado dentro de las **2 horas** desde que se hizo: **sin penalidad**.
- Un pedido `pagado` cancelado **después de 2 horas**: se retiene el **20%** del total.
- Al cancelar, el stock vuelve a la prenda.

### R5. Permisos
- Cargar o modificar prendas y ver todos los pedidos requiere token de administradora (401 si falta o es incorrecto).

## Estados de un pedido
`reservado` -> `pagado` | `cancelado` | `vencido`
`pagado` -> `cancelado`

## Endpoints
| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | /prendas | todas | Catálogo |
| POST | /prendas | admin | Carga una prenda |
| GET | /pedidos | admin | Lista pedidos |
| POST | /pedidos | clienta | Crea pedido (R1, R2, R3) |
| POST | /pedidos/:id/pagar | clienta | Marca pagado |
| POST | /pedidos/:id/cancelar | clienta | Cancela (R4) |
