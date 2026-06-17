import Lead from "../models/Lead.js";

export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    const { name, email, phone, address, disposition = "Quoted", notes = "" } = req.body;

    const lead = await Lead.create({
      name,
      email,
      phone,
      address,
      disposition,
      notes,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
