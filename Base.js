var Class = require('./libs/Class');
var Promise = require('promise');
var moment = require('moment');
var dateFormats = ['DD+MM+YYYY','DD+MMM+YYYY','DD MM YYYY','DD MMM YYYY'];
var airlines = {"airasia": 1, "citilink": 2, "garuda": 3, "lion": 4, "sriwijaya": 5, "xpress": 6};
var db = require('./libs/db');
/**
 * Intiailizing
 * @param  {String} airline Airline's name
 * @param  {Object} _db     Database model
 */
function init (airline, _db) {
	this.name = this.airline = airline;
	this._kode = airlines[airline];
	this.db = _db || db;
	this.cache = {};
};
/**
 * Loop the scrape data and get all routes
 * @return {Array} Array of string paired routes of origin and destination
 */
function getAllRoutes () {
};
/**
 * Get all cache price data of specified origin and destination
 * @param  {String} ori Origin route
 * @param  {String} dst Destination route
 * @return {Object}     Data cache price
 */
function getCache (ori, dst) {
	var _this = this;
	return new Promise(function (resolve, reject) {
		var _ori = ori && ori.toLowerCase() || _this._dt.ori;
		var _dst = dst && dst.toLowerCase() || _this._dt.dst;
		var query = {"size":0, "query": {"filtered": {"filter": {"and" : [{ "term": { "origin": _ori } }, { "term": { "destination": _dst} }, { "term": { "airline": _this.name} } ] } } }, "aggs": {"groupFlight": {"terms": {"field": "flight", }, "aggs": {"groupClass": {"terms": {"field": "class", }, "aggs": {"minPrice": {"min": {"field":"price"} } } } } } } };
		// console.log(JSON.stringify(query, null, 2));
		_this.db.search('pluto', 'price', query, function (err, res) {
			if (err)
				return reject(err)
			res = JSON.parse(res);
			// console.log(JSON.stringify(res, null, 2));
			var flightList = {};
			res.aggregations.groupFlight.buckets.forEach(function (flight) {
				var classList = {};
				flight.groupClass.buckets.forEach(function (seat) {
					classList[seat.key] = Math.round(seat.minPrice.value / 10) * 10;
				});
				flightList[flight.key] = classList;
			});
			var currentRoute = _ori + _dst;
			_this.cache[currentRoute] = flightList;
			resolve();
		});
	});
};
/**
 * Get all cache from an array of routes
 * @param  {Array} routes Routes of origin and destination cities
 * @return {Object}        Data cache price
 */
function getAllCaches (routes) {
	var _this = this;
	var promises = [];
	routes.forEach(function (route) {
		// console.log(route);
		promises.push(_this.getCache(route.substr(0,3), route.substr(3,3)));
	});
	return Promise.all(promises);
};
/**
 * Inserting data cache price from an array of results
 * @param  {Object} res Array of object containing data of lowest price available
 */
function insertAllLowest (res) {
	var promises = [];
	var _this = this;
	var _dt = _this._dt
	var _date = moment(_dt.dep_date, dateFormats).unix() * 1000;
	Object.keys(res).forEach(function (prop, i) {
		if (!res[prop])
			return true;
		var _price = parseInt(res[prop], 10) + _this._kode;
		var data  = {
			date: _date,
			origin: prop.substr(0, 3),
			destination: prop.substr(3, 3),
			price: _price,
			airline: _this.airline
		}
		data.id = data.origin + data.destination + data.date / 1000;
		promises.push(_this.insertLowest(data));
	});
	return Promise.all(promises, function (res) {
		console.log(res);
	});
};
/**
 * Inserting data cache price to db
 * @param  {Object} data Cache price data from scrape
 */
function insertLowest (data) {
	var _this = this;
	var _price = data.price;
	return new Promise(function (resolve, reject) {
		_this.db.get('pluto', 'calendar', data.id, function (err, res) {
			var res = JSON.parse(res);
			var oldPrice = (res._source && res._source.price) || 0;
			console.log(oldPrice, _price, data);
			if ( oldPrice === _price || (oldPrice !== 0 && _price >= oldPrice && res._source.airline !== _this._airline)) {
				resolve(false);
			} else {
				data.price = _price;
				_this.db.index('pluto', 'calendar', data, function (err, res) {
					console.log('found lower price, inserting to calendar...', res)
					resolve(res);
				});
			}
		});
	});
};
/**
 * Getting all routes by looping scrape data, and getting all cache specified by all routes
 * merge data cache with scrape data, getting lowest price from disting routes, compare it with
 * saved data in db and replace it if necessary
 * @return {String} Scrape data that already looped and merged with cache data, and checking for
 * cheapest available seat price in beetwen
 */
function run () {
	var _this = this;
	var routes = _this.getAllRoutes();
	return _this.getAllCaches(routes)
		.then(_this.mergeCache.bind(_this))
		.then(_this.insertAllLowest.bind(_this))
		.then(function (res) {
			return _this._scrape;
		})
		.catch(function (err) {
			console.log('Error priceCacheCalendar: ' + err);
			return _this._scrape;
		})
}
var BasePrototype = {
	init: init,
	getCache: getCache,
	getAllRoutes: getAllRoutes,
	getAllCaches: getAllCaches,
	insertLowest: insertLowest,
	insertAllLowest: insertAllLowest,
	run: run
};
var Base = Class.extend(BasePrototype);
module.exports = Base;