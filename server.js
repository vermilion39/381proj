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
var router = express.Router();


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
	if (!req.session.authenticated) {
		res.redirect('/login');
	}
	res.redirect('/read');
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
				if (password == result.password){
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
	r.address.building = (req.body.building != null) ? req.body.building : null;
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
		res.render("list", {r:rest, u:req.session});
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
		if (new Buffer(req.files.photo.data).toString('base64') != "") {
		Restaurant.update({_id:ObjectId(id)},{$set: {photo:new Buffer(req.files.photo.data).toString('base64')}},function(){
		db.close();		
		});
		}
			Restaurant.update({_id:ObjectId(id)},{$set: {name:req.body.name, borough:req.body.borough, cuisine:req.body.cuisine, "address.street":req.body.street, "address.building":req.body.building, "address.zipcode":req.body.zipcode, "address.coord.lon":req.body.lon, "address.coord.lat":req.body.lat}},function(err,result) {
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

app.post('/search',function(req,res) {
	if(req.body.type == "rname") {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find({name:req.body.rest}, function(err,result) {
		if(err) return console.error(err);
		if(result != null) {
		db.close();
		var rest = {};
		rest = result;
		res.render("list", {r:rest, u:req.session});
		}
		else {
		db.close();
		res.end('No Restaurant');
		}
		});
	});
	}
	if(req.body.type == "rborough") {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find({borough:req.body.rest}, function(err,result) {
		if(err) return console.error(err);
		if(result != null) {
		db.close();
		var rest = {};
		rest = result;
		res.render("list", {r:rest, u:req.session});
		}
		else {
		db.close();
		res.end('No Restaurant');
		}
		});
	});
	}
	if(req.body.type == "rcuisine") {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find({cuisine:req.body.rest}, function(err,result) {
		if(err) return console.error(err);
		if(result != null) {
		db.close();
		var rest = {};
		rest = result;
		res.render("list", {r:rest, u:req.session});
		}
		else {
		db.close();
		res.end('No Restaurant');
		}
		});
	});
	}
});

app.post('/rate',function(req,res) {
	var id = req.query.id;
	var valid = true;
	var count = 0;
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function() {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find({_id:ObjectId(id)},function(err,result) {
		if (err) return console.error(err);
		result.forEach(function(rest) {
			console.log(rest.rate);
			var rr = rest.rate;
			rr.forEach(function(ra) {
			console.log(ra.rname);
			if (ra == null) {
			return false;
			}
			if (req.session.authenticated != true) {
			valid = false;
			db.close();
			return false;
			}
			if (ra.rname == req.session.username) {
			valid = false;
			db.close();
			return false;
			}
			count++;
			});
		});
		if (req.body.score<0 || req.body.score>10) {
		db.close();
		res.end('Score should between 0 and 10');
		}else if (valid) {
		Restaurant.update({_id:ObjectId(id)},{$push:{rate:{rname:req.session.username, score:req.body.score}}},function(err,result) {
		if (err) return console.error(err);
		if (result != null) {
		db.close();
		res.end('Rated');
		} else {
		db.close();
		res.end('Rate failed');
		}
		});
		}
		else if (req.session.authenticated == true){
		res.end('You have rated this restaurant');
		}
		else if (req.session.authenticated != true){
		res.end('You must login to rate');
		}
		});
	});

});

router.route('/create')

.post(function(req, res) {
		
	var r = {};
	r = req.body;
	if (r.name != null) {
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
			res.json({message: 'Insertion failed'});
			}
			else {
			db.close();
			res.json({
				status: 'ok, _id:' +newR._id
			});
			}
		});	
	});
	} else {
	res.json({
	status: 'failed'
	});
	}
})

router.route('/read/:type/:findBy')

.get(function(req, res) {
	console.log(req.params.type);
	console.log(req.params.findBy);
	if (req.params.type == 'name') {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find({name:req.params.findBy}, function(err,result) {
		if(err) return console.error(err);
		if(result != null) {
		db.close();
		res.json(result);
		}
		else {
		db.close();
		res.json({});
		}
		});
	});
	}
	else if (req.params.type == 'borough') {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find({borough:req.params.findBy}, function(err,result) {
		if(err) return console.error(err);
		if(result != null) {
		db.close();
		res.json(result);
		}
		else {
		db.close();
		res.json({});
		}
		});
	});
	}
	else if (req.params.type == 'cuisine') {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	var restSchema = require('./restaurant');
	db.on('eror', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
	var Restaurant = mongoose.model('restaurant',restSchema);
		Restaurant.find({cuisine:req.params.findBy}, function(err,result) {
		if(err) return console.error(err);
		if(result != null) {
		db.close();
		res.json(result);
		}
		else {
		db.close();
		res.json({});
		}
		});
	});
	}
	else {
	res.json({message: 'incorrect path name'});
	}
})

app.use('/api', router);

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.listen(process.env.PORT || 8099);
