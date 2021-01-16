const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.get('/main', (req, res) => {
    res.send({
        temperature: 19,
        humidity: 40
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});