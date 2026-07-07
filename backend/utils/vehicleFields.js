const COMBINED_VEHICLE_FIELDS = [
  "yearMakeModel",
  "year_make_model",
  "yearmakemodel",
  "vehicle",
  "vehicleInfo",
  "vehicle_info",
];

const findCombinedVehicleValue = (body = {}) => {
  for (const field of COMBINED_VEHICLE_FIELDS) {
    if (body[field]) {
      return String(body[field]).trim();
    }
  }

  return "";
};

const parseYearMakeModel = (value = "") => {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return {};
  }

  const parts = normalized.split(" ");
  const yearIndex = parts.findIndex((part) => /^(19|20)\d{2}$/.test(part));
  const parsed = {};
  let vehicleParts = parts;

  if (yearIndex !== -1) {
    parsed.year = parts[yearIndex];
    vehicleParts = parts.filter((_, index) => index !== yearIndex);
  }

  if (vehicleParts.length > 0) {
    parsed.make = vehicleParts[0];
  }

  if (vehicleParts.length > 1) {
    parsed.model = vehicleParts.slice(1).join(" ");
  }

  return parsed;
};

export const normalizeVehicleFields = (body = {}) => {
  const providedYearMakeModel = findCombinedVehicleValue(body);
  const parsed = parseYearMakeModel(providedYearMakeModel);
  const year = body.year || parsed.year;
  const make = body.make || parsed.make;
  const model = body.model || parsed.model;
  const generatedYearMakeModel = [year, make, model].filter(Boolean).join(" ");

  return {
    yearMakeModel: providedYearMakeModel || generatedYearMakeModel,
    year,
    make,
    model,
  };
};
