var Base = require('../Base');
var moment = require('moment');
var debug = require('debug')('raabbajam:priceCacheCalendar:kalstar');
var _ = require('lodash');
var db = require('../libs/db');
var priceScrapers = require('priceScraper');
var KalstarPriceScrapers = priceScrapers.kalstar;
var cheerio = require('cheerio');
var Promise = require('promise');

function init(dt, scrape, args) {
	this._super('kalstar', dt, scrape, args);
	this.parallel = false;
}

function getAllRoutes() {
	var _this = this;
	var routes = [];
	var json = _this._scrape;
	var rows = [].concat(_.values(json.schedule[0]), _.values(json.ret_schedule[0]));
	rows.forEach(function(row) {
		var departCity = row[1];
		var arriveCity = row[2];
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
	var json = _this._scrape;
	function looper(dir) {
		var rows = _.values(json[dir][0]);
		rows.forEach(function(row) {
			var departCity = row[1];
			var arriveCity = row[2];
			if (!departCity && !arriveCity)
				return true;
			var currentRoute = departCity + arriveCity;
			currentRoute = currentRoute.toLowerCase();
			if (!_this.cache[currentRoute])
				return true;
			var currentCache = _this.cache[currentRoute];
			var nominal = 0;
			row.push({ lowFare: nominal});
			return row;
		});
		return rows;
	}
	json.schedule[0] = looper('schedule');
	if (!!json.ret_schedule)
		json.ret_schedule[0] = looper('ret_schedule');
	this._scrape = json;
	return this._scrape;
}
	/**
	 * return an array of object with ori, dst, class and flight property
	 * @param  {Object} row Row object
	 * @return {Array}     An array of object with ori, dst, class and flight property
	 */
function getCheapestInRow(_row) {
	var outs = [];
	var __row = _row[10]
	__row = __row instanceof Array ? __row : [__row];
	_.each(__row, function (row) {
		var out = {
			ori: _row[1],
			dst: _row[2],
			flight: _row[0],
			class: row[0],
		};
		outs.push(out);
		return false;
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
	var passengersNum = (+this._dt.adult) + (+this._dt.child);
	debug('passengersNum', passengersNum);
	var dep_date = this._dt.dep_date.replace(/\s/g, '+');
	// if RT
	if(_id[0].toUpperCase() != this._dt.ori.toUpperCase()){
		dep_date = this._dt.ret_date.replace(/\s/g, '+');
	}
	var data = {
		ori: _id[0].toUpperCase(),
		dst: _id[1].toUpperCase(),
		airline: _id[2],
		adult: this._dt.adult,
		child: this._dt.child,
		infant: this._dt.infant,
		flightCode: _id[3].toUpperCase(),
		classCode: _id[4].toUpperCase(),
		passengersNum: passengersNum,
		cek_instant: 1,
		dep_date: dep_date,
		rute: 'OW',
		dep_radio: _id[3].toUpperCase()+'-'+_id[4].toUpperCase(),
		action: 'price',
		user: this._dt.user,
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
	var options = {
		scrape: this.scrape || urlAirbinder,
		dt: dt,
		airline: 'kalstar'
	};
	var kalstarPriceScrapers = new KalstarPriceScrapers(options);
	return kalstarPriceScrapers.run()
		.catch(function(err) {
			debug('kalstarPriceScrapers', err);
		});
}

/**
 * Merge json data with cheapest data from db
 * @param  {Object} json JSON formatted of scraped data
 * @return {Object}      JSON formatted of scraped data already merged with cache data
 */
function mergeCachePrices(json) {
	var _this = this;
	var json = JSON.parse(json);
	function looper(dir) {
		var rows = _.values(json[dir][0]);
		rows.forEach(function(row) {
			var cheapest = {
				class: 'Full',
				available: 0
			};
			var departCity = row[1];
			var arriveCity = row[2];
			var flight = row[0].toLowerCase();
			if (!departCity && !arriveCity){
				row.push(cheapest);
				return true;
			}
			var currentRoute = departCity + arriveCity;
			currentRoute = currentRoute.toLowerCase();
			if (!_this.cachePrices[currentRoute]){
				row.push(cheapest);
				return true;
			}
			var nominal = 0;
			var __class = row[10][0][0].toLowerCase();
			var available = row[10][0][1];
			cheapest = _this.cachePrices[currentRoute][flight][__class];
			cheapest.class = __class;
			cheapest.available = available;
			row.push({ cheapest: cheapest });
			return row;
		});
		return rows;
	}
	json.schedule[0] = looper('schedule');
	if (!!json.ret_schedule)
		json.ret_schedule[0] = looper('ret_schedule');
	return json;
}

/**
 * Preparing rows to be looped on process
 * @param  {Object} json JSON formatted data from scraping
 * @return {Object}      Array of rows to be looped for getAkkCheaoest function
 */
function prepareRows(json) {
	var _json = _.cloneDeep(JSON.parse(json));
	var rows = [];
	rows = rows.concat(_.values(_json.schedule[0]), _.values(_json.ret_schedule[0]));
	return rows;
}

function getCalendarPrice(json) {
	var _this = this;
	var format = ['YYYY-MM-DD', 'DD MM YYYY', 'DD+MM+YYYY'];
	var format2 = ['M/DD/YYYY H:mm', 'DD MM YYYY HH:mm', 'DD+MM+YYYY HH:mm'];
	return new Promise(function(resolve, reject) {
		return resolve(0);
		if (!json.schedule)
			return resolve();
		var dep_date = _this.dt.dep_date;
		var date = moment(dep_date, format);
		var dayRangeForExpiredCheck = 2;
		var checkDate = moment()
			.add(dayRangeForExpiredCheck, 'day');
		_this.isSameDay = false;
		if (date.isBefore(checkDate, 'day'))
			_this.isSameDay = true;
		debug('_this.isSameDay %s', _this.isSameDay);
		var cheapests = [];
		function looper(dir) {
			var rows = _.values(json[dir][0]);
			rows.forEach(function(row) {
				var departCity = row[1];
				var arriveCity = row[2];
				if (!departCity && !arriveCity)
					return true;
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
			return rows;
		}
		looper('schedule');
		if (!!json.ret_schedule)
			looper('ret_schedule');

		// debug('before filter %d', _.size(json.departure));
		debug('after filter %d', cheapests.length);
		var cheapestFlight = _.min(cheapests, function(cheapest, i) {
			debug('cheapests: %j', cheapest.adult);
			return cheapest.adult;
		});
		return resolve(cheapestFlight);
	});
}

var KalstarPrototype = {
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
var Kalstar = Base.extend(KalstarPrototype);
module.exports = Kalstar;

// utils
function isFull(seat) {
	var fulls = ['full', 'penuh'];
	var _seat = seat.toLowerCase();
	return !!~fulls.indexOf(_seat);
}
