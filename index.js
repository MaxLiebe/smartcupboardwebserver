const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;
const database = JSON.parse(fs.readFileSync('default-database.json'));

let temperature = 0;
let humidity = 0;

app.use(express.json());
app.get('/home', (req, res) => {
    res.send({
        temperature: 19,
        humidity: 40
    });
});

app.get('/pantry', (req, res) => {
    res.send(database.pantry);
});

app.get('/list', (req, res) => {
    res.send(database.shoppinglist);
});

app.get('/recipies', (req, res) => {
    res.send(database.recipies);
});

app.listen(port, () => {
    console.log(`Server listening at port ${port}`);
});