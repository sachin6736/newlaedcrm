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

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, disposition } = req.body;

    const updates = {};
    if (notes !== undefined) {
      updates.notes = notes;
    }
    if (disposition !== undefined) {
      updates.disposition = disposition;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const lead = await Lead.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
