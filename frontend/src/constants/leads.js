import { apiUrl } from "../config/api.js";

export const API_URL = apiUrl("/api/leads");

export const dispositions = [
  "Quoted",
  "No Response",
  "Wrong Number",
  "Not Interested",
  "Price too high",
  "Part not available",
  "Ordered",
  "Already ordered",
];

export const ALL_DISPOSITIONS = "all";
export const ALL_YEARS = "all";
export const ALL_MONTHS = "all";
export const ALL_DAYS = "all";

export const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, index) => String(currentYear - index));
};

export const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));

export const SEARCH_PLACEHOLDER =
  "Search by name, email, phone, make, model, year, part, or notes";

export const initialLeadForm = {
  name: "",
  email: "",
  phone: "",
  zip: "",
  partRequested: "",
  make: "",
  model: "",
  year: "",
  disposition: "Quoted",
  notes: "",
};
