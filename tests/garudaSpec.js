var expect = require('chai').expect;
var fs = require('fs');
var Garuda = require('../index')('garuda');
var mockBody = {dep_date: "04+11+2014", ori: 'PDG', dst: 'SUB'};
var mockDataGaruda = JSON.parse(fs.readFileSync('./ga.html', 'utf8'));
// var mockDataGaruda = {departure: {flights: [[{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], ] } }
describe('Price Generator for Garuda', function () {
	this.timeout(10000);
	it('should extend base', function (next) {
		var garuda = new Garuda(mockBody, mockDataGaruda);
		expect(garuda.name).to.equal('garuda');
		next();
	});
	it('should return cache', function (next) {
		var garuda = new Garuda(mockBody, mockDataGaruda);
		garuda.getCache()
			.then(function () {
				expect(garuda.cache[mockBody.ori.toLowerCase()+mockBody.dst.toLowerCase()]).to.exist;
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should loop get all routes', function (next) {
		var garuda = new Garuda(mockBody, mockDataGaruda);
		var routes = garuda.getAllRoutes();
		// console.log(routes);
		expect(routes.length).gt(0);
		next();
	});
	it('should get all routes cache', function (next) {
		var garuda = new Garuda(mockBody, mockDataGaruda);
		var routes = garuda.getAllRoutes();
		garuda.getAllCaches(routes)
			.then(function () {
				// console.log(garuda.cache);
				expect(garuda.cache).not.eq({});
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should merge all cache', function (next) {
		var garuda = new Garuda(mockBody, mockDataGaruda);
		var routes = garuda.getAllRoutes();
		garuda.getAllCaches(routes)
			.then(garuda.mergeCache.bind(garuda))
			.then(function (res) {
				// console.log(JSON.stringify(garuda._scrape, null, 2));
				console.log(JSON.stringify(res, null, 2));
				console.log(garuda.cache);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should compare with db and insert to db if cheaper, for all lowest price', function (next) {
		var garuda = new Garuda(mockBody, mockDataGaruda);
		var routes = garuda.getAllRoutes();
		garuda.getAllCaches(routes)
			.then(garuda.mergeCache.bind(garuda))
			.then(garuda.insertAllLowest.bind(garuda))
			.then(function (res) {
				// console.log(res);
				fs.writeFileSync('./ga2.html', JSON.stringify(res, null, 2));
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
});