//MAKE SURE TO ADD firebase-service-key.json IN THE ROOT PATH OF THIS PROJECT, OR THE NOTIFCATION SERVICE WILL NOT WORK!

const express = require('express');
const app = express();
const fs = require('fs');
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const firebaseAdmin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount)
});
const messagingService = firebaseAdmin.messaging();
const port = 3000;
const database = JSON.parse(fs.readFileSync('default-database.json'));
let userDatabase = {
    pantry: [],
    fcmTokens: []
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

app.get('/registertoken/:token', (req, res) => {
    let token = req.params.token;
    if (userDatabase.fcmTokens.indexOf(token) === -1) userDatabase.fcmTokens.push(token);
    fs.writeFileSync('user-database.json', JSON.stringify(userDatabase));
    res.send();
});

app.get('/home', (req, res) => {
    res.send({ temperature, humidity });
});

app.get('/pantry', (req, res) => {
    let toSend = userDatabase.pantry;
    toSend.forEach((item, index) => {
        toSend[index].expirationDays = database.products.find(product => product.name === item.name).expirationDays;
    });
    res.send(toSend);
});

app.post('/pantry', (req, res) => {
    let productName = req.body.name;
    let d = new Date();
    let timeStamp = d.getTime();
    userDatabase.pantry.push({
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        name: productName,
        timestamp: timeStamp,
        hasSentWarning: false
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

setInterval(() => {
    let curTime = new Date().getTime();
    userDatabase.pantry.forEach(item => {
        if (!item.hasSentWarning) {
            let expirationDays = database.products.find(product => product.name === item.name).expirationDays;
            const oneDay = 24 * 60 * 60 * 1000;
            const diffDays = Math.round(Math.abs((item.timestamp - curTime) / oneDay));
            if (diffDays >= expirationDays - 1) {
                let message = {
                    notification: {
                        title: `Your ${item.name} will expire in a day!`,
                        body: 'Open the app to find recipies!'
                    }
                }
                let options = {
                    priority: "high",
                    timeToLive: 60 * 60 * 4
                };
                userDatabase.fcmTokens.forEach(token => {
                    messagingService.sendToDevice(token, message, options);
                })
                item.hasSentWarning = true;
            }
        }
    });
    fs.writeFileSync('user-database.json', JSON.stringify(userDatabase));
}, 10000);