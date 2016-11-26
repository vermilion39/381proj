var mongoose = require('mongoose');
var userSchema = mongoose.Schema({
	id: mongoose.Schema.ObjectId,
	userid: {type: String, required:true},
	password: {type: String, required:true}
});
module.exports = userSchema;
