var express = require("express");
var multer  = require('multer')
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var morgan = require("morgan");
var User = require("./models/User");
var Otp = require("./models/otp");
var Sale = require("./models/Sale");
var ejs = require("ejs");
var fs = require("fs");
var app = express();
// set our application port
app.set("port", 9000);

// set morgan to log info about our requests for development use.
app.use(morgan("dev"));

// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));

// initialize cookie-parser to allow us access the cookies stored in the browser.
app.use(cookieParser());

app.use(express.static(__dirname + '/public'));

app.set('view engine','ejs');
// initialize express-session to allow us track the logged-in user across sessions.
app.use(
  session({
    key: "user_sid",
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 600000,
    },
  })
);

// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie("user_sid");
  }
  next();
});

// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    res.redirect("/profile"); 
    
  } else {
    next();
  }
};

// route for Home-Page
app.get("/", sessionChecker, (req, res) => {
  res.redirect("/login");
});

// route for user signup
app
  .route("/signup")
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + "/public/signup.html");
  })
  .post((req, res) => {

    var user = new User({
      username: req.body.username,
      email: req.body.email,
      password:req.body.password,
    });
    user.save((err, docs) => {
      if (err) {
        res.redirect("/signup");
      } else {
          console.log(docs)
        req.session.user = docs;
        res.redirect("/profile");
        
      }
    });
  });

// route for user Login
app
  .route("/login")
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + "/public/login.html");
  })
  .post(async (req, res) => {
    var username = req.body.username,
      password = req.body.password;
      var image = req.body.image;
      console.log(image);

      try {
        var user = await User.findOne({ username: username }).exec();
        if(!user) {
            res.redirect("/login");
        }
        user.comparePassword(password, (error, match) => {
            if(!match) {
              res.redirect("/login");
            }
        });
        req.session.user = user;
        
        // var cookie = parseCookies(req.body.username);
        // console.log(cookie.username);
        res.cookie('myuser',req.body.username); ////////////////////////
        res.redirect("/profile"); //dashboard
    } catch (error) {
      console.log(error)
    }
  });

// route for user's dashboard
app.get("/profile", async(req, res) => {
  let data = await User.findOne({username:req.cookies.myuser})
  if (data)
  {
    console.log(data.email);
    res.cookie('myemail',data.email);    //cookie for email of user
  }
  if (req.session.user && req.cookies.user_sid) {
    const person={
      name:req.cookies.myuser //cookie having username
    }
    res.render('profile',{person});
  } else {
    res.redirect("/login");
  }
});

// route for user logout
app.get("/logout", (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.clearCookie("user_sid");
    res.clearCookie("myuser");
    res.clearCookie("myemail");
    res.redirect("/");
     ///////////////////////////
  } else {
    res.redirect("/login");
  }
});
//route for email send get
app
  .route("/email-send")
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + "/public/email-send.html");
  })

//route for email send POST
app.post('/email-send',async(req,res) =>
{ 
    let data = await User.findOne({email:req.body.email});
    const responseType ={};
    if(data)
    {
      let otpcode = Math.floor((Math.random()*10000) + 1);
      let otpData = new Otp({
        email:req.body.email,
        code: otpcode,
        expireIn:new Date().getTime() + 300*1000
      })
      let otpResponse = await otpData.save();
      mailer(req.body.email,otpcode);
      res.redirect("/change-password");
    }
    else{
      responseType.statusText = "Error , "
      responseType.message = "Email ID does not Exist ";
    }
    res.status(200).json(responseType);
})


//route for change password get
app
  .route("/change-password")
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + "/public/change-password.html");
  })
//route for change password POST
app.post('/change-password',async(req,res) =>
{
    let data = await Otp.find({email:req.body.email,code:req.body.otpcode});
    const response = {};
    if(data)
    {
      let currentTime = new Date().getTime() * 1000;
      let diff = data.expireIn - currentTime;
      if(diff <= 0)
      {
        
        response.message = 'Token Expired'
        response.statusText = 'Error'
      }
      else{
        let user = await User.findOne({email:req.body.email})
        user.password = req.body.password;
        user.save();
        response.message = 'Password Changed Successfully'
        response.text = "Success"
      }
    }
    else{
      response.message = 'Invalid OTP'
      response.statusText = 'Error'
    }
    res.status(200).json(response);
})

//route for get SALE

  app.get('/Seller', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.render('Seller');
  } else {
    res.redirect("/login");
  }
})

//route for post SALE
// app.post('/Seller',async(req,res)=>{
// })


//checking route
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({ storage: storage })

app.use('/uploads', express.static('uploads'));

app.post('/Seller', upload.single('profile-file'), async (req, res, next) => {
  // req.file is the `profile-file` file
  // req.body will hold the text fields, if there were any
  // console.log(JSON.stringify(req.file))
  // var response = '<a href="/">Home</a><br>'
  // response += "Files uploaded successfully.<br>"
  // response += `<img src="${req.file.path}" /><br>`
  // return res.send(response)
  let data = await User.findOne({email:req.cookies.myemail}); //make email cookie here to check..
  const responseType ={};
    if(data)
    {
      let myRoom = new Sale({
        name:req.body.name,
        price: req.body.price,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        email: req.body.email,
        phone: req.body.phone,
        stay: req.body.stay,
        Date: req.body.date,
        image:JSON.stringify(req.file.originalname)
      })
      let updation = await myRoom.save();
      responseType.statusText = "Success , "
      responseType.message = "Your Room is online ";
    }
    else{
      responseType.statusText = "Error , "
      responseType.message = "Email ID does not Exist ";
    }
    res.status(200).json(responseType);

})

// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!");
});




//route for images
app.get('/Images:filename', function(req, res){
  var file = fs.readFileSync("Images/"+req.params.filename);
  res.header("content-type","image/jpg");
  res.send(file);
})

const mailer = (email,opt)=>{

  var nodemailer = require('nodemailer');
  var transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  secure: false,
  auth: {
  user: 'arhumsharif06@gmail.com',
  pass: 'iamagoodboy'
  }
  });
  
  var mailOptions = {
  from: 'arhumsharif06@gmail.com',
  to: email,
  subject: 'Reset your Password',
  text: 'Use this OTP code to reset your account : ' +opt
  };
  
  transporter.sendMail(mailOptions,function(error,info){
  if(error)
  {
  console.log(error);
  }
  else
  {
  console.log('Email Sent:' +info.response);
  }
  });
  
} 


// start the express server
app.listen(app.get("port"), () =>
  console.log(`App started on port ${app.get("port")}`)
);
