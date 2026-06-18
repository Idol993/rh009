function generateOrderNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DD${year}${month}${day}${random}`;
}

function generateTransactionNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TX${year}${month}${day}${random}`;
}

function generateSettlementNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ST${year}${month}${day}${random}`;
}

function generateAlertNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AL${year}${month}${day}${random}`;
}

function generateVerificationCode() {
  return Math.random().toString().substring(2, 8);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function matchVehicleType(weight, volume) {
  const motorcycleMaxWeight = 50;
  const motorcycleMaxVolume = 0.3;

  if (weight <= motorcycleMaxWeight && volume <= motorcycleMaxVolume) {
    return 'motorcycle';
  }
  return 'van';
}

function calculateFreight(distance, weight, volume, vehicleType, discountRate = 1.0) {
  const basePrice = vehicleType === 'motorcycle' ? 8 : 20;
  const distanceRate = vehicleType === 'motorcycle' ? 2.5 : 5;
  const weightRate = vehicleType === 'motorcycle' ? 0.5 : 1.5;

  const distancePrice = distance * distanceRate;
  const weightPrice = weight * weightRate;
  let total = basePrice + distancePrice + weightPrice;
  total = total * discountRate;

  const riderCommission = total * 0.7;

  return {
    basePrice,
    distancePrice: Math.round(distancePrice * 100) / 100,
    weightPrice: Math.round(weightPrice * 100) / 100,
    total: Math.round(total * 100) / 100,
    riderCommission: Math.round(riderCommission * 100) / 100
  };
}

function calculateDuration(distance, vehicleType) {
  const speed = vehicleType === 'motorcycle' ? 25 : 35;
  const hours = distance / speed;
  return Math.round(hours * 60);
}

function calculateCommission(order) {
  const base = 3;
  const distanceBonus = order.estimatedDistance * 0.8;
  const weightBonus = order.cargo.weight * 0.3;
  return Math.round((base + distanceBonus + weightBonus) * 100) / 100;
}

function calculateDetourScore(newOrder, existingOrders, riderLocation) {
  if (existingOrders.length === 0) return 0;

  let totalExtraDistance = 0;
  const newPickup = newOrder.pickupLocation.coordinates;
  const newDropoff = newOrder.customer.location.coordinates;

  existingOrders.forEach(order => {
    const existingPickup = order.pickupLocation.coordinates;
    const existingDropoff = order.customer.location.coordinates;

    const originalDist = calculateDistance(
      existingPickup[1], existingPickup[0],
      existingDropoff[1], existingDropoff[0]
    );

    const withNewDist1 = calculateDistance(riderLocation[1], riderLocation[0], newPickup[1], newPickup[0]) +
      calculateDistance(newPickup[1], newPickup[0], existingPickup[1], existingPickup[0]) +
      calculateDistance(existingPickup[1], existingPickup[0], newDropoff[1], newDropoff[0]) +
      calculateDistance(newDropoff[1], newDropoff[0], existingDropoff[1], existingDropoff[0]);

    totalExtraDistance += (withNewDist1 - originalDist);
  });

  return totalExtraDistance;
}

function haversineDistance(coords1, coords2) {
  return calculateDistance(coords1[1], coords1[0], coords2[1], coords2[0]);
}

module.exports = {
  generateOrderNo,
  generateTransactionNo,
  generateSettlementNo,
  generateAlertNo,
  generateVerificationCode,
  calculateDistance,
  matchVehicleType,
  calculateFreight,
  calculateDuration,
  calculateCommission,
  calculateDetourScore,
  haversineDistance
};
