require('dotenv').config()

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')


const restaurant = require('./src/routes/restaurant')

const app = express()

app.use(bodyParser.json())
app.use(cors())
app.use('/restaurant',restaurant)


module.exports = app;
