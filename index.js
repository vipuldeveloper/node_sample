var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var connection = require('./dbconnection.js');
var Request = require("request");

app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.send('Hello World!')
});

app.get('/products',function(req,res){
    connection.query('SELECT * FROM product',
        function (err, rows, fields) {
            if (err) throw err;
            res.send(rows)
        });
});

app.post('/validateProduct', function(req,res){
    var start = new Date();
    var body = req.body;
    connection.query('SELECT * FROM product',
        function (err, products, fields) {
            var end = new Date() - start;
            console.log(end);

        var productFound = false;
        for (var i = 0; i < products.length; i++) {
            let pro = products[i];
            if (pro.productId == body.productId && pro.productName == body.productName) {
                productFound = true;
                break;
            }
        }
        res.send(productFound);
    });
});

app.post('/validateProductHttpCall', function(req,res){
    var start = new Date();
    var reqBody = req.body;
    var productFound = false;

    Request.get("http://localhost:5000/products", (error, response, body) => {
        if(error) {
            console.log(error);
        }
        let products = JSON.parse(body);

        for (let i = 0; i < products.length; i++) {
            let pro = products[i];
            if (pro.productId == reqBody.productId && reqBody.productName == body.productName) {
                productFound = true;
                break;
            }
        }
        let end = new Date() - start;
        let result = {
            'found': productFound,
            'time': end
        };
        res.send(result);
    });
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
