var expect = require('chai').expect;
var fs = require('fs');
var Airasia = require('../index')('airasia');
var mockBody = {dep_date: "30+12+2014", ori: 'cgk', dst: 'sub'};
var mockDataAirasia = JSON.parse(fs.readFileSync('./aa.json', 'utf8'));
// var mockDataAirasia = '';
var debug       = require('debug')('raabbajam:priceCacheCalendar:airasiaspec');
describe('Price Generator for Airasia', function () {
	this.timeout(20000);
	/*it('should extend base', function (next) {
		var airasia = new Airasia(mockBody, mockDataAirasia);
		expect(airasia.name).to.equal('airasia');
		next();
	});
	it('should return cache', function (next) {
		var airasia = new Airasia(mockBody, mockDataAirasia);
		airasia.getCache()
			.then(function () {
				expect(airasia.cache[mockBody.ori.toLowerCase()+mockBody.dst.toLowerCase()]).to.exist;
				// debug(airasia.cache);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should loop get all routes', function (next) {
		var airasia = new Airasia(mockBody, mockDataAirasia);
		var routes = airasia.getAllRoutes();
		debug('routes',routes);
		expect(routes.length).gt(0);
		next();
	});
	it('should get all routes cache', function (next) {
		var airasia = new Airasia(mockBody, mockDataAirasia);
		var routes = airasia.getAllRoutes();
		airasia.getAllCaches(routes)
			.then(function () {
				debug('airasia.cache',airasia.cache);
				expect(airasia.cache).not.eq({});
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});*/
	/*it('should merge all cache', function (next) {
		var airasia = new Airasia(mockBody, mockDataAirasia);
		var routes = airasia.getAllRoutes();
		airasia.getAllCaches(routes)
			.then(airasia.mergeCache.bind(airasia))
			.then(function (res) {
				// debug(JSON.stringify(airasia._scrape, null, 2));
				debug('lowestPrices', JSON.stringify(res, null, 2));
				debug(airasia.cache);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});*/
	it('should compare with db and insert to db if cheaper, for all lowest price', function (next) {
		var airasia = new Airasia(mockBody, mockDataAirasia);
		var routes = airasia.getAllRoutes();
		airasia.getAllCaches(routes)
			.then(airasia.mergeCache.bind(airasia))
			.then(airasia.insertAllLowest.bind(airasia))
			.then(function (res) {
				console.log('HELLO BRO!!');
				fs.writeFileSync('./ci2.html', airasia._scrape);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
});

describe('Cache prices for Airasia', function() {
	this.timeout(80000);
	/*describe('getCheapestInRow, getAllCheapest', function () {
		{//i
			var airasia = new Airasia(mockBody, mockDataAirasia);
		}
		it('should return an array of object with ori, dst, class and flight property', function (next) {
			var cheapest = airasia.getCheapestInRow(row);
			debug('cheapest',cheapest)
			expect(cheapest[0].class).to.eq("Q0.1");
			next();
		});
		it('should return an array cheapest class', function (next) {
			var flightClasses = airasia.getAllCheapest(rows);
			debug('flightClasses',flightClasses);
			expect(Object.keys(flightClasses).length).to.gt(0);
			next();
		});
	});*/
	/*describe('merge', function() {
		it('should get all cheapest seat per row, get prices data from db or scrape if necessary and return it after merged', function (done) {
			var json = JSON.parse(fs.readFileSync('./aacp.json', 'utf8'));
			var airasia = new Airasia(mockBody, mockDataAirasia);
			airasia.merge(json)
				.then(function (res) {
					// debug(res);
					fs.writeFileSync('./aacp2.json', JSON.stringify(res,null, 4));
					done();
				}, done);
		});
	});*/
});
