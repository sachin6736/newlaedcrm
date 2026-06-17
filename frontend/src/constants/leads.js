export const API_URL = "http://localhost:5000/api/leads";
 
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