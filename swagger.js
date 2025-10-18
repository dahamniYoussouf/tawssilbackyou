// swagger.js - Complete API documentation generator
import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    version: '2.0.0',
    title: 'Food Delivery API',
    description: 'Complete REST API documentation for Food Delivery Platform with real-time features'
  },
  host: process.env.HOST || 'localhost:3000',
  basePath: '/',
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'JWT Bearer token (format: Bearer <token>)'
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Restaurants',
      description: 'Restaurant management and search operations'
    },
    {
      name: 'Menu Items',
      description: 'Menu item CRUD and availability management'
    },
    {
      name: 'Food Categories',
      description: 'Food category management for restaurants'
    },
    {
      name: 'Orders',
      description: 'Order lifecycle management and tracking'
    },
    {
      name: 'Order Items',
      description: 'Order item management'
    },
    {
      name: 'Clients',
      description: 'Client profile management'
    },
    {
      name: 'Drivers',
      description: 'Driver management and tracking'
    },
    {
      name: 'Favorites',
      description: 'Favorite restaurants and meals management'
    },
    {
      name: 'Announcements',
      description: 'System announcements and notifications'
    },
    {
      name: 'Utilities',
      description: 'File upload and geocoding utilities'
    }
  ],
  definitions: {
    // Authentication
    LoginRequest: {
      email: "restaurant@example.com",
      password: "password123",
      device_id: "device-123"
    },
    RegisterRequest: {
      email: "user@example.com",
      password: "password123",
      role: "driver",
      first_name: "John",
      last_name: "Doe",
      phone: "+213555123456"
    },
    OTPRequest: {
      phone_number: "+213555123456"
    },
    OTPVerify: {
      phone_number: "+213555123456",
      otp: "123456",
      device_id: "device-123"
    },
    RefreshTokenRequest: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    
    // Restaurant
    Restaurant: {
      id: "uuid",
      name: "Pizza Palace",
      description: "Best pizza in town",
      address: "123 Main Street, Oran",
      lat: 35.6976,
      lng: -0.6337,
      rating: 4.5,
      image_url: "https://example.com/image.jpg",
      is_active: true,
      is_premium: false,
      status: "approved",
      categories: ["pizza", "burger"],
      opening_hours: {
        monday: { open: "09:00", close: "22:00" },
        tuesday: { open: "09:00", close: "22:00" }
      }
    },
    RestaurantCreate: {
      name: "Pizza Palace",
      description: "Best pizza in town",
      address: "123 Main Street, Oran",
      lat: 35.6976,
      lng: -0.6337,
      categories: ["pizza"],
      image_url: "https://example.com/image.jpg"
    },
    NearbyFilterRequest: {
      client_id: "uuid",
      lat: 35.6976,
      lng: -0.6337,
      radius: 5000,
      categories: ["pizza", "burger"],
      q: "pizza",
      page: 1,
      pageSize: 20
    },
    
    // Menu Item
    MenuItem: {
      id: "uuid",
      category_id: "uuid",
      nom: "Margherita Pizza",
      description: "Classic tomato and mozzarella",
      prix: 899.99,
      photo_url: "https://example.com/pizza.jpg",
      is_available: true,
      temps_preparation: 20
    },
    MenuItemCreate: {
      category_id: "uuid",
      nom: "Margherita Pizza",
      description: "Classic tomato and mozzarella",
      prix: 899.99,
      photo_url: "https://example.com/pizza.jpg",
      temps_preparation: 20
    },
    
    // Food Category
    FoodCategory: {
      id: "uuid",
      restaurant_id: "uuid",
      nom: "Pizzas",
      description: "Our delicious pizzas",
      icone_url: "https://example.com/icon.png",
      ordre_affichage: 1
    },
    
    // Order
    Order: {
      id: "uuid",
      order_number: "DEL-20240118-0001",
      client_id: "uuid",
      restaurant_id: "uuid",
      order_type: "delivery",
      delivery_address: "456 Oak Street",
      status: "pending",
      payment_method: "cash_on_delivery",
      subtotal: 2500.00,
      delivery_fee: 200.00,
      total_amount: 2700.00,
      estimated_delivery_time: "2024-01-18T14:30:00Z"
    },
    OrderCreate: {
      client_id: "uuid",
      restaurant_id: "uuid",
      order_type: "delivery",
      delivery_address: "456 Oak Street",
      lat: 35.6976,
      lng: -0.6337,
      payment_method: "cash_on_delivery",
      delivery_fee: 200,
      items: [
        {
          menu_item_id: "uuid",
          quantity: 2,
          special_instructions: "Extra cheese"
        }
      ]
    },
    OrderTracking: {
      order_id: "uuid",
      status: "delivering",
      driver: {
        name: "John Doe",
        phone: "+213555123456",
        current_location: { lat: 35.6976, lng: -0.6337 }
      },
      destination: { lat: 35.7000, lng: -0.6400 },
      estimated_arrival: "2024-01-18T14:30:00Z"
    },
    
    // Order Item
    OrderItem: {
      id: "uuid",
      order_id: "uuid",
      menu_item_id: "uuid",
      quantite: 2,
      prix_unitaire: 899.99,
      prix_total: 1799.98,
      instructions_speciales: "Extra cheese"
    },
    
    // Client
    Client: {
      id: "uuid",
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      phone_number: "+213555123456",
      address: "456 Oak Street",
      loyalty_points: 150,
      is_verified: true,
      is_active: true
    },
    
    // Driver
    Driver: {
      id: "uuid",
      driver_code: "DRV-0001",
      first_name: "John",
      last_name: "Smith",
      phone: "+213555654321",
      email: "driver@example.com",
      vehicle_type: "motorcycle",
      vehicle_plate: "ABC-123",
      status: "available",
      rating: 4.8,
      total_deliveries: 156,
      is_verified: true
    },
    DriverGPSUpdate: {
      longitude: -0.6337,
      latitude: 35.6976
    },
    
    // Favorites
    FavoriteRestaurant: {
      favorite_uuid: "uuid",
      client_id: "uuid",
      restaurant_id: "uuid",
      notes: "Best pizza place",
      tags: ["italian", "fast-delivery"]
    },
    FavoriteMeal: {
      favorite_uuid: "uuid",
      client_id: "uuid",
      meal_id: "uuid",
      customizations: "Extra cheese, no onions",
      notes: "Perfect for Friday nights"
    },
    
    // Announcement
    Announcement: {
      id: "uuid",
      title: "New Year Promotion",
      content: "Get 20% off on all orders",
      type: "info",
      is_active: true,
      start_date: "2024-01-01T00:00:00Z",
      end_date: "2024-01-31T23:59:59Z"
    },
    
    // Utilities
    FileUploadResponse: {
      success: true,
      url: "https://supabase.co/storage/file.jpg"
    },
    GeocodeRequest: {
      address: "123 Main Street, Oran, Algeria"
    },
    GeocodeResponse: {
      lat: "35.6976",
      lng: "-0.6337",
      display_name: "123 Main Street, Oran, Algeria"
    },
    
    // Common responses
    SuccessResponse: {
      success: true,
      message: "Operation completed successfully",
      data: {}
    },
    ErrorResponse: {
      success: false,
      message: "Error message",
      errors: []
    },
    PaginatedResponse: {
      success: true,
      data: [],
      pagination: {
        current_page: 1,
        total_pages: 10,
        total_items: 100
      }
    }
  }
};

const outputFile = './swagger-output.json';
const routes = [
  './src/routes/auth.route.js',
  './src/routes/restaurant.route.js',
  './src/routes/menuItem.route.js',
  './src/routes/foodCategory.route.js',
  './src/routes/order.route.js',
  './src/routes/orderItem.route.js',
  './src/routes/client.route.js',
  './src/routes/driver.routes.js',
  './src/routes/favoriteRestaurant.route.js',
  './src/routes/favoriteMeal.route.js',
  './src/routes/announcement.route.js',
  './src/routes/uploadRoutes.js',
  './src/routes/geocode.js'
];

// Generate documentation
swaggerAutogen()(outputFile, routes, doc).then(() => {
  console.log('✅ Swagger documentation generated successfully!');
  console.log('📄 Output file: swagger-output.json');
  console.log('🌐 Access at: http://localhost:3000/api-docs');
});