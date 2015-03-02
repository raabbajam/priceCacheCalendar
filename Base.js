var Class = require('./libs/Class');
var Promise = require('promise');
var moment = require('moment');
var _ = require('lodash');
var Calendar = new require('../../libs/editCalendar');
var dateFormats = ['DD+MM+YYYY', 'DD+MMM+YYYY', 'DD MM YYYY', 'DD MMM YYYY'];
var airlines = {
	"airasia": 1,
	"citilink": 2,
	"garuda": 3,
	"lion": 4,
	"sriwijaya": 5,
	"xpress": 6,
	"express": 6
};
var db = require('./libs/db');
var debug = require('debug')('raabbajam:priceCacheCalendar:base');

/**
 * Intiailizing
 * @param  {String} airline Airline's name
 * @param  {Object} _db     Database model
 */
function init(airline, dt, scrape, args) {
	try {
		this.name = this.airline = airline;
		for (var prop in dt) {
			if (typeof dt[prop] === 'string')
				dt[prop] = dt[prop].toLowerCase();
		}
		if (!!dt && !!scrape) {
			this._dt = dt;
			this._dt.ori = this._dt.ori.toLowerCase();
			this._dt.dst = this._dt.dst.toLowerCase();
			this._scrape = scrape;
			this._kode = airlines[airline];
			debug('this._kode', this._kode);
			this.paxNum = 1;
			this.airline = airline;
			this.action = 'flight';
			if (!!this._dt && !!this._dt.adult)
				this.paxNum = +this._dt.adult + (+this._dt.child || 0);
			debug('this.paxNum', this.paxNum);
		}
		this.setOptions(args);
		// this.parallel = true;
	} catch (e) {
		debug(e);
	}
}

/**
 * setting options, using one arguments: an object with key-value pair,
 * or two arguments, with the first as key and second as value
 */
function setOptions() {
	var key, value;
	if (arguments.length === 1) {
		var args = arguments[0];
		var defaults = {
			index: 'pluto',
			type: 'price',
			dt: {},
			db: db,
			cache: {},
			cachePrices: {},
			scrape: '',
		};
		var options = _.merge({}, defaults, args);
		for (key in defaults) {
			value = options[key];
			this[key] = value;
			if (typeof this[key] === 'string')
				this[key] = this[key].toLowerCase();
		}
	} else {
		key = arguments[0];
		value = arguments[1];
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
function getAllRoutes() {}

/**
 * Get all cache price data of specified origin and destination
 * @param  {String} ori Origin route
 * @param  {String} dst Destination route
 * @return {Object}     Data cache price
 */
function getCache(ori, dst, transit) {
	var _this = this;
	return new Promise(function(resolve, reject) {
		var _ori = ori && ori.toLowerCase() || _this._dt.ori;
		var _dst = dst && dst.toLowerCase() || _this._dt.dst;
		var query = {
			"size": 0,
			"query": {
				"filtered": {
					"filter": {
						"and": [{
							"term": {
								"origin": _ori
							}
						}, {
							"term": {
								"destination": _dst
							}
						}, {
							"term": {
								"airline": _this.name
							}
						}]
					}
				}
			},
			"aggs": {
				"groupFlight": {
					"terms": {
						"field": "flight",
					},
					"aggs": {
						"groupClass": {
							"terms": {
								"field": "class",
								"size": 0
							},
							"aggs": {
								"minPrice": {
									"min": {
										"field": "price"
									}
								}
							}
						}
					}
				}
			}
		};
		if (!!transit) {
			transit = transit.toLowerCase();
			var aTransit = transit.match(/.../g);
			var term = {};
			aTransit.forEach(function(transit, i) {
				term['transit' + (i + 1)] = transit.toLowerCase();
			});
			query.query.filtered.filter.and.push({
				term: term
			});
		}
		// debug(JSON.stringify(query, null, 2));
		_this.db.search('pluto', 'price', query, function(err, res) {
			if (err)
				return reject(err);
			res = JSON.parse(res);
			// debug(JSON.stringify(res, null, 2));
			var flightList = {};
			res.aggregations.groupFlight.buckets.forEach(function(flight) {
				var classList = {};
				flight.groupClass.buckets.forEach(function(seat) {
					classList[seat.key] = Math.round(seat.minPrice.value / 10) * 10;
				});
				flightList[flight.key] = classList;
			});
			var currentRoute = _ori + _dst + (transit || '');
			_this.cache[currentRoute] = flightList;
			resolve();
		});
	});
}

/**
 * Get all cache from an array of routes
 * @param  {Array} routes Routes of origin and destination cities
 * @return {Object}        Data cache price
 */
function getAllCaches(routes) {
	var _this = this;
	var promises = [];
	routes.forEach(function(route) {
		if (!route)
			return true;
		// debug(route);
		var aRoute = route.match(/.../g);
		var ori = aRoute.shift();
		var dst = aRoute.pop();
		var transit = aRoute.join('');
		promises.push(_this.getCache(ori, dst, transit));
	});
	return Promise.all(promises);
}

/**
 * Inserting data cache price from an array of results
 * @param  {Object} res Array of object containing data of lowest price available
 */
function insertAllLowest(res) {
	var promises = [];
	var _this = this;
	var _dt = _this._dt;
	var _date = moment(_dt.dep_date, dateFormats).format('x');
	debug('res', res);
	Object.keys(res)
		.forEach(function(prop, i) {
			if (!res[prop])
				return true;
			// debug('prop',res[prop])
			var _price = parseInt(res[prop], 10) + _this._kode;
			// debug('insertAllLowest res',_price, _this._kode)
			var data = {
				date: _date,
				origin: prop.substr(0, 3),
				destination: prop.substr(3, 3),
				price: _price,
				airline: _this.airline
			};
			data.id = data.origin + data.destination + Math.round(data.date / 1000);
			data.id = data.id.toLowerCase();
			debug('data insertAllLowest', data);
			promises.push(_this.insertLowest(data));
		});
	return Promise.all(promises, function(res) {
		debug('Inserting to calendar..', JSON.stringify(res));
	});
}

/**
 * Inserting data cache price to db
 * @param  {Object} data Cache price data from scrape
 */
function insertLowest(data) {
	debug('insertLowest');
	var _this = this;
	var _price = data.price;
	return new Promise(function(resolve, reject) {
		if (+_price <= 0)
			return false;
		debug('cek old price', data.id);
		_this.db.get('pluto', 'calendar', data.id, function(err, res) {
			res = JSON.parse(res);
			var oldPrice = (res._source && res._source.price) || 0;
			var oldAirline = (res._source && res._source.airline) || '';
			debug('Cek calendar!!!', '\n', 'Old data', '\n', res, '\n', 'New data', '\n', data);
			if(oldPrice==0 || (+_price)<(+oldPrice) || oldAirline===_this.airline){
				if(oldPrice == 0){ debug('oldPrice==0') }
				if(_price < oldPrice){ debug('_price<oldPrice') }
				if(oldAirline === _this.airline){ debug('oldAirline===_this.airline') }
				data.price = _price;
				_this.db.index('pluto', 'calendar', data, function(err, res) {
					debug('found lower price, inserting to calendar...');
					return resolve(res);
				});
			}else{
				return resolve(false);
			}
		});
	});
}

/**
 * Getting all routes by looping scrape data, and getting all cache specified by all routes
 * merge data cache with scrape data, getting lowest price from disting routes, compare it with
 * saved data in db and replace it if necessary
 * @return {String} Scrape data that already looped and merged with cache data, and checking for
 * cheapest available seat price in beetwen
 */
function run() {
	var _this = this;
	if (!_this._scrape)
		return _this._scrape;
	var routes;
	try {
		routes = _this.getAllRoutes();
	} catch (e) {
		debug(e);
		return _this._scrape;
	}
	debug('running step2');
	return _this.getAllCaches(routes)
		.then(_this.mergeCache.bind(_this))
		// .then(_this.insertAllLowest.bind(_this))
		.then(function(res) {
			return _this._scrape;
		})
		.catch(function(err) {
			debug('Error priceCacheCalendar: ' + err.stack);
			return _this._scrape;
		});
}

/**
 * return an array of object with ori, dst, class and flight property
 * @param  {Object} row Row object
 * @return {Array}     An array of object with ori, dst, class and flight property
 */
function getCheapestInRow(row) {
	var message = arguments.callee.name + ': ' + "You should implement this on your child";
	debug(message);
	throw new Error(message);
}

/**
 * return an array cheapest class
 * @param  {Array} rows Array of row
 * @return {Object}      return an array cheapest class, by rute by flight
 */
function getAllCheapest(rows) {
	var _this = this;
	var flightClasses = {};
	if (!rows)
		return flightClasses;
	rows = rows.filter(function(row) {
		return !!row;
	});
	// debug('rows', rows);
	_.each(rows, function(row, index) {
		var rowNum = index + 1;
		var cheapests = _this.getCheapestInRow(row);
		cheapests.forEach(function(cheapest) {
			if (!cheapest.class)
				return true;
			var _transit = '';
			for (var i = 1; i <= 3; i++) {
				if (cheapest['transit' + i])
					_transit += cheapest['transit' + i];
			}
			var rute = cheapest.ori + _transit + cheapest.dst;
			var flight = cheapest.flight.toLowerCase();
			var _class = (cheapest.class || '')
				.toLowerCase();
			/*if (_this.airline === 'garuda')
			_class += rowNum;*/
			rute = rute.toLowerCase();
			if (!flightClasses[rute])
				flightClasses[rute] = {};
			if (!flightClasses[rute][flight])
				flightClasses[rute][flight] = [];
			if (flightClasses[rute][flight].indexOf(_class) === -1)
				flightClasses[rute][flight].push(_class);
		});
	});
	return flightClasses;
}

/**
 * internal function used when saving data to db
 * @param  {Object} data Save to db
 * @return {string}      id for db
 */
function generateId(data) {
	var id = data.origin + '_' + data.destination + '_' + data.airline + '_' + data.flight + '_' + data.class;
	if (data.transit1)
		id += '_' + data.transit1;
	if (data.transit2)
		id += '_' + data.transit2;
	if (data.transit3)
		id += '_' + data.transit3;
	debug(id);
	return id.toLowerCase();
}

/**
 * Get cache data from db
 * @return {Object} Data price for current dt
 */
function getCachePrices(ids) {
	var _this = this;
	return new Promise(function(resolve, reject) {
			if (!(ids instanceof Array))
				ids = [ids];
			// debug('ids',ids);
			var _ids = !!_this.idsToSearch ? _this.idsToSearch(ids) : ids;
			debug('db',db)
			_this.db.multiget(_this.index, _this.type, _ids, function(err, res) {
				if (err)
					return reject(err);
				try {
					res = JSON.parse(res);
				} catch (error) {
					return reject(error);
				}
				// debug(res);
				if (!res.docs)
					return reject(new Error('No cache found'));
				var docs = res.docs;
				var losts = [];
				// debug(JSON.stringify(docs, null, 2));
				docs.forEach(function(doc) {
					if (!doc.found)
						return losts.push(doc);
				});
				if (losts.length === 0)
					return resolve(_this.docsToCachePrices(docs));
				err = new Error('Some are lost.');
				losts = losts.map(function(lost) {
					return lost._id;
				});
				err.losts = !!_this.idsToScrape ? _this.idsToScrape(losts, ids) : losts;
				err.docs = docs;
				return reject(err);
			});
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

/**
 * getting all cache based on cheapest flight data
 * @param  {Object} data Cheapest flight data
 * @return {Object}      Promise with losts and founds
 */
function getAllCachePrices(data) {
	debug('getAllCachePrices');
	var ids = [];
	var _airline = this.airline;
	_.each(data, function(value, key) {
		var _rute = key;
		_.each(value, function(_value, _key) {
			var _flight = _key;
			_value.forEach(function(_class) {
				// debug('_rute',_rute)
				var rute = _rute.match(/.../g);
				// debug('rute',rute)
				var _id = [rute.shift(), rute.pop(), _airline, _flight, _class].concat(rute);
				var id = _id.join('_');
				// debug('id',id)
				ids.push(id.toLowerCase());
			});
		});
	});
	return this.getCachePrices(ids);
}

/**
 * Generate data to scrape from id
 * @param  {String} id String id from database
 * @return {Object}    Object data for scrape
 */
function generateData(id) {
	var message = arguments.callee.name + ': ' + "You should implement this on your child";
	debug(message);
	throw new Error(message);
}

/**
 * Scrape lost data
 * @param  {String} id Data generated id to scrape
 * @return {Object}    Return cache data after scrape it
 */
function scrapeLostData(id) {
	var message = arguments.callee.name + ': ' + "You should implement this on your child";
	debug(message);
	throw new Error(message);
}

/**
 * Scrape all losts data
 * @param  {Array} data Array of ids
 * @return {Object}      Return last data, after this finish all cache are scraped
 */
function scrapeAllLostData(data) {
	var _this = this;
	var results = [];
	var steps;
	debug('scrapeAllLostData parallel', _this.parallel);
	if (!!_this.parallel) {
		steps = [];
		data.forEach(function(id) {
			steps.push(_this.scrapeLostData(id));
		});
		return Promise.all(steps)
			.catch(function(err) {
				debug('scrapeAllLostData', err.stack);
				reject(err);
			});
	} else {
		steps = (data || [])
			.reduce(function(sequence, id) {
				debug('sequence', id);
				return sequence.then(function() {
					return _this.scrapeLostData(id)
						.then(function(res) {
							results.push(res);
						});
				});
			}, Promise.resolve());
		return new Promise(function(resolve, reject) {
			// return Promise.all(steps);
			steps
				.then(function() {
					return resolve(results);
				})
				.catch(function(err) {
					debug('scrapeAllLostData', err.stack);
					reject(err);
				});
		});
	}
}

/**
 * Saving cached docs from db to global object cachePrices
 * @param  {Object} docs Data from database
 * @return {Object}      Global object cachePrices
 */
function docsToCachePrices(docs) {
	var _this = this;
	var _cachePrices = _this.cachePrices;
	docs.forEach(function(doc) {
		if (!doc.found)
			return false;
		var source = doc._source;
		var flight = !!source.flight.toLowerCase && source.flight.toLowerCase() || source.flight;
		var _class = !!source.class.toLowerCase && source.class.toLowerCase() || source.class;
		var rute = source.origin;
		for (var i = 1; i <= 3; i++) {
			rute += source['transit' + i] || '';
		}
		rute += source.destination;
		rute = rute.toLowerCase();
		if (!_this.cachePrices[rute])
			_cachePrices[rute] = {};
		if (!_cachePrices[rute][flight])
			_cachePrices[rute][flight] = {};
		_cachePrices[rute][flight][_class] = source.prices;
	});
	return _cachePrices;
}

/**
 * Merge json data with cheapest data from db
 * @param  {Object} json JSON formatted of scraped data
 * @return {Object}      JSON formatted of scraped data already merged with cache data
 */
function mergeCachePrices(json) {
	var message = arguments.callee.name + ': ' + "You should implement this on your child";
	debug(message);
	throw new Error(message);
}

/**
 * Preparing rows to be looped on process
 * @param  {Object} json JSON formatted data from scraping
 * @return {Object}      Array of rows to be looped for getAkkCheaoest function
 */
function prepareRows(json) {
	var message = arguments.callee.name + ': ' + "You should implement this on your child";
	debug(message);
	throw new Error(message);
}

function getCalendarPrice(json) {
	var message = arguments.callee.name + ': ' + "You should implement this on your child";
	debug(message);
	throw new Error(message);
}

function isBookable(hour) {
	if (!this.isSameDay)
		return true;
	var expired = this.expired || 4;
	var noBookLimit = moment().add(expired, 'h');
	var bookHour = hour;
	debug('\nnoBookLimit: %s\nbookHour: %s\nisAfter: %s',
		noBookLimit.format('LLL'),
		bookHour.format('LLL'),
		bookHour.isAfter(noBookLimit, 'hour'));
	return bookHour.isAfter(noBookLimit, 'hour');
}

function merge(json) {
	var _this = this;
	var rows = _this.prepareRows(json);
	// debug('json',json);
	var aoCheapest = _this.getAllCheapest(rows);
	debug('aoCheapest', aoCheapest);
	var dataCalendar = {
		airline : _this.airline,
		action : _this.action,
		query : _this._dt
	}
	if (_.isEmpty(aoCheapest)) {
		debug('Can\'t find some data. Return without cachePrices..');
		Calendar.editCalendar(dataCalendar);
		return Promise.resolve(_this.mergeCachePrices(json));
	}
	return _this.getAllCachePrices(aoCheapest)
		.catch(function(err) {
			debug('err.losts', err.message, err.losts);
			return _this.scrapeAllLostData(err.losts)
				.then(function(res) {
					// debug('getAllCachePrices', res);
					return _this.getAllCachePrices(aoCheapest);
				}, function(err) {
					debug('_this.scrapeAllLostData', err);
					throw err;
				});
		})
		.catch(function(err) {
			debug('Error second time', err.stack);
			if (!!err.docs)
				_this.docsToCachePrices(err.docs);
		})
		.then(function() {
			return new Promise(function(resolve, reject) {
				var _json = _this.mergeCachePrices(json);
				if (typeof _json !== 'object')
					return reject(new Error('Result is nalformed'));
				_this.getCalendarPrice(_json)
					.then(function(cheapest) {
						debug('getCalendarPrice cheapest: %j', cheapest);
						if(typeof cheapest=='undefined'){
							Calendar.editCalendar(dataCalendar);
							return cheapest;
						}
						var _price = !!_this.calendarPrice ? _this.calendarPrice(cheapest) : !!cheapest && cheapest.adult;
						if (!_price){
							Calendar.editCalendar(dataCalendar);
							return _price;
						}
						var _dt = _this._dt;
						var _date = moment(_dt.dep_date, dateFormats).unix() * 1000;
						var data = {
							date: _date,
							origin: _dt.ori.toLowerCase(),
							destination: _dt.dst.toLowerCase(),
							price: _price,
							airline: _this.airline
						};
						data.id = data.origin + data.destination + Math.round(data.date / 1000);
						data.id = data.id.toLowerCase();
						debug('data %j', data);
						return _this.insertLowest(data);
					})
					.then(function (res) {
						debug(res);
						return resolve(_json);
					})
					.catch(function (err) {
						return reject(err);
					});
			});
		})
		.catch(function(err) {
			debug('error on end', err.stack);
			Calendar.editCalendar(dataCalendar);
			if (!!err.docs)
				_this.docsToCachePrices(err.docs);
			return _this.mergeCachePrices(json);
		});
}
var BasePrototype = {
	init: init,
	setOption: setOption,
	setOptions: setOptions,
	getCache: getCache,
	getAllRoutes: getAllRoutes,
	getAllCaches: getAllCaches,
	insertLowest: insertLowest,
	insertAllLowest: insertAllLowest,
	run: run,
	getCheapestInRow: getCheapestInRow,
	getAllCheapest: getAllCheapest,
	getCachePrices: getCachePrices,
	getAllCachePrices: getAllCachePrices,
	scrapeAllLostData: scrapeAllLostData,
	docsToCachePrices: docsToCachePrices,
	prepareRows: prepareRows,
	getCalendarPrice: getCalendarPrice,
	isBookable: isBookable,
	merge: merge,
};
var Base = Class.extend(BasePrototype);
module.exports = Base;
