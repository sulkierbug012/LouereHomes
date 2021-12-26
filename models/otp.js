const mongoose = require('mongoose');
const conn = require('../config/db');

var OtpSchema = new mongoose.Schema({
    email:String,
    code:String,
    expireIn:Number
},{
    timestamps:true
})

let otp = conn.model('otp',OtpSchema,'otp');
module.exports = otp;