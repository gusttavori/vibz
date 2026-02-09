// backend/utils/geocode.js
const getCoordinates = async (address) => {
  // Retorna coordenadas padrão de Vitória da Conquista para não quebrar o sistema
  return { lat: -14.8619, lng: -40.8442 }; 
};

module.exports = { getCoordinates };