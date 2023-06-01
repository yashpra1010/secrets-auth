require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const app = express();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// if you want to change the port change here
const port = 3000;

app.use(
  session({
    secret: "Our Little Secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

async function main() {
    await mongoose.connect('mongodb://localhost:27017/secretsDB');
}
main().catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    secret:String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
    return cb(null, user);
    });
});

// Google OAuth API
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// GET REQUESTS
app.get("/", function (req, res) {
  res.render("home");
});

app.get("/api/users", async (req, res) => {
  try {
    const allUsers = await User.find({});
    res.status(200).json(allUsers);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

app.get('/auth/google',passport.authenticate('google', { scope: ['profile'] })
    );

app.get('/auth/google/secrets', passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/secrets');
    });

app.route("/login")
    .get((req,res)=>{
        res.render("login")
    })
    .post((req,res)=>{
        const user = new User({
            username:req.body.username,
            password:req.body.password
        })
        req.login(user,function(err){
            if(err){
                console.log(err);
                res.redirect("/login")
            } else {
                    passport.authenticate("local")(req,res,function(err){
                    res.redirect("/secrets")
                })
            }
        })
    })

app.route("/register")
    .get((req,res)=>{
        res.render("register")
    })
    .post((req,res)=>{
        User.register({username:req.body.username},req.body.password,function(err,user){
            if(err){
                console.log(err)
                res.redirect("/register")
            } else {
                    passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets")
                })
            }
        })  
    })

app.get("/secrets",function(req,res){
    User.find({secret:{$ne:null}}).then(function(foundUser){
        console.log(foundUser);
        res.render("secrets",{userSecret:foundUser})
    }).catch(function(err){
        console.log(err);
    })
})

app.route("/submit")
    .get((req,res)=>{
        if(req.isAuthenticated()){
            res.render("submit")            
        } else {
            res.redirect("/login")
        }
    })
    .post((req,res)=>{
        secret = req.body.secret
        userId = req.user.id
        User.findById(userId).then(function (foundUser) {
            foundUser.secret = secret
            foundUser.save()
            res.redirect("/secrets")
        }).catch(function (err) {
            console.log(err);
            res.redirect("/submit")
        })
    })

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        } else {
            res.redirect("/") 
        }
    })
})

app.listen(process.env.PORT || port, () => {
  console.log("Server is running at port: " + port + "/" + process.env.PORT);
});
