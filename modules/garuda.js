var Base = require('../Base');
var moment = require('moment');
var debug = require('debug')('raabbajam:priceCacheCalendar:garuda');
var _ = require('lodash');
var db = require('../libs/db');
var priceScrapers = require('priceScraper');
var GarudaPriceScrapers = priceScrapers.garuda;
var Promise = require('promise');

function init(dt, scrape, args) {
	this._super('garuda', dt, scrape, args);
	// this.parallel = true;
}

function getAllRoutes() {
	var _this = this;
	var dep = this._scrape.departure;
	var ret = this._scrape.return;
	// debug(this._scrape);
	// debug(ret);
	var routes = [];

	function looper(route) {
		var rows = route.flights;
		rows.forEach(function(row) {
			row.forEach(function(flight) {
				if (!flight.origin || !flight.destination)
					return true;
				var ori = flight.origin.toLowerCase();
				var dst = flight.destination.toLowerCase();
				var currentRoute = ori + dst;
				if (routes.indexOf(currentRoute) === -1)
					routes.push(currentRoute);
			});
		});
	}
	looper(dep);
	if (ret)
		looper(ret);
	return routes;
}

function mergeCache() {
	var _this = this;
	var _cache = _this.cache;
	var dep = _this._scrape.departure;
	var ret = _this._scrape.return;
	var lowestPrices = {};

	function looper(route, _this) {
		var realRoute = _this._dt.ori.toLowerCase() + _this._dt.dst.toLowerCase();
		var rows = route.flights;
		route.flights = rows.map(function(row) {
			var lowestPriceRows = [];
			var _row = row.map(function(flight) {
				if (!flight.origin || !flight.destination)
					return flight;
				var ori = flight.origin.toLowerCase();
				var dst = flight.destination.toLowerCase();
				var currentRoute = ori + dst;
				// not cache
				if (!_this.cache[currentRoute])
					return flight;
				var flightCode = 'ga';
				flight.seats = flight.seats.map(function(seat) {
					seat.price = (_cache[currentRoute] &&
						_cache[currentRoute][flightCode] &&
						_cache[currentRoute][flightCode][seat.class.toLowerCase()]) || 0;
					// update lowest price
					// if seat still available
					// and,
					// 	either lowest price for this route still 0
					//  	or
					//  	seat price cheaper than lowest price
					//  	but not zero
					if (!!seat.available && (!lowestPrices[currentRoute] || (lowestPrices[currentRoute] > seat.price && !!seat.price))) { //seat price cheaper but not zero
						lowestPrices[currentRoute] = seat.price;
					}
					return seat;
				});
				lowestPriceRows.push(lowestPrices[currentRoute]);
				return flight;
			});
			// if there is more than one flight in on one row
			if (row.length > 1 && lowestPriceRows.length > 1 && _.every(lowestPriceRows)) {
				var lowestPriceRow = lowestPriceRows.reduce(function(price, num) {
					return num + price;
				}, 0);
				if (!lowestPrices[realRoute] || lowestPriceRow < lowestPrices[realRoute]) {
					lowestPrices[realRoute] = lowestPriceRow;
					// debug(lowestPrices[realRoute], lowestPriceRow);
				}
			}
			return _row;
		});
		return route;
	}
	_this._scrape.departure = looper(dep, _this);
	if (ret)
		_this._scrape.return = looper(ret, _this);
	return lowestPrices;
}

/**
 * return an array of object with ori, dst, class and flight property
 * @param  {Object} row Row object
 * @return {Array}     An array of object with ori, dst, class and flight property
 */
function getCheapestInRow(rowAll) {
	// debug('rowAll',rowAll );
	var seatRequest = this.paxNum || 1;
	var classes = '';
	var out = {
		ori: rowAll[0].origin,
		dst: rowAll[rowAll.length - 1].destination,
		flight: 'ga'
	};
	rowAll.forEach(function(row, idx) {
		// var rowNum = idx + 1;
		// var out = {
		// 	ori   : row.origin,
		// 	dst   : row.destination,
		// 	flight: 'ga'
		// };
		// var fligthCode = row.flightCode.replace(/\D/g, '');
		var seats = row.seats;
		if (!row.seats)
			return true;
		for (var i = seats.length - 1; i >= 0; i--) {
			if (seats[i].available.toLowerCase !== "l" && seats[i].class.toLowerCase() !== "l" && +seats[i].available >= seatRequest) {
				// out.class = seats[i].class + fligthCode;
				classes += seats[i].class;
				break;
			}
		}
		if (idx > 0) {
			out['transit' + idx] = row.origin;
		}
		// debug(out);
		// outs.push(out);
	});
	if (rowAll.length !== classes.length)
		return [];
	out.class = classes;
	return [out];
}

function idsToSearch(ids) {
	return _.uniq(ids.map(function(id) {
		return id.replace(/\d/g, '');
	}));
}

function idsToScrape(losts, ids) {
	var _ids = _.remove(ids, function(id) {
		// _ids are subset of ids that losts, but it still might have duplicate in row
		debug('contaings', id.replace(/\d/, ''))
		return _.contains(losts, id.replace(/\d/g, ''))
	});

	debug('losts', losts, 'ids', ids, '_ids', _ids)
	try {
		_ids = _.reduce(_ids, function(all, id) {
			// we reduce it to an object with the letter as key so as to make there is only unique route
			debug('key: ' + id.replace(/\d/g, '') + '. Value: ' + id.replace(/\D/g, ''))
			all[id.replace(/\d/g, '')] = id.replace(/\D/g, '');
			return all;
		}, {});
		debug('obj _ids', _ids);
		// and then convert it to array again
		_ids = _.reduce(_ids, function(all, num, letter) {
			all.push(letter + num);
			return all;
		}, []);
	} catch (e) {
		debug('Error idsToScrape', e);
	}
	return _ids;
}

/**
 * Generate data to scrape from id
 * @param  {String} id String id from database
 * @return {Object}    Object data for scrape
 */
function generateData(id) {
	var _airline = this.airline;
	var _id = id.split('_');
	var classCode = _id[4].replace(/\d/g, '');
	var cek_instant_id = _id[4];
	// var classRow = _id[4].replace(/\D/g, '');
	var data = {
		ori: _id[0],
		dst: _id[1],
		airline: _id[2],
		flightCode: _id[3],
		classCode: classCode,
		// dep_radio  : _id[4],
		dep_date: this._dt.dep_date.replace(/\s/g, '+'),
		action: 'price',
		user: 'IANTONI.JKTGI229T',
		cek_instant: 1,
		cek_instant_id: cek_instant_id,
		dep_radio: cek_instant_id,
		priceScraper: false
	};
	for (var i = 5, j = 1, ln = _id.length; i < ln; i++, j++) {
		data['transit' + j] = _id[i];
	}
	debug('data', data);
	return data;
}

/**
 * Scrape lost data
 * @param  {String} id Data generated id to scrape
 * @return {Object}    Return cache data after scrape it
 */
function scrapeLostData(id) {
	debug('scrapeLostData', id);
	var dt = this.generateData(id);
	var urlAirbinder = 'http://128.199.251.75:9098/price';
	var urlPluto = 'http://folbek.me:3000/0/price/garuda';
	var options = {
		dt: dt,
		airline: this.airline,
		scrape: this.scrape || urlPluto,
	};
	var garudaPriceScrapers = new GarudaPriceScrapers(options);
	return garudaPriceScrapers.run()
		.catch(function(err) {
			debug('garudaPriceScrapers', err);
		});
}

/**
 * Merge json data with cheapest data from db
 * @param  {Object} json JSON formatted of scraped data
 * @return {Object}      JSON formatted of scraped data already merged with cache data
 */
function mergeCachePrices(json) {
	var _json = _.cloneDeep(json);
	var _this = this;
	var seatRequest = this.paxNum || 1;
	var departureCheapests = [];
	debug('_this.cachePrices', JSON.stringify(_this.cachePrices, null, 2));
	var format = ['DD MMMM, YYYY', 'DMMM'];
	var format2 = ['DD MMMM, YYYY HH:mm', 'DMMMHHmm'];
	var date = moment(json.departure.date, format);
	var dayRangeForExpiredCheck = 2;
	var checkDate = moment()
		.add(dayRangeForExpiredCheck, 'day');
	_this.isSameDay = false;
	if (date.isBefore(checkDate, 'day'))
		_this.isSameDay = true;
	_json.departure.flights.forEach(function(rowAll, idx) {
		var _cheapest = {};
		var rute = rowAll[0].origin;
		if (!rute) {
			departureCheapests[idx] = {
				class: 'Full'
			};
			return true;
		}
		var classes = '';
		// var flight = 'ga';
		debug('depart', json.departure.date + ' ' + rowAll[0].depart);
		var depart = moment(json.departure.date + ' ' + rowAll[0].depart, format2);
		if (_this.isBookable(depart)){
			rowAll.forEach(function(row) {
				rute += row.destination;
				var seats = row.seats;
				if (!seats) {
					return true;
				}
				for (var i = seats.length - 1; i >= 0; i--) {
					if (seats[i].available.toLowerCase !== "l" && seats[i].class.toLowerCase() !== "l" && +seats[i].available >= seatRequest) {
							classes += seats[i].class;
						break;
					}
				}
			});
		}
		rute = rute.toLowerCase();
		classes = classes.toLowerCase();
		// debug('Finding: ', rute, classes);
		try {
			_cheapest.prices = _this.cachePrices[rute].ga[classes];
		} catch (e) {
			debug('Not found: ', e.message, rute, classes);
			_this.cachePrices[rute] = _this.cachePrices[rute] || {};
			_this.cachePrices[rute].ga = _this.cachePrices[rute].ga || {};
		}
		if (!!_cheapest.prices) {
			_cheapest.class = classes;
		} else {
			_cheapest = {
				class: 'Full'
			}
		}
		departureCheapests[idx] = _cheapest;
	});
	// debug(_json.departure.flights);
	// var ret = _json.return;
	_json.cachePrices = _this.cachePrices;
	_json.departure.cheapests = departureCheapests;
	debug('cheapests', departureCheapests);
	return _json;
}

/**
 * Preparing rows to be looped on process
 * @param  {Object} json JSON formatted data from scraping
 * @return {Object}      Array of rows to be looped for getAkkCheaoest function
 */
function prepareRows(json) {
	var _json = _.cloneDeep(json);
	var rows = [];
	rows = rows.concat(_json.departure.flights);
	// debug('rows',_json.departure.flights);
	if (!!_json.return)
		rows = rows.concat(_json.return.flights);
	return rows;
}

function getCalendarPrice(json) {
	var _this = this;
	var format = ['DD MMMM, YYYY', 'DMMM'];
	var format2 = ['DD MMMM, YYYY HH:mm', 'DMMMHHmm'];
	return new Promise(function(resolve, reject) {
		if (!json.departure.date)
			return resolve();
		var date = moment(json.departure.date, format);
		var dayRangeForExpiredCheck = 2;
		var checkDate = moment()
			.add(dayRangeForExpiredCheck, 'day');
		_this.isSameDay = false;
		if (date.isBefore(checkDate, 'day'))
			_this.isSameDay = true;
		var cheapests = [];
		_.each(json.departure.flights, function(flightRow, i) {
			debug('depart', json.departure.date + ' ' + flightRow[0].depart);
			var depart = moment(json.departure.date + ' ' + flightRow[0].depart, format2);
			if (_this.isBookable(depart))
				cheapests.push(json.departure.cheapests[i]);
		});
		debug('before filter %d', json.departure.flights.length);
		debug('after filter %d', cheapests.length);
		var cheapestFlight = _.min(cheapests, function(cheapest, i) {
			var _cheapest = (!!cheapest.prices && cheapest.prices.adult) || Infinity;
			debug('cheapests: %j', _cheapest);
			return _cheapest;
		});
		return resolve(cheapestFlight.prices);
	});
}

var GarudaPrototype = {
	init: init,
	getAllRoutes: getAllRoutes,
	mergeCache: mergeCache,
	getCheapestInRow: getCheapestInRow,
	// idsToSearch     : idsToSearch,
	// idsToScrape     : idsToScrape,
	generateData: generateData,
	scrapeLostData: scrapeLostData,
	mergeCachePrices: mergeCachePrices,
	prepareRows: prepareRows,
	getCalendarPrice: getCalendarPrice,
};
var Garuda = Base.extend(GarudaPrototype);
module.exports = Garuda;
