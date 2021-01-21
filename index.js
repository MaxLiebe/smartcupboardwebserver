const express = require('express');
const fs = require('fs');
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const app = express();
const port = 3000;
const database = JSON.parse(fs.readFileSync('default-database.json'));
let userDatabase = {
    pantry: []
};
fs.readFile('user-database.json', (err, db) => {
    if (err) {
        console.log('User database doesn\'t exist.');
        return;
    }
    userDatabase = JSON.parse(db);
});

let temperature = '0';
let humidity = '0';

SerialPort.list()
    .then(ports => {
        let comPort = ports.filter(port => port.manufacturer.includes('arduino'))[0];
        let serial = new SerialPort(comPort.path, { baudRate: 9600 });
        let parser = serial.pipe(new Readline());
        parser.on('data', data => {
            let parsed = data.split(/T|H|\r/);
            parsed.shift();
            temperature = parseFloat(parsed[0]).toFixed(1);
            humidity = parseFloat(parsed[1]).toFixed(1);
            console.log(`Got new values. Temperature: ${temperature}, humidity: ${humidity}`);
        });
    });

app.use(express.json());
app.get('/home', (req, res) => {
    res.send({ temperature, humidity });
});

app.get('/pantry', (req, res) => {
    res.send(userDatabase.pantry);
});

app.post('/pantry', (req, res) => {
    let productName = req.body.name;
    let d = new Date();
    let timeStamp = d.getTime();
    userDatabase.pantry.push({
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        name: productName,
        timestamp: timeStamp
    });
    fs.writeFileSync('user-database.json', JSON.stringify(userDatabase));
    res.send();
});

app.get('/products', (req, res) => {
    res.send(database.products);
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