var expect = require('chai').expect;
var fs = require('fs');
var Lion = require('../index')('lion');
var mockBody = {dep_date: "04+11+2014", ori: 'PDG', dst: 'SUB'};
var mockDataLion = fs.readFileSync('./li.html', 'utf8');
// var mockDataLion = {departure: {flights: [[{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], ] } }
describe('Price Generator for Lion', function () {
	this.timeout(10000);
	it('should extend base', function (next) {
		var lion = new Lion(mockBody, mockDataLion);
		expect(lion.name).to.equal('lion');
		next();
	});
	it('should return cache', function (next) {
		var lion = new Lion(mockBody, mockDataLion);
		lion.getCache()
			.then(function () {
				expect(lion.cache[mockBody.ori.toLowerCase()+mockBody.dst.toLowerCase()]).to.exist;
				console.log(lion.cache);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should loop get all routes', function (next) {
		var lion = new Lion(mockBody, mockDataLion);
		var routes = lion.getAllRoutes();
		console.log(routes);
		expect(routes.length).gt(0);
		next();
	});
	it('should get all routes cache', function (next) {
		var lion = new Lion(mockBody, mockDataLion);
		var routes = lion.getAllRoutes();
		lion.getAllCaches(routes)
			.then(function () {
				console.log(lion.cache);
				expect(lion.cache).not.eq({});
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should merge all cache', function (next) {
		var lion = new Lion(mockBody, mockDataLion);
		var routes = lion.getAllRoutes();
		lion.getAllCaches(routes)
			.then(lion.mergeCache.bind(lion))
			.then(function (res) {
				// console.log(JSON.stringify(lion._scrape, null, 2));
				console.log(JSON.stringify(res, null, 2));
				console.log(lion.cache);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should compare with db and insert to db if cheaper, for all lowest price', function (next) {
		var lion = new Lion(mockBody, mockDataLion);
		var routes = lion.getAllRoutes();
		lion.getAllCaches(routes)
			.then(lion.mergeCache.bind(lion))
			.then(lion.insertAllLowest.bind(lion))
			.then(function (res) {
				// console.log(res);
				fs.writeFileSync('./li2.html', res);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
});