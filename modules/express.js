var Base = require('../Base');
var moment = require('moment');
var debug = require('debug')('raabbajam:priceCacheCalendar:express');
var _ = require('lodash');
var db = require('../libs/db');
var priceScrapers = require('priceScraper');
var ExpressPriceScrapers = priceScrapers.express;
var cheerio = require('cheerio');
var Promise = require('promise');

function init(dt, scrape, args) {
	this._super('express', dt, scrape, args);
	this.parallel = true;
}

function getAllRoutes() {
	var _this = this;
	var routes = [];
	var json = _this._scrape[0];
	var rows = [].concat(_.values(json.dep_table), _.values(json.ret_table));
	rows.forEach(function(row) {
		var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
		var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
		if (!departCity && !arriveCity)
			return true;
		var currentRoute = departCity + arriveCity;
		currentRoute = currentRoute.toLowerCase();
		if (routes.indexOf(currentRoute) === -1) {
			routes.push(currentRoute);
		}
	});
	return routes;
}

function mergeCache() {
		var _this = this;
		var _cache = _this.cache;
		var _class = 'lo';
		var json = _this._scrape[0];
		var lowestPrices = {};
		var realRoute = _this._dt.ori.toLowerCase() + _this._dt.dst.toLowerCase();
		var rows = [].concat(_.values(json.dep_table), _.values(json.ret_table));

		function looper(dir) {
			var rows = _.values(json[dir + '_table']);
			rows.forEach(function(row) {
				var lowestPriceRows = [];
				var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
				var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
				if (!departCity && !arriveCity)
					return true;
				var currentRoute = departCity + arriveCity;
				currentRoute = currentRoute.toLowerCase();
				if (!_this.cache[currentRoute])
					return true;
				var currentCache = _this.cache[currentRoute];
				var nominal = (row.lowFare.match(/price"><span>([\s\S]+)IDR/) || [])[1];
				nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
				var flightCode = (row.lowFare.match(/\|([A-Z]{2})/) || [])[1];
				var classCode = _class.toLowerCase() + nominal;
				var cachePrice = (currentCache[flightCode] && currentCache[flightCode][classCache]) || 0;
				if (!lowestPrices[currentRoute] || (!!cachePrice && cachePrice < lowestPrices[currentRoute]))
					lowestPrices[currentRoute] = cachePrice;
				nominal = (row.lowFare.match(/price"><span>([\s\S]+)IDR/) || [])[1];
				row.lowFare = row.lowFare.replace(/price"><span>([\s\S]+)IDR/, 'price"><span>' + 100000 + ' IDR');
				lowestPriceRows.push(lowestPrices[currentRoute]);
			});
			return rows;
		}
		json.dep_table = looper('dep');
		if (!!json.ret_table)
			json.ret_table = looper('ret');
		_this._scrape[0] = json;
		return lowestPrices;
	}
	/**
	 * return an array of object with ori, dst, class and flight property
	 * @param  {Object} row Row object
	 * @return {Array}     An array of object with ori, dst, class and flight property
	 */
function getCheapestInRow(_row) {
	debug('rowAll',_row );
	var outs = [];
	_row = _row instanceof Array ? _row : [_row];
	_.each(_row, function (row) {
		var seatRequest = this.paxNum || 1;
		var departCity = row.origin;
		var arriveCity = row.destination;
		debug(departCity,arriveCity)
		if (!departCity && !arriveCity)
			return outs;
		var currentRoute = departCity + arriveCity;
		var _class = row.promo !== "Full" ? 'promo' : row.normal !== "Full" ? "normal" : 'flexi';
		var nominal = row[_class].split(' ')[0];
		nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
		var flightCode = row.flightNumber.replace(/\d|\s/g, '');
		var classCode = _class.toLowerCase() + nominal;
		var out = {
			ori: departCity,
			dst: arriveCity,
			flight: flightCode,
			class: classCode,
		};
		if (!!out.class)
			outs.push(out);
	});
	return outs;
}

/**
 * Generate data to scrape from id
 * @param  {String} id String id from database
 * @return {Object}    Object data for scrape
 */
function generateData(id) {
	var _id = id.split('_');
	var cek_instant_id = _id[3] + '_' + _id[4];
	cek_instant_id = cek_instant_id.toUpperCase();
	var passengersNum = (+this._dt.adult) + (+this._dt.child);
	debug('passengersNum', passengersNum);
	var data = {
		ori: _id[0].toUpperCase(),
		dst: _id[1].toUpperCase(),
		airline: _id[2],
		flightCode: _id[3],
		classCode: _id[4],
		passengersNum: passengersNum,
		cek_instant: 1,
		cek_instant_id: cek_instant_id,
		dep_date: this._dt.dep_date.replace(/\s/g, '+'),
		// dep_date    : moment().add(1, 'M').format('DD+MMM+YYYY'),
		rute: 'OW',
		dep_radio: 'normal',
		action: 'price',
		user: '35054',
		priceScraper: false,
	};
	for (var i = 5, j = 1, ln = _id.length; i < ln; i++, j++) {
		data['transit' + j] = _id[i];
	}
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
	var urlAirbinder = 'http://128.199.251.75:8097/price';
	var urlPluto = 'http://folbek.me:3000/0/price/express';
	// debug('dt',dt)
	var options = {
		scrape: this.scrape || urlAirbinder,
		dt: dt,
		airline: 'express'
	};
	var expressPriceScrapers = new ExpressPriceScrapers(options);
	return expressPriceScrapers.run()
		.catch(function(err) {
			debug('expressPriceScrapers', err);
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
	debug('_this.cachePrices', JSON.stringify(_this.cachePrices, null, 2));
	// debug('_json.dep_table',_json)
	_json.departure = _.mapValues(_json.departure, function(row) {
		// debug('row', row)
		var departCity = row.origin;
		var arriveCity = row.destination;

		row.cheapest = {
			class: 'Full',
			available: 0
		};
		if (!departCity && !arriveCity)
			return row;
		var currentRoute = departCity + arriveCity;
		currentRoute = currentRoute.toLowerCase();
		debug('departCity', departCity, 'arriveCity', arriveCity);
		if (!_this.cachePrices[currentRoute])
			return row;
		var _class = row.promo !== "Full" ? 'promo' : row.normal !== "Full" ? "normal" : 'flexi';
		var nominal = row[_class].split(' ')[0];
		nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
		var flightCode = row.flightNumber.replace(/\d|\s/g, '')
			.toLowerCase();
		var classCode = _class.toLowerCase() + nominal;
		debug(currentRoute, flightCode, classCode);
		try {
			row.cheapest = _this.cachePrices[currentRoute][flightCode][classCode];
			row.cheapest.class = classCode;
			row.cheapest.available = _class;
		} catch (e) {
			debug(e.message, currentRoute, flightCode, classCode);
			_this.cachePrices[currentRoute] = _this.cachePrices[currentRoute] || {};
			_this.cachePrices[currentRoute][flightCode] = _this.cachePrices[currentRoute][flightCode] || {};
		}
		// debug('mergeCachePrices row', row)
		return row;
	});
	// debug(_json.dep_table);
	// var ret = _json.return;
	_json.cachePrices = _this.cachePrices;
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
	rows = rows.concat(_json.departure);
	// debug('rows',_json.departure.flights);
	if (!!_json.return && !!_json.return[0])
		rows = rows.concat(_json.return);
	return rows;
}

function getCalendarPrice(json) {
	var _this = this;
	var format = ['YYYY-MM-DD', 'DD MM YYYY', 'DD+MM+YYYY'];
	var format2 = ['M/DD/YYYY H:mm', 'DD MM YYYY HH:mm', 'DD+MM+YYYY HH:mm'];
	return new Promise(function(resolve, reject) {
		if (!json.departure && !json.departure[0] && !json.departure[0].depart)
			return resolve();
		var dep_date = !json.departure[0].date;
		var date = moment(dep_date, format);
		var dayRangeForExpiredCheck = 2;
		var checkDate = moment()
			.add(dayRangeForExpiredCheck, 'day');
		_this.isSameDay = false;
		if (date.isBefore(checkDate, 'day'))
			_this.isSameDay = true;
		debug('_this.isSameDay %s', _this.isSameDay);
		var cheapests = [];
		_.each(json.departure, function(flight) {
			debug('depart %s', flight.depart);
			var depart = moment(flight.depart, format2);
			if (_this.isBookable(depart)){
				try{
					if (flight.cheapest){
						cheapests.push(flight.cheapest);
					}else{
						debug('cheapests', flight.cheapest);
					}
				}catch(e){
					debug('cheapests', flight.cheapest);
				}
			}
		});
		debug('before filter %d', _.size(json.departure));
		debug('after filter %d', cheapests.length);
		var cheapestFlight = _.min(cheapests, function(cheapest, i) {
			debug('cheapests: %j', cheapest.adult);
			return cheapest.adult;
		});
		return resolve(cheapestFlight);
	});
}

var ExpressPrototype = {
	init: init,
	getAllRoutes: getAllRoutes,
	mergeCache: mergeCache,
	getCheapestInRow: getCheapestInRow,
	generateData: generateData,
	scrapeLostData: scrapeLostData,
	mergeCachePrices: mergeCachePrices,
	prepareRows: prepareRows,
	getCalendarPrice: getCalendarPrice,
};
var Express = Base.extend(ExpressPrototype);
module.exports = Express;
