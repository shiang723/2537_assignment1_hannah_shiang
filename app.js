/**
 * Was getting a DNS error with connecting to Mongodb
 * Found working solution from stackOverlow
 * Link: https://stackoverflow.com/questions/79875229/mongodb-connection-failed-error-querysrv-econnrefused
 */
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

require('./utils.js');
require('dotenv').config()
const express = require('express');
const session = require('express-session');
const MongoStore = require("connect-mongo").default ?? require("connect-mongo");
const bcrypt = require('bcrypt');
const Joi = require("joi");
const saltRounds = 12;

const app = express();

const PORT = process.env.PORT || 3000;
const expireTime = 1 * 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

/* Secret section start */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* Secret section end */

const { database } = include('databaseConnection');
const userCollection = database.db(mongodb_database).collection('users');

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
    crypto: {
        secret: mongodb_session_secret
    }
});


app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
    maxAge: expireTime
}
));

app.get('/', (req, res) => {
    if (!req.session.authenticated) {
        res.send(
            `<a href = "/signup"><button>Sign up</button></a>
            <br/>
            <a href = "/login"><button formAction = "/login">Log in</button><a>
        `);
    } else {
        res.send(
            `Hello ${req.session.name}
             <br/>
            <a href = "/members">
                <button>Go to Members Area</button>
            </a>
             <br/>
            <a href = "/logout">
                <button>Logout</button>
            </a>`
        );
    }
});

app.get('/signup', (req, res) => {
    res.send(
        `Create User
    <form action = "/signupSubmit" method = "post">
    <input name = "name" type = "text" placeholder = "name">
    <br/>
    <input name = "email" type = "email" placeholder = "email">
    <br/>
    <input name = "password" type = "password" placeholder = "password">
    <br/>
    <button>Submit</button>
    </form>`);
});

app.post('/signupSubmit', async (req, res) => {
    let html = "";
    if (!req.body.name || req.body.name == null) {
        html += `Name is required. <br/>`;
    } if (!req.body.email || req.body.email == null) {
        html += `Email is required. <br/>`;
    } if (!req.body.password || req.body.password == null) {
        html += `Password is required. <br/>`;
    } else {
        let name = req.body.name;
        let email = req.body.email;
        let password = req.body.password;
        req.session.authenticated = true;

        const schema = Joi.object(
            {
                name: Joi.string().alphanum().max(20).required(),
                email: Joi.string().max(30).required(),
                password: Joi.string().max(20).required()
            }
        );

        const validationResult = schema.validate({ name, email, password });

        if (validationResult.error != null) {
            console.log(validationResult.error);
            html += "Name, email, or password given is not valid<br/>";
        }
        else {
            let hashedPassword = await bcrypt.hash(password, saltRounds);
            await userCollection.insertOne({ name: name, email: email, password: hashedPassword });
            req.session.name = name;
            req.session.email = email;
            req.session.maxAge = expireTime;
            req.session.password = hashedPassword;

            return res.redirect('/members');
        }

    }
    res.send(html + `<a href = "/signup">Try again</a>`);
});

app.get('/login', (req, res) => {
    res.send(`Log In
        <form action = "/loginSubmit" method = "post">
        <input name = "email" type = "email" placeholder = "email">
        <br/>
        <input name = "password" type = "password" placeholder = "password">
        <br/>
        <button>Submit</button>
        </form>`);
});

app.post('/loginSubmit', async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    const schema = Joi.string().max(30).required();
    const validationResult = schema.validate(email);

    if (validationResult.error != null) {
        res.send(`Invalid email/password combination<br/><a href = "/login">Try again</a>`);
        return;
    }

    const result = await userCollection.find({ email: email }).project({ name: 1, password: 1 }).toArray();

    if (result.length != 1) {
        res.send(`Invalid email/password combination<br/><a href = "/login">Try again</a>`);
        return;
    }
    if (await bcrypt.compare(password, result[0].password)) {
        req.session.authenticated = true;
        req.session.name = result[0].name;
        req.session.cookie.maxAge = expireTime;

        res.redirect('/members');
        return;
    }
    else {
        res.send(`Invalid email/password combination<br/><a href = "/login">Try again</a>`);
        return;
    }
});

app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/');
    } else {
        let randNum = Math.floor(Math.random() * (4 - 1) + 1);
        let img = "/barbizon.avif"
        switch (randNum) {
            case 1:
                img = "/barbizon.avif";
                break;
            case 2:
                img = "/beach.jpg"
                break;
            case 3:
                img = "/rain_trees.jpg";
                break;
            default:
                break;
        }
        res.send(`
            <h1>Hello, ${req.session.name}.</h1>
            <br/>
            <img src = ${img} style='width:250px;'>
            <br/>
            <a href = '/logout'><button>Sign out</button></a>`);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.use(express.static(__dirname + "/public"));

app.use((req, res) => {
    res.status(404);
    res.send("Page not found - 404");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});