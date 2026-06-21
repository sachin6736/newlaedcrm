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
  "Sale",
];

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
