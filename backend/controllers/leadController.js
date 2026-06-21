import Lead from "../models/Lead.js";

const DEFAULT_PAGE_SIZE = 10;

export const getLeads = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 1);
    const skip = (page - 1) * limit;

    const [leads, total, quoted, ordered] = await Promise.all([
      Lead.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lead.countDocuments(),
      Lead.countDocuments({ disposition: "Quoted" }),
      Lead.countDocuments({ disposition: "Ordered" }),
    ]);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: skip + leads.length < total,
        hasPreviousPage: page > 1,
      },
      stats: {
        total,
        quoted,
        ordered,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLead = async (req, res) => {
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
    } = req.body;

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
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, disposition } = req.body;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    let hasUpdates = false;

    if (notes !== undefined) {
      lead.notes = notes;
      hasUpdates = true;
    }

    if (disposition !== undefined) {
      lead.disposition = disposition;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    await lead.save();

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
