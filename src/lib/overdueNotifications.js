export function getOverdueOrderIdsToFlag({ orders = [], shipments = [], now = Date.now(), inFlightOrderIds = new Set() } = {}) {
  const shipmentsByOrderId = new Map(
    shipments
      .filter(shipment => shipment?.orderId)
      .map(shipment => [shipment.orderId, shipment]),
  )
  const seen = new Set()
  const overdueOrderIds = []

  for (const order of orders) {
    if (!order?.id || seen.has(order.id)) continue
    seen.add(order.id)
    if (order.trackingStatus !== 'pending' && order.trackingStatus !== 'paid') continue
    if (order.overdueFlag) continue
    if (inFlightOrderIds.has(order.id)) continue

    const shipment = shipmentsByOrderId.get(order.id)
    if (!shipment?.shipByDeadline) continue

    const deadline = new Date(shipment.shipByDeadline).getTime()
    if (Number.isFinite(deadline) && now > deadline) overdueOrderIds.push(order.id)
  }

  return overdueOrderIds
}
