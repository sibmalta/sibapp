import React from 'react'
import {
  Clock, Package, Truck, MapPin, CheckCircle, XCircle, RotateCcw, Box,
} from 'lucide-react'

const HOME_DELIVERY_STEPS = [
  { key: 'awaiting_shipment', label: 'Awaiting collection', icon: Clock },
  { key: 'shipped', label: 'Collected', icon: Package },
  { key: 'in_transit', label: 'In transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
]

const LOCKER_COLLECTION_STEPS = [
  { key: 'awaiting_shipment', label: 'Awaiting collection', icon: Clock },
  { key: 'shipped', label: 'Collected', icon: Package },
  { key: 'in_transit', label: 'In transit', icon: Truck },
  { key: 'ready_for_collection', label: 'Ready for collection', icon: Box },
  { key: 'collected', label: 'Collected', icon: CheckCircle },
]

const TERMINAL_STATES = {
  failed_delivery: { label: 'Failed delivery', icon: XCircle, color: 'bg-red-500' },
  returned: { label: 'Returned', icon: RotateCcw, color: 'bg-orange-500' },
}

export const SHIPMENT_STATUS_CONFIG = {
  awaiting_shipment: { label: 'Awaiting collection', color: 'bg-yellow-50 text-yellow-700', dotColor: 'bg-yellow-500' },
  shipped: { label: 'Collected', color: 'bg-blue-50 text-blue-700', dotColor: 'bg-blue-500' },
  in_transit: { label: 'In transit', color: 'bg-indigo-50 text-indigo-700', dotColor: 'bg-indigo-500' },
  delivered: { label: 'Delivered', color: 'bg-green-50 text-green-700', dotColor: 'bg-green-500' },
  ready_for_collection: { label: 'Ready for collection', color: 'bg-teal-50 text-teal-700', dotColor: 'bg-teal-500' },
  collected: { label: 'Collected', color: 'bg-green-50 text-green-700', dotColor: 'bg-green-500' },
  failed_delivery: { label: 'Failed delivery', color: 'bg-red-50 text-red-600', dotColor: 'bg-red-500' },
  returned: { label: 'Returned', color: 'bg-orange-50 text-orange-700', dotColor: 'bg-orange-500' },
}

function getStepsForShipment(shipment) {
  if (shipment.deliveryType === 'locker_collection') return LOCKER_COLLECTION_STEPS
  return HOME_DELIVERY_STEPS
}

export default function ShipmentTracker({ shipment }) {
  if (!shipment) return null

  const isTerminal = !!TERMINAL_STATES[shipment.status]
  const steps = getStepsForShipment(shipment)
  const currentIdx = steps.findIndex(s => s.key === shipment.status)

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${SHIPMENT_STATUS_CONFIG[shipment.status]?.dotColor || 'bg-gray-400'}`} />
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SHIPMENT_STATUS_CONFIG[shipment.status]?.color || 'bg-gray-100 text-gray-600'}`}>
          {SHIPMENT_STATUS_CONFIG[shipment.status]?.label || shipment.status}
        </span>
      </div>

      {/* Step tracker (normal flow) */}
      {!isTerminal && (
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const done = i <= currentIdx
            const active = i === currentIdx
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    done ? 'bg-sib-primary' : 'bg-sib-stone'
                  }`}>
                    <step.icon size={16} className={done ? 'text-white' : 'text-sib-muted'} />
                  </div>
                  <p className={`text-[10px] font-medium mt-1.5 text-center max-w-[64px] leading-tight ${
                    active ? 'text-sib-primary' : done ? 'text-sib-text' : 'text-sib-muted'
                  }`}>
                    {step.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full ${i < currentIdx ? 'bg-sib-primary' : 'bg-sib-stone'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* Terminal state display */}
      {isTerminal && (
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${
          shipment.status === 'failed_delivery' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
        }`}>
          {shipment.status === 'failed_delivery'
            ? <XCircle size={20} className="text-red-500 flex-shrink-0" />
            : <RotateCcw size={20} className="text-orange-500 flex-shrink-0" />
          }
          <div>
            <p className={`text-sm font-bold ${shipment.status === 'failed_delivery' ? 'text-red-800' : 'text-orange-800'}`}>
              {TERMINAL_STATES[shipment.status].label}
            </p>
            <p className={`text-xs mt-0.5 ${shipment.status === 'failed_delivery' ? 'text-red-600' : 'text-orange-600'}`}>
              {shipment.status === 'failed_delivery'
                ? 'Delivery attempt was unsuccessful. The courier will retry or return the item.'
                : 'The item has been returned to the sender.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Shipment details */}
      <div className="space-y-2">
        {shipment.trackingNumber && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-sib-sand">
            <div>
              <p className="text-[11px] text-sib-muted">Tracking number</p>
              <p className="text-sm font-semibold text-sib-text font-mono">{shipment.trackingNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-sib-muted">Courier</p>
              <p className="text-sm font-semibold text-sib-text">{shipment.courier || 'MaltaPost'}</p>
            </div>
          </div>
        )}

        {!shipment.trackingNumber && shipment.status === 'awaiting_shipment' && (
          <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100">
            <p className="text-xs text-yellow-700">
              Tracking number will appear once the seller ships the item via MaltaPost.
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-2">
          {shipment.createdAt && (
            <div className="p-2.5 rounded-xl bg-sib-sand">
              <p className="text-[10px] text-sib-muted">Created</p>
              <p className="text-xs font-medium text-sib-text">{new Date(shipment.createdAt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
          {shipment.shippedAt && (
            <div className="p-2.5 rounded-xl bg-sib-sand">
              <p className="text-[10px] text-sib-muted">Shipped</p>
              <p className="text-xs font-medium text-sib-text">{new Date(shipment.shippedAt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
          {shipment.inTransitAt && (
            <div className="p-2.5 rounded-xl bg-sib-sand">
              <p className="text-[10px] text-sib-muted">In transit</p>
              <p className="text-xs font-medium text-sib-text">{new Date(shipment.inTransitAt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
          {shipment.deliveredAt && (
            <div className="p-2.5 rounded-xl bg-sib-sand">
              <p className="text-[10px] text-sib-muted">Delivered</p>
              <p className="text-xs font-medium text-sib-text">{new Date(shipment.deliveredAt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
          {shipment.failedAt && (
            <div className="p-2.5 rounded-xl bg-red-50">
              <p className="text-[10px] text-red-400">Failed</p>
              <p className="text-xs font-medium text-red-700">{new Date(shipment.failedAt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
          {shipment.returnedAt && (
            <div className="p-2.5 rounded-xl bg-orange-50">
              <p className="text-[10px] text-orange-400">Returned</p>
              <p className="text-xs font-medium text-orange-700">{new Date(shipment.returnedAt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
        </div>

        {/* Delivery proof */}
        {shipment.deliveryProof && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-100">
            <p className="text-[11px] text-green-600 font-semibold mb-1">Delivery proof</p>
            <p className="text-xs text-green-700">{shipment.deliveryProof}</p>
          </div>
        )}

        {/* Collection deadline for awaiting_shipment */}
        {shipment.status === 'awaiting_shipment' && shipment.shipByDeadline && (
          <ShipByDeadline deadline={shipment.shipByDeadline} />
        )}
      </div>
    </div>
  )
}

export function ShipByDeadline({ deadline }) {
  const now = Date.now()
  const deadlineMs = new Date(deadline).getTime()
  const remaining = deadlineMs - now
  const isOverdue = remaining <= 0
  const isUrgent = remaining > 0 && remaining < 24 * 60 * 60 * 1000 // < 24h

  const daysLeft = Math.ceil(remaining / (24 * 60 * 60 * 1000))

  return (
    <div className={`p-3 rounded-xl border ${
      isOverdue ? 'bg-red-50 border-red-200' :
      isUrgent ? 'bg-amber-50 border-amber-200' :
      'bg-blue-50 border-blue-100'
    }`}>
      <div className="flex items-center gap-2">
        <Clock size={14} className={isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-blue-500'} />
        <div>
          <p className={`text-xs font-semibold ${
            isOverdue ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-blue-700'
          }`}>
            {isOverdue
              ? 'Collection deadline passed'
              : `Collect by ${new Date(deadline).toLocaleDateString('en-MT', { weekday: 'short', day: 'numeric', month: 'short' })}`
            }
          </p>
          <p className={`text-[11px] mt-0.5 ${
            isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-blue-600'
          }`}>
            {isOverdue
              ? 'This order is overdue. Ship now to avoid cancellation.'
              : isUrgent
                ? 'Less than 24 hours left to ship this item.'
                : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to ship`
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export function ShipmentStatusBadge({ status }) {
  const config = SHIPMENT_STATUS_CONFIG[status]
  if (!config) return null
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}
