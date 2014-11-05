var expect = require('chai').expect;
var fs = require('fs');
var mockBody = {dep_date: "04+11+2014", ori: 'PDG', dst: 'SUB'};
var Lion = require('../index')('lion');
var mockDataLion = fs.readFileSync('./li.html', 'utf8');
var Garuda = require('../index')('garuda');
var mockDataGaruda = JSON.parse(fs.readFileSync('./ga.html', 'utf8'));
// var mockDataLion = {departure: {flights: [[{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], ] } }
describe('Price Generator', function () {
	this.timeout(10000);
	it('#Lion. It should return scrape data with cache, get all lowest price, compare with db, and insert if necessary', function (next) {
		var lion = new Lion(mockBody, mockDataLion);
		lion.run()
			.then(function (res) {
				// console.log(lion.scrape);
				fs.writeFileSync('./li2.html', lion._scrape);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('#Garuda. It should return scrape data with cache, get all lowest price, compare with db, and insert if necessary', function (next) {
		var garuda = new Garuda(mockBody, mockDataGaruda);
		garuda.run()
			.then(function (res) {
				// console.log(garuda.scrape);
				fs.writeFileSync('./li2.html', garuda._scrape);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
});