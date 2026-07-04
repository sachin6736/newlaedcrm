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
      name,
      email,
      phone,
      zip,
      partRequested,
      make,
      model,
      year,
      disposition = "Quoted",
      notes = "",
      source = "other",
    } = req.body;

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