import Lead from "../models/Lead.js";
import { getNextAssignee } from "../utils/assignLead.js";

const DEFAULT_PAGE_SIZE = 10;

const buildDateExpression = ({ year, month, day } = {}) => {
  const parts = [];

  if (year && year !== "all") {
    parts.push({ $eq: [{ $year: "$createdAt" }, Number(year)] });
  }

  if (month && month !== "all") {
    parts.push({ $eq: [{ $month: "$createdAt" }, Number(month)] });
  }

  if (day && day !== "all") {
    parts.push({ $eq: [{ $dayOfMonth: "$createdAt" }, Number(day)] });
  }

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return { $and: parts };
};

const SEARCH_FIELDS = ["name", "email", "phone", "make", "model", "year", "partRequested", "notes"];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = (search) => {
  const term = search?.trim();

  if (!term) {
    return null;
  }

  const pattern = escapeRegex(term);

  return {
    $or: SEARCH_FIELDS.map((field) => ({
      [field]: { $regex: pattern, $options: "i" },
    })),
  };
};

const buildLeadFilter = ({ disposition, year, month, day, search } = {}) => {
  const conditions = [];

  if (disposition && disposition !== "all") {
    conditions.push({ disposition });
  }

  const dateExpression = buildDateExpression({ year, month, day });

  if (dateExpression) {
    conditions.push({ $expr: dateExpression });
  }

  const searchFilter = buildSearchFilter(search);

  if (searchFilter) {
    conditions.push(searchFilter);
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
};

export const getLeads = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 1);
    const skip = (page - 1) * limit;
    const disposition = req.query.disposition || "all";
    const year = req.query.year || "all";
    const month = req.query.month || "all";
    const day = req.query.day || "all";
    const search = req.query.search?.trim() || "";
    const listFilter = buildLeadFilter({ disposition, year, month, day, search });
    const dateOptionsFilter = buildLeadFilter({ disposition, search });

    const [leads, total, quoted, ordered, availableDates] = await Promise.all([
      Lead.find(listFilter)
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(listFilter),
      Lead.countDocuments({ ...listFilter, disposition: "Quoted" }),
      Lead.countDocuments({ ...listFilter, disposition: "Ordered" }),
      Lead.aggregate([
        { $match: dateOptionsFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
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
        availableDates: availableDates.map(({ _id, count }) => ({
          date: _id,
          count,
        })),
      },
      filters: {
        disposition,
        year,
        month,
        day,
        search,
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
    });

    await lead.populate("assignedTo", "name email");

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
