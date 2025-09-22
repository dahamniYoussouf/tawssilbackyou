require('dotenv').config()

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')


const restaurant = require('./src/routes/restaurant')

const app = express()

app.use(bodyParser.json())
app.use(cors())
app.use('/restaurant',restaurant)



const port = process.env.PORT || 3000

app.listen(port,()=>{
    console.log('App listen on Port'+ port)
})