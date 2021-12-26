const mongoose = require('mongoose');
const conn = require('../config/db');

var SaleSchema = new mongoose.Schema({
    name:String,
    price:String,
    address:String,
    city:String,
    state:String,
    email:String,
    phone:String,
    stay:String,
    Date:String,
    image:String 
},{
    timestamps:true
})

let seller = conn.model('Sale',SaleSchema,'Sale');
module.exports = seller;