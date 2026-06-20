const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const API_URL = `${API_BASE_URL}/api/leads`;

export const dispositions = [
  "Quoted",
  "No Response",
  "Wrong Number",
  "Not Interested",
  "Price too high",
  "Part not available",
  "Ordered",
];

export const initialLeadForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  disposition: "Quoted",
  notes: "",
};
