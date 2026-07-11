import Lead from "../models/Lead.js";
import { getNextAssignee } from "../utils/assignLead.js";
import { normalizeVehicleFields } from "../utils/vehicleFields.js";
import { emitLeadCreated } from "../utils/leadEvents.js";

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
      disposition = "Quoted",
      notes = "",
      source = "facebook",
    } = req.body;

    const name = bodyName || fullName || full_name;
    const phone = bodyPhone || phoneNumber || phone_number;
    const zip = bodyZip || zipCode || zip_code || postal_code;
    const partRequested = bodyPartRequested || part_requested;
    const { yearMakeModel, year, make, model } = normalizeVehicleFields(req.body);
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
      yearMakeModel,
      disposition,
      notes,
      assignedTo,
      createdBy: null,
      source: normalizedSource,
    });

    const populatedLead = await populateLeadFields(Lead.findById(lead._id));

    emitLeadCreated(populatedLead);

    res.status(201).json({ success: true, data: populatedLead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
