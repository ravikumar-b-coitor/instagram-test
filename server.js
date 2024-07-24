const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
	console.log(res);
	res.send('Hello World!');
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});