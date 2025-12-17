import { body, param, query } from "express-validator";

// ==================== ORDER CRUD VALIDATORS ====================

export const createOrderWithItemsValidator = [

  
  body('restaurant_id')
    .notEmpty().withMessage('Restaurant ID is required')
    .isUUID().withMessage('Invalid restaurant ID format'),
  
  body('order_type')
    .optional()
    .isIn(['delivery', 'pickup']).withMessage('Order type must be delivery or pickup'),
  
  body('delivery_address')
    .if(body('order_type').equals('delivery'))
    .notEmpty().withMessage('Delivery address is required for delivery orders'),
  
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  
  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  
  body('delivery_fee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Delivery fee must be positive'),
  
  // REMOVED: subtotal is auto-calculated from items
  body('subtotal')
    .optional()
    .isFloat({ min: 0 }).withMessage('Subtotal must be positive'),
  
  body('payment_method')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['baridi_mob', 'cash_on_delivery', 'bank_transfer'])
    .withMessage('Invalid payment method'),
  
  body('delivery_instructions')
    .optional()
    .isString().withMessage('Delivery instructions must be a string'),
  
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  
  body('items.*.menu_item_id')
    .notEmpty().withMessage('Menu item ID is required')
    .isUUID().withMessage('Invalid menu item ID'),
  
  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

  body('items.*.additions')
    .optional()
    .isArray().withMessage('additions must be an array'),

  body('items.*.additions.*.addition_id')
    .optional()
    .isUUID().withMessage('addition_id must be a valid UUID'),

  body('items.*.additions.*.quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('Addition quantity must be at least 1'),
  
  // REMOVED: unit_price is fetched from MenuItem model
  body('items.*.unit_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  
  body('items.*.special_instructions')
    .optional()
    .isString().withMessage('Special instructions must be a string'),
  
  // Support legacy field name
  body('items.*.customizations')
    .optional()
    .isString().withMessage('Customizations must be a string')
];

export const createOrderValidator = [

  
  body('restaurant_id')
    .notEmpty().withMessage('Restaurant ID is required')
    .isUUID().withMessage('Invalid restaurant ID format'),
  
  body('order_type')
    .optional()
    .isIn(['delivery', 'pickup']).withMessage('Order type must be delivery or pickup'),
  
  body('delivery_address')
    .if(body('order_type').equals('delivery'))
    .notEmpty().withMessage('Delivery address is required for delivery orders'),
  
  body('subtotal')
    .notEmpty().withMessage('Subtotal is required')
    .isFloat({ min: 0 }).withMessage('Subtotal must be positive'),
  
  body('payment_method')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['baridi_mob', 'cash_on_delivery', 'bank_transfer'])
    .withMessage('Invalid payment method')
];

export const getAllOrdersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt().withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'preparing', 'assigned', 'delivering', 'delivered', 'declined'])
    .withMessage('Invalid status'),
  
  query('order_type')
    .optional()
    .isIn(['delivery', 'pickup']).withMessage('Invalid order type'),
  
  query('client_id')
    .optional()
    .isUUID().withMessage('Invalid client ID'),
  
  query('restaurant_id')
    .optional()
    .isUUID().withMessage('Invalid restaurant ID'),
  
  query('date_from')
    .optional()
    .isISO8601().withMessage('Invalid date format for date_from'),
  
  query('date_to')
    .optional()
    .isISO8601().withMessage('Invalid date format for date_to'),
  
  query('search')
    .optional()
    .isString().withMessage('Search must be a string')
];

export const getOrderByIdValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format')
];

export const getClientOrdersValidator = [
  param('clientId')
    .notEmpty().withMessage('Client ID is required')
    .isUUID().withMessage('Invalid client ID format'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'preparing', 'assigned', 'delivering', 'delivered', 'declined'])
    .withMessage('Invalid status')
];

// ==================== STATUS TRANSITION VALIDATORS ====================

export const declineOrderValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('reason')
    .notEmpty().withMessage('Decline reason is required')
    .isString().withMessage('Reason must be a string')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
];

export const assignDriverValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('driver_id')
    .optional()
    .isUUID().withMessage('Invalid driver ID format')
];

// ==================== GPS TRACKING VALIDATORS ====================

export const updateDriverGPSValidator = [
  param('driverId')
    .notEmpty().withMessage('Driver ID is required')
    .isUUID().withMessage('Invalid driver ID format'),
  
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90')
];

// ==================== RATING VALIDATOR ====================

export const addRatingValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('restaurant_rating')
    .optional()
    .isFloat({ min: 1, max: 5 }).withMessage('Restaurant rating must be between 1 and 5'),

  body('driver_rating')
    .optional()
    .isFloat({ min: 1, max: 5 }).withMessage('Driver rating must be between 1 and 5'),
  
  body('restaurant_review_comment')
    .optional()
    .isString().withMessage('Restaurant comment must be a string')
    .isLength({ max: 1000 }).withMessage('Restaurant comment must not exceed 1000 characters'),

  body('driver_review_comment')
    .optional()
    .isString().withMessage('Driver comment must be a string')
    .isLength({ max: 1000 }).withMessage('Driver comment must not exceed 1000 characters'),

  body('review_comment')
    .optional()
    .isString().withMessage('Review comment must be a string')
    .isLength({ max: 1000 }).withMessage('Review comment must not exceed 1000 characters')
];

// ==================== LEGACY VALIDATORS (kept for backward compatibility) ====================

export const updateOrderValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('status')
    .optional()
    .isIn(['pending', 'accepted', 'preparing', 'assigned', 'delivering', 'delivered', 'declined'])
    .withMessage('Invalid status'),
  
  body('delivery_address')
    .optional()
    .isString().withMessage('Delivery address must be a string'),
  
  body('payment_method')
    .optional()
    .isIn(['baridi_mob', 'cash_on_delivery', 'bank_transfer'])
    .withMessage('Invalid payment method')
];

export const deleteOrderValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format')
];

export const updateOrderStatusValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'accepted', 'preparing', 'assigned', 'delivering', 'delivered', 'declined'])
    .withMessage('Invalid status'),
  
  body('cancellation_reason')
    .optional()
    .isString().withMessage('Cancellation reason must be a string')
];

export const updatePaymentStatusValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('payment_status')
    .notEmpty().withMessage('Payment status is required')
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  
  body('payment_method')
    .optional()
    .isIn(['baridi_mob', 'cash_on_delivery', 'bank_transfer'])
    .withMessage('Invalid payment method')
];

export const assignDeliveryPersonValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('livreur_id')
    .notEmpty().withMessage('Delivery person ID is required')
    .isUUID().withMessage('Invalid delivery person ID format')
];

export const getOrderStatisticsValidator = [
  query('date_from')
    .optional()
    .isISO8601().withMessage('Invalid date format for date_from'),
  
  query('date_to')
    .optional()
    .isISO8601().withMessage('Invalid date format for date_to'),
  
  query('restaurant_id')
    .optional()
    .isUUID().withMessage('Invalid restaurant ID')
];


// getNearbyOrdersValidator
export const getNearbyOrdersValidator = [
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters'),
  
  query('min_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum fee must be positive'),
  
  query('max_distance')
    .optional()
    .isInt({ min: 100 })
    .withMessage('Max distance must be at least 100 meters'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
];

export const driverCancelOrderValidator = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('reason')
    .notEmpty().withMessage('Cancellation reason is required')
    .isString().withMessage('Reason must be a string')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
    .trim()
];
