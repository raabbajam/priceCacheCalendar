var expect = require('chai').expect;
var fs = require('fs');
var Express = require('../index')('express');
var mockBody = {dep_date: "30+12+2014", ori: 'JOG', dst: 'PNK'};
// var mockDataExpress = fs.readFileSync('./ex.html', 'utf8');
var mockDataExpress = '';
var debug       = require('debug')('raabbajam:priceCacheCalendar:expressspec');
describe('Price Generator for Express', function () {
	this.timeout(20000);
	/*it('should extend base', function (next) {
		var express = new Express(mockBody, mockDataExpress);
		expect(express.name).to.equal('express');
		next();
	});
	it('should return cache', function (next) {
		var express = new Express(mockBody, mockDataExpress);
		express.getCache()
			.then(function () {
				expect(express.cache[mockBody.ori.toLowerCase()+mockBody.dst.toLowerCase()]).to.exist;
				// debug(express.cache);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});
	it('should loop get all routes', function (next) {
		var express = new Express(mockBody, mockDataExpress);
		var routes = express.getAllRoutes();
		debug('routes',routes);
		expect(routes.length).gt(0);
		next();
	});
	it('should get all routes cache', function (next) {
		var express = new Express(mockBody, mockDataExpress);
		var routes = express.getAllRoutes();
		express.getAllCaches(routes)
			.then(function () {
				debug('express.cache',express.cache);
				expect(express.cache).not.eq({});
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});*/
	/*it('should merge all cache', function (next) {
		var express = new Express(mockBody, mockDataExpress);
		var routes = express.getAllRoutes();
		express.getAllCaches(routes)
			.then(express.mergeCache.bind(express))
			.then(function (res) {
				// debug(JSON.stringify(express._scrape, null, 2));
				debug('lowestPrices', JSON.stringify(res, null, 2));
				debug(express.cache);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});*/
	/*it('should compare with db and insert to db if cheaper, for all lowest price', function (next) {
		var express = new Express(mockBody, mockDataExpress);
		var routes = express.getAllRoutes();
		express.getAllCaches(routes)
			.then(express.mergeCache.bind(express))
			.then(express.insertAllLowest.bind(express))
			.then(function (res) {
				console.log('HELLO BRO!!');
				fs.writeFileSync('./ci2.html', express._scrape);
				next();
			})
			.catch(function (err) {
				next(err);
			});
	});*/
});

describe('Cache prices for Express', function() {
	this.timeout(80000);
	/*describe('getCheapestInRow, getAllCheapest', function () {
		{//i
			var express = new Express(mockBody, mockDataExpress);
		}
		it('should return an array of object with ori, dst, class and flight property', function (next) {
			var cheapest = express.getCheapestInRow(row);
			debug('cheapest',cheapest)
			expect(cheapest[0].class).to.eq("Q0.1");
			next();
		});
		it('should return an array cheapest class', function (next) {
			var flightClasses = express.getAllCheapest(rows);
			debug('flightClasses',flightClasses);
			expect(Object.keys(flightClasses).length).to.gt(0);
			next();
		});
	});*/
	describe('merge', function() {
		it('should get all cheapest seat per row, get prices data from db or scrape if necessary and return it after merged', function (done) {
			var json = JSON.parse(fs.readFileSync('./excp.json', 'utf8'));
			var express = new Express(mockBody, 'mockDataExpress');
			// console.log(mockBody, express._dt)
			express.merge(json)
				.then(function (res) {
					// debug(res);
					fs.writeFileSync('./excp2.json', JSON.stringify(res,null, 4));
					done();
				}, done);
		});
	});
});
