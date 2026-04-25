/**
 * Delivery configuration for Sib marketplace.
 * Edit prices, method names, and locker locations here.
 * Admin panel can override these values in the future.
 */

export const DELIVERY_METHODS = [
  {
    id: 'home_delivery',
    name: 'MaltaPost Delivery',
    description: 'Delivered to your address by MaltaPost',
    price: 4.50,
    estimatedDays: '2–3 working days',
    icon: 'home',
    active: true,
  },
  {
    id: 'locker_collection',
    name: 'MaltaPost Locker',
    description: 'Collect from a MaltaPost locker near you',
    price: 3.25,
    estimatedDays: '2–4 working days',
    icon: 'locker',
    helpText: 'Once your parcel arrives, MaltaPost will notify you with a collection code.',
    active: true,
  },
]

export const LOCKER_LOCATIONS = [
  { id: 'lk_attard', locationName: 'Ħ\'Attard', fullAddress: '1, Misraħ Ġwanni Pawlu II, Ħ\'Attard, ATD 2200', region: 'Malta', active: true },
  { id: 'lk_birkirkara', locationName: 'Birkirkara', fullAddress: '58, Triq il-Wied, Birkirkara, BKR 9013', region: 'Malta', active: true },
  { id: 'lk_mriehel', locationName: 'Mriehel / Birkirkara', fullAddress: 'Trident Park Notabile Gardens, Triq l-Imdina, Zone 2, B\'Kara, CBD 2010', region: 'Malta', active: true },
  { id: 'lk_birzebbuga', locationName: 'Birżebbuġa', fullAddress: '48, Triq Żarenu Dalli, Birżebbuġa, BBG 1522', region: 'Malta', active: true },
  { id: 'lk_bugibba', locationName: 'Buġibba / San Pawl il-Baħar', fullAddress: '6, Triq id-Dolmen, Buġibba, San Pawl il-Baħar, SPB 2400', region: 'Malta', active: true },
  { id: 'lk_floriana', locationName: 'Floriana', fullAddress: '15A Pjazza San Kalċidonju, Floriana, FRN 1533', region: 'Malta', active: true },
  { id: 'lk_fgura', locationName: 'Fgura', fullAddress: '419, Triq Ħaż-Żabbar, Fgura, FGR 1018', region: 'Malta', active: true },
  { id: 'lk_luqa', locationName: 'Luqa', fullAddress: '11, Trejqa Dun Ġulju Muscat, Luqa, LQA 1450', region: 'Malta', active: true },
  { id: 'lk_marsa', locationName: 'Marsa', fullAddress: '305, Triq Ħal-Qormi, Marsa, MTP 1001', region: 'Malta', active: true },
  { id: 'lk_marsaskala', locationName: 'Marsaskala', fullAddress: 'Triq Sant\' Antnin, Marsaskala, MSK 9059', region: 'Malta', active: true },
  { id: 'lk_mgarr', locationName: 'Mġarr (Malta)', fullAddress: '4, Triq Fisher, Mġarr, MGR 9051', region: 'Malta', active: true },
  { id: 'lk_uni_msida', locationName: 'University of Malta / Msida', fullAddress: 'University Campus, Msida, MSD 2080', region: 'Malta', active: true },
  { id: 'lk_mosta', locationName: 'Mosta', fullAddress: 'Ċentru Ċiviku, Triq il-Kostituzzjoni, Mosta, MST 9059', region: 'Malta', active: true },
  { id: 'lk_naxxar', locationName: 'Naxxar', fullAddress: 'Ċentru Ċiviku, Vjal Il-Wieħed u Għoxrin ta\' Settembru, Naxxar, NXR 1018', region: 'Malta', active: true },
  { id: 'lk_paola', locationName: 'Paola', fullAddress: 'Centru Civiku, Pjazza Antoine De Paule, Paola, PLA 1266', region: 'Malta', active: true },
  { id: 'lk_mcast', locationName: 'MCAST Main Campus (Paola)', fullAddress: 'Triq Kordin, Paola, PLA 9032', region: 'Malta', active: true },
  { id: 'lk_pembroke', locationName: 'Pembroke', fullAddress: 'Ġnien Madre Tereża ta\' Kalkutta, Triq Camillo Sciberras, Pembroke, PBK 1051', region: 'Malta', active: true },
  { id: 'lk_rabat', locationName: 'Rabat (Malta)', fullAddress: 'Centru Civiku, Triq Santa Rita, Rabat, RBT 1001', region: 'Malta', active: true },
  { id: 'lk_sangwann', locationName: 'San Ġwann', fullAddress: '95, Triq in-Naxxar, San Ġwann, SGN 9031', region: 'Malta', active: true },
  { id: 'lk_sanpawl', locationName: 'San Pawl il-Baħar (St. Paul\'s Bay)', fullAddress: '511, Triq San Pawl, San Pawl il-Baħar, SPB 3416', region: 'Malta', active: true },
  { id: 'lk_stjulians', locationName: 'St. Julian\'s', fullAddress: 'Triq Paceville, St. Julian\'s, STJ 3103', region: 'Malta', active: true },
  { id: 'lk_siggiewi', locationName: 'Siġġiewi', fullAddress: '82, Triq San Nikola, Siġġiewi, SGW 1045', region: 'Malta', active: true },
  { id: 'lk_stavenera', locationName: 'Santa Venera', fullAddress: 'Lombard Bank, 4, Trejqa tal-Fleur-de-Lys, Santa Venera, SVR 1587', region: 'Malta', active: true },
  { id: 'lk_sliema_dingli', locationName: 'Sliema (Dingli Street Post Office)', fullAddress: '39, Triq Sir Adrian Dingli, Sliema, SLM 1055', region: 'Malta', active: true },
  { id: 'lk_sliema_lombard', locationName: 'Sliema (Lombard Bank Branch)', fullAddress: '41, Triq Robert Arrigo, Sliema, SLM 3174', region: 'Malta', active: true },
  { id: 'lk_swieqi', locationName: 'Swieqi', fullAddress: 'Ċentru Ċiviku, Triq G. Bessiera, Swieqi, SWQ 2261', region: 'Malta', active: true },
  { id: 'lk_tarxien', locationName: 'Tarxien', fullAddress: 'Ġnien Veliko Tarnovo, Triq Santa Marija, Tarxien, TXN 1704', region: 'Malta', active: true },
  { id: 'lk_valletta', locationName: 'Valletta', fullAddress: '25, Triq Nofsinhar, Valletta, VLT 1102', region: 'Malta', active: true },
  { id: 'lk_zabbar', locationName: 'Żabbar', fullAddress: 'Ċentru Ċiviku, Triq il-Kunvent, Ħaż-Żabbar, ŻBR 1351', region: 'Malta', active: true },
  { id: 'lk_zebbug', locationName: 'Żebbuġ (Malta)', fullAddress: 'Triq Sciortino, Ħaż-Żebbuġ, ŻBĠ 1962', region: 'Malta', active: true },
  { id: 'lk_zurrieq', locationName: 'Żurrieq', fullAddress: '75, Triq Il-Kbira, Żurrieq, ZRQ 1317', region: 'Malta', active: true },
  { id: 'lk_zejtun', locationName: 'Żejtun', fullAddress: '11, Misraħ Gregorio Bonici, Żejtun, ZTN 1051', region: 'Malta', active: true },
  { id: 'lk_ghajnsielem', locationName: 'Għajnsielem (Gozo)', fullAddress: 'Triq J.F. De Chambrai, Għajnsielem, GSM 1051', region: 'Gozo', active: true },
  { id: 'lk_victoria', locationName: 'Victoria (Gozo)', fullAddress: '5, Triq Sir Adrian Dingli, Victoria, Gozo, VCT 1441', region: 'Gozo', active: true },
]

/**
 * Get active delivery methods only.
 */
export function getActiveDeliveryMethods() {
  return DELIVERY_METHODS.filter(m => m.active)
}

/**
 * Get active locker locations, optionally filtered by region.
 */
export function getActiveLockers(region = null) {
  const active = LOCKER_LOCATIONS.filter(l => l.active)
  if (region) return active.filter(l => l.region === region)
  return active
}

/**
 * Get a delivery method by ID.
 */
export function getDeliveryMethod(id) {
  return DELIVERY_METHODS.find(m => m.id === id) || null
}

/**
 * Get delivery fee by method ID.
 */
export function getDeliveryFee(methodId) {
  const method = getDeliveryMethod(methodId)
  return method ? method.price : 4.50
}

/**
 * Get locker by ID.
 */
export function getLockerById(id) {
  return LOCKER_LOCATIONS.find(l => l.id === id) || null
}

/**
 * Status flow per delivery type.
 */
export const STATUS_FLOW = {
  home_delivery: ['paid', 'ready_for_shipment', 'shipped', 'out_for_delivery', 'delivered'],
  locker_collection: ['paid', 'ready_for_shipment', 'shipped', 'ready_for_collection', 'collected'],
}

/**
 * Status labels for buyer-facing UI.
 */
export const DELIVERY_STATUS_LABELS = {
  paid: 'Order placed',
  ready_for_shipment: 'Ready for shipment',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  ready_for_collection: 'Ready for collection',
  collected: 'Collected',
}
