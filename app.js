require('dotenv').config();

const express = require("express");
const axios = require('axios');
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const bcrypt = require("bcrypt");

const databaseURI = process.env.DATABASE_URI;
const secret = process.env.SECRET_KEY;
const apiKey = process.env.API_KEY;
const port = process.env.PORT || 3000

app.set('view engine', 'ejs');

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// setup passport
passport.use(new LocalStrategy(
    async function (username, password, done) {
        try {
            const user = await User.findOne({ username: username }).exec();
            if (!user) {
                return done(null, false, { message: 'Invalid username or password' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Invalid username or password' });
            }
        } catch (error) {
            return done(error);
        }
    }
));


passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
    try {
        const user = await User.findById(id).exec();
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// setup user model 
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    age: Number,
    weight: Number,
    height: Number,
    email: String
});

const workoutSchema = new mongoose.Schema({
    name: String,
    description: String,
    calories_per_hour: Number
});

const User = mongoose.model("User", userSchema);
const Workout = mongoose.model("Workout", workoutSchema);

// connect to mongodb
mongoose.connect(databaseURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.log("Error connecting to MongoDB: ", err);
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}

app.get("/register", async (req, res) => {
    try {
        // Query the database to retrieve the workout details
        const workouts = await Workout.find({}, { calories_per_hour: 0 }).exec();

        // Render the workout.ejs template and pass the workout details to it
        res.render("workout", { workouts });
    } catch (error) {
        console.log(error);
        // Handle error
    }
});

app.post("/register", async (req, res) => {
    // handle user registration
    const { username, password, age, weight, height, email } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, age, weight, height, email });
        await user.save();
        res.redirect("/login");
    } catch (error) {
        console.log(error);
        // Handle error
    }
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

app.get("/", ensureAuthenticated, async (req, res) => {
    var by = "";
    const category = "fitness";
    try {
        const response = await axios.get('https://api.api-ninjas.com/v1/quotes?category=fitness', {
            headers: {
                'X-Api-Key': apiKey
            }
        });

        const quote = response.data[0]['quote'];
        res.render("index", { quote });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch random quote' });
    }
});

app.get("/workouts", ensureAuthenticated, async (req, res) => {
  try {
    const workouts = await Workout.find().lean();
    res.render("workouts", { workouts });
  } catch (error) {
    console.log(error);
    // Handle error
  }
});

app.listen(port, () => {
    console.log("Server is running on port: " + port);
});
