const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/LoureHomes",{
    useNewUrlParser:true,
    useUnifiedTopology:true,
    useFindAndModify:false,
    useCreateIndex:true
    
}).then(con=>{
    console.log("Connected DB");
}).catch(err=>{
    console.log('error',err);
})
module.exports = mongoose;