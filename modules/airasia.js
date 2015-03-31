var Base = require('../Base');
var moment = require('moment');
var Promise = require('promise');
var debug = require('debug')('raabbajam:priceCacheCalendar:airasia');
var _ = require('lodash');
var cheerio = require('cheerio');
var priceScrapers = require('priceScraper');
var AirasiaPriceScrapers = priceScrapers.airasia;
var cheerio = require('cheerio');

function init(dt, scrape, args) {
	// debug('dt', dt);
	this._super('airasia', dt, scrape, args);
	this.parallel = false;
	this.expired = 12;
}

function getAllRoutes() {
	var _this = this;
	var routes = [];
	var json = _this._scrape[0];
	var rows = [].concat(_.values(json.dep_table), _.values(json.ret_table));
	rows.forEach(function(row) {
		// debug('row', row);
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
	debug('routes', routes);
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
			if(row.lowFare.trim()!='-'){
				var harga = 'lowFare';
			}else if(row.hiFlyer.trim()!='-'){
				var harga = 'hiFlyer';
			}else if(row.hi2Flyer.trim()!='-'){
				var harga = 'hi2Flyer';
			}else{
				return true;
			}
			var matchNominal = row[harga].match(/price"><span>([\s\S]+?)IDR/);
			// debug('matchNominal',matchNominal)
			var nominal = (matchNominal || [])[1];
			if(!nominal){
				debug("mergeCache row.lowFare & row.hiFlyer kosong");
				return true;
			}
			nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
			lowestPrices[currentRoute] = nominal * 1000;
			/*var flightCode = (row.lowFare.match(/\|([A-Z]{2})/) || [])[1];
			var classCode = _class.toLowerCase() + nominal;
			var cachePrice = (currentCache[flightCode] && currentCache[flightCode][classCache]) || 0;
			if(!lowestPrices[currentRoute] || (!!cachePrice && cachePrice < lowestPrices[currentRoute]))
			lowestPrices[currentRoute] = cachePrice;
			row.lowFare = row.lowFare.replace(/price"><span>([\s\S]+)IDR/, 'price"><span>' + 100000 + ' IDR');
			lowestPriceRows.push(lowestPrices[currentRoute]);*/
		});
		return rows;
	}
	json.dep_table = looper('dep');
	if (!!json.ret_table)
		json.ret_table = looper('ret');
	// _this._scrape[0] = json;
	debug('merge cache lowestPrices', lowestPrices);
	return lowestPrices;
}

/**
 * return an array of object with ori, dst, class and flight property
 * @param  {Object} row Row object
 * @return {Array}     An array of object with ori, dst, class and flight property
 */
function getCheapestInRow(row) {
	// debug('rowAll',row );
	var outs = [];
	var seatRequest = this.paxNum || 1;
	if (!row.lowFare)
		return outs;
	var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
	var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
	if (!departCity && !arriveCity)
		return outs;
	var currentRoute = departCity + arriveCity;
	if(row.lowFare.trim()!='-'){
		var _class = 'lo';
		var harga = 'lowFare';
	}else if(row.hiFlyer.trim()!='-'){
		var _class = 'hi';
		var harga = 'hiFlyer';
	}else if(row.hi2Flyer.trim()!='-'){
		var _class = 'pr';
		var harga = 'hi2Flyer';
	}else{
		return outs;
	}
	var matchNominal = row[harga].match(/price"><span>([\s\S]+?)IDR/);
	var flightCode = row[harga].match(/[A-Z]{2}\~\ ?[0-9]{3,4}/g)
		.join('|')
		.replace(/\~/g, '-')
		.replace(/\ /g, '');
	// debug('matchNominal',matchNominal)
	var nominal = (matchNominal || [])[1];
	if(!nominal){
		debug("mergeCache row.lowFare & row.hiFlyer kosong");
		return outs;
	}
	nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
	var classCode = _class.toLowerCase() + nominal;
	var out = {
		ori: departCity,
		dst: arriveCity,
		flight: flightCode,
		class: classCode
	};
	if (!!out.class)
		outs.push(out);
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
	// debug('passengersNum',passengersNum);
	var data = {
		ori: _id[0],
		dst: _id[1],
		airline: _id[2],
		flightCode: _id[3],
		classCode: _id[4],
		passengersNum: passengersNum,
		cek_instant: 1,
		cek_instant_id: cek_instant_id,
		dep_date: this._dt.dep_date.replace(/\s/g, '+'),
		// dep_date    : moment().add(1, 'M').format('DD+MMM+YYYY'),
		rute: 'OW',
		dep_radio: cek_instant_id,
		action: 'price',
		user: 'apwqz',
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
	var host = 'localhost';
	if (!!process.env.SCRAPE_HOST)
	    host = process.env.SCRAPE_HOST;
	var urlAirbinder = 'http://'+host+':99/price';
	var urlPluto = 'http://folbek.me:3000/0/price/airasia';
	// debug('dt',dt)
	var options = {
		scrape: this.scrape || urlAirbinder,
		dt: dt,
		airline: 'airasia'
	};
	var airasiaPriceScrapers = new AirasiaPriceScrapers(options);
	return airasiaPriceScrapers.run()
		.catch(function(err) {
			debug('airasiaPriceScrapers', err);
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
	// debug('_this.cachePrices',JSON.stringify(_this.cachePrices, null, 2));
	// debug('_json.dep_table',_json)
	
	var format = ['M/D/YYYY', 'YYYY/MM/DD'];
	var format2 = ['M/D/YYYY HHmm', 'YYYY/MM/DD HHmm'];
	var date = moment.utc($('#UTCDATE').text(), format);
	var dayRangeForExpiredCheck = 2;
	var checkDate = moment().add(dayRangeForExpiredCheck, 'day');
	_this.isSameDay = false;
	if (date.isBefore(checkDate, 'day'))
		_this.isSameDay = true;
	_json[0].dep_table = _.mapValues(_json[0].dep_table, function(row) {
		row.cheapest = {
			class: 'Full',
			available: 0
		};
		var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
		var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
		// debug('departCity', departCity, 'arriveCity', arriveCity );
		if (!departCity && !arriveCity)
			return row;
		var currentRoute = departCity + arriveCity;
		currentRoute = currentRoute.toLowerCase();
		// debug('_this.cachePrices[currentRoute]', _this.cachePrices[currentRoute])
		if (!_this.cachePrices[currentRoute])
			return row;
		if(row.lowFare.trim()!='-'){
			var _class = 'lo';
			var harga = 'lowFare';
		}else if(row.hiFlyer.trim()!='-'){
			var _class = 'hi';
			var harga = 'hiFlyer';
		}else if(row.hi2Flyer.trim()!='-'){
			var _class = 'pr';
			var harga = 'hi2Flyer';
		}else{
			return row;
		}
		var matchNominal = row[harga].match(/price"><span>([\s\S]+?)IDR/);
		var flightCode = row[harga].match(/[A-Z]{2}\~\ ?[0-9]{3,4}/g)
			.join('|')
			.replace(/\~/g, '-')
			.replace(/\ /g, '');
		// debug('matchNominal',matchNominal)
		var nominal = (matchNominal || [])[1];
		if(!nominal){
			debug("mergeCache row.lowFare & row.hiFlyer kosong");
			return outs;
		}
		nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
		flightCode = flightCode.toLowerCase();
		var classCode = _class.toLowerCase() + nominal;
		var $ = cheerio.load(row.dateDepart);
		var depart = moment.utc($('#UTCDATE').text() + ' ' + $('#UTCTIME').text(), format2).local();
			try {
				if (_this.isBookable(depart)){
					row.cheapest = _this.cachePrices[currentRoute][flightCode][classCode];
					row.cheapest.class = classCode;
					row.cheapest.available = 'N/A';
				}
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
	var _json = _.cloneDeep(json[0]);
	var rows = [];
	rows = rows.concat(_.values(_json.dep_table));
	// debug('rows',_json.departure.flights);
	if (!!_json.ret_table && !!_json.ret_table[0])
		rows = rows.concat(_.values(_json.ret_table));
	return rows;
}

function calendarPrice(_class) {
	debug('_class.adult + _class.baggage = %d + %d = %d', _class.adult, _class.baggage, _class.adult + _class.baggage);
	return _class.adult + _class.baggage;
}

function getCalendarPrice(json) {
	var _this = this;
	var format = ['M/D/YYYY', 'YYYY/MM/DD'];
	var format2 = ['M/D/YYYY HHmm', 'YYYY/MM/DD HHmm'];
	return new Promise(function(resolve, reject) {
		if (!json[0].dep_table && !json[0].dep_table[0] && !json[0].dep_table[0].dateDepart)
			return resolve();
		var $ = cheerio.load(json[0].dep_table[0].dateDepart);
		var date = moment.utc($('#UTCDATE').text(), format);
		var dayRangeForExpiredCheck = 2;
		var checkDate = moment().add(dayRangeForExpiredCheck, 'day');
		_this.isSameDay = false;
		if (date.isBefore(checkDate, 'day'))
			_this.isSameDay = true;
		var flights = _.filter(json[0].dep_table, function (flight) {
			var $ = cheerio.load(flight.dateDepart);
			var hour = +$('#UTCTIME').text().substr(0, 2);
			var depart = moment.utc($('#UTCDATE').text() + ' ' + $('#UTCTIME').text(), format2).local();
			if (_this.isBookable(depart)){
				try{
					debug('flight.cheapest.adult OK', flight.cheapest.adult);
					return flight;
				}catch(e){
					debug('flight.cheapest', flight.cheapest);
				}
			}
		});
		debug('after filter %d', flights.length);
		var cheapestFlight = _.min(flights, function (flight) {
			return flight.cheapest.adult;
		});
		return resolve(cheapestFlight.cheapest);
	});
}

var AirasiaPrototype = {
	init: init,
	getAllRoutes: getAllRoutes,
	mergeCache: mergeCache,
	getCheapestInRow: getCheapestInRow,
	generateData: generateData,
	scrapeLostData: scrapeLostData,
	mergeCachePrices: mergeCachePrices,
	prepareRows: prepareRows,
	calendarPrice: calendarPrice,
	getCalendarPrice: getCalendarPrice,
};
var Airasia = Base.extend(AirasiaPrototype);
module.exports = Airasia;
