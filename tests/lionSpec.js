var expect = require('chai')
	.expect;
var fs = require('fs');
var Lion = require('../index')('lion');
var mockBody = {
	dep_date: "19+Jan+2014",
	ori: 'cgk',
	dst: 'dps'
};
var mockDataLion = fs.readFileSync('./li.html', 'utf8');
var debug = require('debug')('raabbajam:priceCacheCalendar:lionspec');
// var mockDataLion = {departure: {flights: [[{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], [{seats: [{class: "c", available: 1}, {class: "y", available: 1}, {class: "L", available: 1} ] } ], ] } }
/*
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
				fs.writeFileSync('./li2.html', lion._scrape);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
});
*/
describe('Cache prices for Lion', function() {
	this.timeout(80000);
	/*describe('getCheapestInRow, getAllCheapest', function () {
		var lion = new Lion(mockBody, mockDataLion);
		it('should return an array of object with ori, dst, class and flight property', function (next) {
			var cheapest = lion.getCheapestInRow(row);
			expect(cheapest.length).to.eq(3);
			expect(cheapest[0].class).to.eq("y");
			next();
		});
		it('should return an array cheapest class', function (next) {
			var flightClasses = lion.getAllCheapest(rows);
			debug(flightClasses);
			expect(Object.keys(flightClasses).length).to.gt(0);
			next();
		});
		it('should return an array of object with ori, dst, class and flight property', function (next) {
			var json = JSON.parse(fs.readFileSync('./licp.json', 'utf8'));
			var rows = lion.prepareRows(json);
			// debug('json',json);
			var aoCheapest = lion.getAllCheapest(rows);
			debug('aoCheapest', aoCheapest);
			next('');
		});
	});*/
	describe('merge', function() {
		it('should get all cheapest seat per row, get prices data from db or scrape if necessary and return it after merged', function(done) {
			var json = JSON.parse(fs.readFileSync('./licp.json', 'utf8'));
			var lion = new Lion(mockBody, mockDataLion);
			lion.merge(json)
				.then(function(res) {
					// debug(res);
					fs.writeFileSync('./licp2.json', JSON.stringify(res, null, 4));
					done();
				}, done);
		});
	});
});
