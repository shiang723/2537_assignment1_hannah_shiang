/*  To connect to Mongo database
    Using code by greencodecomments from 2537_Demo_1 
    Link: (https://github.com/greencodecomments/2537_Demo_1/blob/main/databaseConnection.js) 
          (https://github.com/greencodecomments/2537_Demo_1)
*/
require('dotenv').config();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

const MongoClient = require("mongodb").MongoClient;
const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/`;
var database = new MongoClient(atlasURI, {});
module.exports = {database};