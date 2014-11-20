var Class       = require('./libs/Class');
var Promise     = require('promise');
var moment      = require('moment');
var _           = require('underscore');
var dateFormats = ['DD+MM+YYYY','DD+MMM+YYYY','DD MM YYYY','DD MMM YYYY'];
var airlines    = {"airasia": 1, "citilink": 2, "garuda": 3, "lion": 4, "sriwijaya": 5, "xpress": 6};
var db          = require('./libs/db');
_.mixin(require('underscore.deep'));
/**
 * Intiailizing
 * @param  {String} airline Airline's name
 * @param  {Object} _db     Database model
 */
function init (airline, args) {
	this.name = this.airline = airline;
	this._kode = airlines[airline];
	this.setOptions(args);
};
/**
 * setting options, using one arguments: an object with key-value pair,
 * or two arguments, with the first as key and second as value
 */
function setOptions() {
	if (arguments.length === 1) {
		var args = arguments[0];
		var defaults = {
			index: 'pluto',
			type: 'price',
			db: db,
			cache: {},
			cachePrices: {},
		}
		var options = _.deepExtend(defaults, args);
		for (var key in defaults) {
			var value = options[key];
			this[key] = value;
			if (typeof this[key] === 'string')
				this[key] = this[key].toLowerCase();
		}
	} else {
		var key = arguments[0];
		var value = arguments[1];
		this[key] = value;
	}
	return this;
}
/**
 * alias for setOptions
 */
function setOption() {
	return setOptions.apply(this, arguments);
}
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
/**
 * return an array of object with ori, dst, class and flight property
 * @param  {Object} row Row object
 * @return {Array}     An array of object with ori, dst, class and flight property
 */
function getCheapestInRow (row) {
	//implement on child
}
/**
 * return an array cheapest class
 * @param  {Array} rows Array of row
 * @return {Object}      return an array cheapest class, by rute by flight
 */
function getAllCheapest (rows) {
	var _this = this;
	var flightClasses = {}
	rows.forEach(function (row) {
		var cheapests = _this.getCheapestInRow(row);
		cheapests.forEach(function (cheapest) {
			var rute = cheapest.ori + cheapest.dst;
			var flight = cheapest.flight.toLowerCase();
			var _class = cheapest.class.toLowerCase();
			rute = rute.toLowerCase();
			if (!flightClasses[rute])
				flightClasses[rute] = {};
			if (!flightClasses[rute][flight])
				flightClasses[rute][flight] = [];
			if (flightClasses[rute][flight].indexOf(_class) === -1)
				flightClasses[rute][flight].push(_class);
		});
	})
	return flightClasses;
}
/**
 * internal function used when saving data to db
 * @param  {Object} data Save to db
 * @return {string}      id for db
 */
function generateId (data) {
	var id = data.origin + data.destination + data.airline + data.flight + data.class;
	// console.log(id);
	return id.toLowerCase();
}
/**
 * Get cache data from db
 * @return {Object} Data price for current dt
 */
function getCachePrices (ids) {
	var _this = this;
	return new Promise(function (resolve, reject) {
		if (!(ids instanceof Array))
			ids = [ids];
		// console.log(ids);
		_this.db.multiget(_this.index, _this.type, ids, function (err, res) {
			if (err)
				return reject(err)
			try {res = JSON.parse(res)} catch(err) { return reject(err)}
			if (!res.docs)
				return reject(new Error('No cache found'));
			var docs = res.docs;
			var losts = [];
			// console.log(JSON.stringify(docs, null, 2));
			docs.forEach(function (doc) {
				if (!doc.found)
					return losts.push(doc)
			})
			if (losts.length === 0)
				return resolve(_this.docsToCachePrices(docs));
			var err = new Error('Some are lost.');
			losts.map(function (lost) {
				return lost._id;
			})
			err.losts = losts;
			return reject(err);
		});
	})
	.catch(function (err) {
		return Promise.reject(err);
	});
}
/**
 * getting all cache based on cheapest flight data
 * @param  {Object} data Cheapest flight data
 * @return {Object}      Promise with losts and founds
 */
function getAllCachePrices (data) {
	var ids = [];
	var _airline = this.airline;
	_.each(data, function (value, key) {
		var _rute = key;
		_.each(value, function (_value, _key) {
			var _flight = _key;
			_value.forEach(function (_class) {
				var id = _rute + _airline + _flight + _class;
				ids.push(id.toLowerCase());
			})
		});
	});
	return this.getCachePrices(ids);
}
/**
 * Generate data to scrape from id
 * @param  {String} id String id from database
 * @return {Object}    Object data for scrape
 */
function generateData (id) {
	// implement on child
}
/**
 * Scrape lost data
 * @param  {String} id Data generated id to scrape
 * @return {Object}    Return cache data after scrape it
 */
function scrapeLostData (id) {
	//implement on child
}
/**
 * Scrape all losts data
 * @param  {Array} data Array of ids
 * @return {Object}      Return last data, after this finish all cache are scraped
 */
function scrapeAllLostData (data) {
	var _this = this;
	return data.reduce(function (sequence, id) {
		return sequence.then(_this.scrapeLostData.bind(_this, id))
	}, Promise.resolve());
}
/**
 * Saving cached docs from db to global object cachePrices
 * @param  {Object} docs Data from database
 * @return {Object}      Global object cachePrices
 */
function docsToCachePrices (docs) {
	var _this = this;
	var _cachePrices = _this.cachePrices;
	docs.forEach(function (doc) {
		var source = doc._source;
		var flight = source.flight.toLowerCase();
		var _class = source.class.toLowerCase();
		var rute = source.origin + source.destination;
		rute = rute.toLowerCase();
		if (!_this.cachePrices[rute])
			_cachePrices[rute] = {};
		if(!_cachePrices[rute][flight])
			_cachePrices[rute][flight] = {};
		_cachePrices[rute][flight][_class] = source.prices;
	})
	return _cachePrices
}
function mergeCachePrices (json) {
	//implemented on child
}
var BasePrototype = {
	init             : init,
	setOption        : setOption,
	setOptions       : setOptions,
	getCache         : getCache,
	getAllRoutes     : getAllRoutes,
	getAllCaches     : getAllCaches,
	insertLowest     : insertLowest,
	insertAllLowest  : insertAllLowest,
	run              : run,
	getCheapestInRow : getCheapestInRow,
	getAllCheapest   : getAllCheapest,
	getCachePrices   : getCachePrices,
	getAllCachePrices: getAllCachePrices,
	scrapeAllLostData: scrapeAllLostData,
	docsToCachePrices: docsToCachePrices,
};
var Base = Class.extend(BasePrototype);
module.exports = Base;