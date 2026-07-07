import Lead from "../models/Lead.js";
import { getNextAssignee } from "../utils/assignLead.js";

const EXTERNAL_SOURCES = ["website", "facebook", "other"];

const populateLeadFields = (query) =>
  query
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("followUpSetBy", "name email");

export const createExternalLead = async (req, res) => {
  try {
    const {
      name: bodyName,
      fullName,
      full_name,
      email,
      phone: bodyPhone,
      phoneNumber,
      phone_number,
      zip: bodyZip,
      zipCode,
      zip_code,
      postal_code,
      partRequested: bodyPartRequested,
      part_requested,
      make,
      model,
      year,
      disposition = "Quoted",
      notes = "",
      source = "facebook",
    } = req.body;

    const name = bodyName || fullName || full_name;
    const phone = bodyPhone || phoneNumber || phone_number;
    const zip = bodyZip || zipCode || zip_code || postal_code;
    const partRequested = bodyPartRequested || part_requested;
    const normalizedSource = EXTERNAL_SOURCES.includes(source) ? source : "other";
    const assignedTo = await getNextAssignee();

    const lead = await Lead.create({
      name,
      email,
      phone,
      zip,
      partRequested,
      make,
      model,
      year,
      disposition,
      notes,
      assignedTo,
      createdBy: null,
      source: normalizedSource,
    });

    const populatedLead = await populateLeadFields(Lead.findById(lead._id));

    res.status(201).json({ success: true, data: populatedLead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
