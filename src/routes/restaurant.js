require('dotenv').config()

const router = require('express').Router()
const restaurantCtrl = require('../controllers/restaurant.controller');


router.post('/create', restaurantCtrl.create);
router.get('/nearby2', restaurantCtrl.nearby);




module.exports = router
