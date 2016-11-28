var mongoose = require('mongoose');
var restSchema = mongoose.Schema({
	id: mongoose.Schema.ObjectId,
	name: {type: String, required:true},
	borough: String,
	cuisine: String,
	address: {
		street: String,
		building: String,
		zipcode: String,
		coord: {
			lon: String,
			lat: String
			}
	},
	photo: String,
	owner: String,
	rate: [
		{
		rname: String,
		score: String
		}
	      ]
});
module.exports = restSchema;
