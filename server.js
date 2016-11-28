var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var mongourl = 'mongodb://demo:demo123@ds159767.mlab.com:59767/proj';
var mongoose = require('mongoose');
var assert = require('assert');
var fileUpload = require('express-fileupload');
var ObjectId = require('mongodb').ObjectID;
var Buffer = require('buffer').Buffer;


var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';

app.set('view engine','ejs');
app.use(fileUpload());
app.use(bodyParser.json());

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));

app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	}
	res.status(200).end('Hello, ' + req.session.username +
	  '!  This is a secret page!');
});

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/login.html');
});

app.post('/login',function(req,res) {
	var id = (req.body.userid != null) ? req.body.userid : null;
	var password = (req.body.password != null) ? req.body.password : null;
	if(id == null || password ==null) {
	res.end('Information not complete');
	}
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var userSchema = require('./user');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
		var User = mongoose.model('user',userSchema);
		User.findOne({userid: id}, function(err,result) {
			if (err) return console.error(err);
			if (result != null){
				if (password = result.password){
					db.close();
					req.session.authenticated = true;
					req.session.username = id;
					res.redirect('/read');
				}
				else {
					db.close()
					res.end('Wrong password');
				}
			}
			else {
				db.close();
				res.end('User do not exist');
			}
		});
	});

});

app.get('/register',function(req,res) {
	res.sendFile(__dirname + '/register.html');
});

app.post('/register',function(req,res) {
	var id = (req.body.userid != null) ? req.body.userid : null;
	var password = (req.body.password != null) ? req.body.password : null;
	if(id == null || password ==null) {
	res.end('Information not complete');
	}

	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var userSchema = require('./user');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
		var User = mongoose.model('user',userSchema);
		User.findOne({userid: id}, function(err,result) {
			if (err) return console.error(err);
			if (result == null) {
				var user = {}
				user['userid'] = id;
				user['password'] = password;
				var newUser = new User(user);
				
				newUser.save(function(err) {
					if (err) throw err;
					console.log('Insert success'+JSON.stringify(newUser))
					db.close()
					res.end('User '+id+' added.');

				});
			}
			else {
			db.close();
			console.log(result);
			res.end('User exist');
			}
		});
	});
});

app.get('/create',function(req,res) {
	res.sendFile(__dirname + '/create.html');
});

app.post('/create',function(req,res) {
	var r = {};
	r['name'] = (req.body.name != null) ? req.body.name : null;
	r['borough'] = (req.body.borough != null) ? req.body.borough : null;
	r['cuisine'] = (req.body.cuisine != null) ? req.body.cuisine : null;
	r['address'] = {};
	r.address.street = (req.body.street != null) ? req.body.street : null;
	r.address.building = (req.body.building != null) ? req.body.street : null;
	r.address.zipcode = (req.body.zipcode != null) ? req.body.zipcode : null;
	r.address['coord'] = {};
	r.address.coord.lon = (req.body.lon != null) ? req.body.lon : null;
	r.address.coord.lat = (req.body.lat != null) ? req.body.lat : null;
	r['photo'] = (new Buffer(req.files.photo.data).toString('base64') != null) ? new Buffer(req.files.photo.data).toString('base64') : null;
	r['owner'] = (req.session.username != null) ? req.session.username : null;

	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function() {
		var Restaurant = mongoose.model('restaurant',restSchema);
		var newR = new Restaurant(r);
		newR.save(function(err) {
			if (err) {
			db.close();
			res.end('Insertion failed');
			}
			else {
			db.close();
			res.end('Insertion of '+r.name+' success');
			}
		});	
	});
});

app.get('/read', function(req,res) {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find(function(err,result){
		if(err) return console.error(err);
		if(result != null) {
		db.close();
		var rest = {};
		rest = result;
		res.render("list", {r:rest});
		}
		else {
		db.close();
		res.end('No Restaurant');
		}
		});
	});
});

app.get('/readDetails', function(req,res) {
	var id = req.query.id;
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.findOne({_id:ObjectId(id)}, function(err,result){
		if (err) return console.error(err);
		if (result != null) {
		db.close();
		res.render("show", {r:result});
		}
		else {
		db.close();
		res.end('Restaurant not found');
		}
		});
	});
});

app.get('/delete', function(req,res) {
	var uname = req.query.owner;
	var id = req.query.id;
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		if (uname == req.session.username) {
		Restaurant.remove({_id:ObjectId(id)}, function(err,result){
		if (err) return console.error(err);
		db.close();
		res.redirect('/read');
		});
		}
		else {
		db.close();
		res.end('You are not document owner.')
		}
	});
});

app.get('/update',function(req,res) {
	var uname = req.query.owner;
	var id = req.query.id;
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function() {
	var Restaurant = mongoose.model('restaurant',restSchema);
		if (uname == req.session.username) {
		Restaurant.findOne({_id:ObjectId(id)}, function(err,result) {
		if (err) return console.error(err);
		db.close();
		res.render("update", {r:result});
		});
		}
		else {
		db.close();
		res.end('You are not owner');
		}
	});
});

app.post('/update',function(req,res) {
	var id = req.query.id;
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.update({_id:ObjectId(id)},{$set: {name:req.body.name, borough:req.body.borough, cuisine:req.body.cuisine, street:req.body.cuisine, building:req.body.street, zipcode:req.body.zipcode, lon:req.body.lon, lat:req.body.lat, photo:new Buffer(req.files.photo.data).toString('base64')}},function(err,result) {
		if (err) return console.error(err);
		if (result != null) {
		db.close();
		res.end('updated');
		}
		else {
		db.close();
		res.end('update failed.');
		}
		});
	});
});

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.listen(process.env.PORT || 8099);
