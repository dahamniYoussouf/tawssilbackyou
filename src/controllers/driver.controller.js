import {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  updateDriverLocation,
  getAvailableDrivers,
  getDriverStatistics
} from "../services/driver.service.js";

// Create driver
export const create = async (req, res, next) => {
  try {
    const driver = await createDriver(req.body);
    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: driver
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This phone number or email is already registered",
        field: err.errors[0].path,
        value: err.errors[0].value
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    next(err);
  }
};

// Get all drivers with filters
export const getAll = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      is_active: req.query.is_active,
      is_verified: req.query.is_verified,
      search: req.query.search
    };
    
    const drivers = await getAllDrivers(filters);
    res.json({ 
      success: true, 
      data: drivers,
      count: drivers.length 
    });
  } catch (err) {
    next(err);
  }
};

// Get driver by ID
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driver = await getDriverById(id);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
};

// Update driver
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driver = await updateDriver(id, req.body);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Driver updated successfully",
      data: driver
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This phone number or email is already registered",
        field: err.errors[0].path,
        value: err.errors[0].value
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    next(err);
  }
};

// Delete driver
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDriver(id);

    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Driver deleted successfully" 
    });
  } catch (err) {
    next(err);
  }
};

// Update driver status
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const driver = await updateDriverStatus(id, status);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Driver status updated successfully",
      data: driver
    });
  } catch (err) {
    next(err);
  }
};

// Update driver location
export const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { longitude, latitude } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude are required"
      });
    }

    const driver = await updateDriverLocation(id, longitude, latitude);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Driver location updated successfully",
      data: {
        id: driver.id,
        current_location: driver.getCurrentCoordinates()
      }
    });
  } catch (err) {
    next(err);
  }
};



// Get available drivers
export const getAvailable = async (req, res, next) => {
  try {
    const drivers = await getAvailableDrivers();
    res.json({ 
      success: true, 
      data: drivers,
      count: drivers.length
    });
  } catch (err) {
    next(err);
  }
};

// Get driver statistics
export const getStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await getDriverStatistics(id);

    if (!stats) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}