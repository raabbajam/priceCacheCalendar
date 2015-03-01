var Base = require('../Base');
var moment = require('moment');
var debug = require('debug')('raabbajam:priceCacheCalendar:citilink');
var _ = require('lodash');
var db = require('../libs/db');
var priceScrapers = require('priceScraper');
var CitilinkPriceScrapers = priceScrapers.citilink;
var cheerio = require('cheerio');
var Promise = require('promise');

function init(dt, scrape, args) {
	this._super('citilink', dt, scrape, args);
	this.parallel = true;
}

function getAllRoutes() {
	var _this = this;
	var routes = [];
	var $ = cheerio.load(_this._scrape);

	function looper(dir) {
		var trs = $('#availabilityTable' + dir + ' > tr.altRowItem, #availabilityTable' + dir + ' > tr:not([class])');
		if (!trs || !!trs && trs.length === 0)
			return false;
		// debug('trs.length',trs.length)
		trs.splice(0, 1); // remove 1st element
		trs.each(function(i, tr) {
			var fares = $('.fareCol2', tr)
				.html();
			if (!fares)
				return true;
			var currentRoute = _.map(_.uniq(fares.match(/~([A-Z]){3}~/g)), function(rute) {
					return rute.replace(/\W/g, '');
				})
				.join('');
			// debug('currentRoute',currentRoute)
			currentRoute = currentRoute.toLowerCase();
			if (routes.indexOf(currentRoute) === -1) {
				routes.push(currentRoute);
			}
		});
	}
	looper(0);
	looper(1);
	return routes;
}

function mergeCache() {
	var _this = this;
	var _cache = _this.cache;
	var lowestPrices = {};
	var $ = cheerio.load(_this._scrape);

	function looper(dir, save) {
		var realRoute = _this._dt.ori.toLowerCase() + _this._dt.dst.toLowerCase();
		var trs = $('#availabilityTable' + dir + ' > tr.altRowItem, #availabilityTable' + dir + ' > tr:not([class])');
		if (!trs || !!trs && trs.length === 0)
			return false;
		// debug('trs.length',trs.length)
		trs.splice(0, 1); // remove 1st element
		var lowestPriceRows = [];
		// debug('_this.cache',_this.cache)
		trs.each(function(i, tr) {
			var fares = $('.fareCol2', tr)
				.html();
			if (!fares)
				return true;
			var fareMatch;
			try {
				fareMatch = fares.match(/\d+(Fare)\w+/g);
				// debug('fareMatch',fareMatch)
			} catch (e) {
				var err = new Error('No flight fare found!');
				throw err;
			}
			// debug('_this.cache',_this.cache)
			var currentRoute = _.map(_.uniq(fares.match(/~([A-Z]){3}~/g)), function(rute) {
				return rute.replace(/\W/g, '');
			});
			currentRoute = [currentRoute.shift(), currentRoute.pop(), currentRoute.join('')].join('')
				.toLowerCase();
			// debug('currentRoute',currentRoute)
			if (!_this.cache[currentRoute])
				return true;
			var currentCache = _this.cache[currentRoute];
			var flightCode = $('td:nth-child(3)', tr)
				.text()
				.trim()
				.substr(0, 2)
				.toLowerCase();
			var fareData2 = '';
			fareMatch.forEach(function(fare, i) {
				// debug('fare',fare)
				try {
					var input = $('[id$=' + fare + ']');
					// var p     = $('td:nth-child(5)', tr).find('p').eq(i);
					var p = input.parents('p');
					var pHtml = p.html();
					var pText = p.text()
						.trim();
					var basic = +p.text()
						.match(/(Rp.)([\d,]+)/g)[0].replace(/\D/g, '');
					var nominal = basic / 1000;
					var available = +(pText.match(/(\d+) \)$/) || [])[1];
					var _class = (pText.match(/\( (\S)\/Cls/) || [])[1];
					var classCache = _class.toLowerCase() + nominal;
					var cachePrice = (currentCache[flightCode] && currentCache[flightCode][classCache]) || 0;
					// debug('currentRoute:classCache', currentRoute + ':' + classCache, 'cachePrice', cachePrice);
					// debug(fare, classCache, currentCache[flightCode], currentCache[flightCode][classCache]);
					// debug(save, available, lowestPrices[currentRoute], cachePrice)
					if (!!save && !!available && available > 0 && (!lowestPrices[currentRoute] || (!!cachePrice && cachePrice < lowestPrices[currentRoute])))
						lowestPrices[currentRoute] = cachePrice;
					// cachePrice = Math.round(cachePrice / 100) * 100;
					var after = pHtml.replace(/Rp.[\d,]+/, 'Rp.' + cachePrice);
					fareData2 = fareData2 + '<p>' + after + '</p><script>' + basic + '</script>';
				} catch (e) {
					debug(e.message);
						// fareData2 = 0;
						// do nothing
				}
				//after = pHtml;
				//p.html(after);
			});
			lowestPriceRows.push(lowestPrices[currentRoute]);
			$('td:nth-child(5)', tr)
				.html(fareData2);
		});
	}
	looper(0, 1);
	looper(1);
	this._scrape = '<body>' + $('body')
		.html() + '</body>';
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
	var seatRequest = 1; //this.paxNum || 1;
	if (!row.normal_fare)
		return outs;
	var rutes = _.map(_.uniq(row.normal_fare.match(/~([A-Z]){3}~/g)), function(rute) {
		return rute.replace(/\W/g, '');
	});
	// debug('rutes',rutes);
	var flight = row.flight.substr(0, 2) || '';
	var out = {
		ori: rutes.shift(),
		dst: rutes.pop(),
		// flight: row.flightCode
		flight: flight,
	};
	rutes.forEach(function(rute, i) {
			out['transit' + (i + 1)] = rute;
		});
		// var aClass = ['Q', 'P', 'O', 'N', 'M', 'L', 'K', 'H', 'G', 'F', 'E', 'D', 'B', 'A'];
	var aClass = row.normal_fare.match(new RegExp('\\( ([A-Za-z]+)/Cls;\r\n([\\s\\S]+?)\\)\r\n\\s+</p><script>(\\d+)', 'g'));
		// debug(aClass)
	_.forEach(aClass, function(sClass) {
			var matches = sClass.match(new RegExp('\\( ([A-Za-z]+)/Cls;\r\n([\\s\\S]+?)\\)\r\n\\s+</p><script>(\\d+)'));
				// debug(matches);
			if (!matches)
				return true;
			// debug(matches[1], matches[2]);
			var matchAvailable = +(matches[2] || '0')
				.trim();
			if (matchAvailable >= seatRequest) {
				var _class = (matches[1] || 'N/A')
					.trim();
				var nominal = +matches[3] / 1000;
				// debug('matchAvailable', matchAvailable, '_class', _class, 'nominal', nominal)
				out.class = _class + nominal;
				return false;
			}
		});
		// debug(out);
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
	debug('passengersNum', passengersNum);
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
		// dep_date      : moment().add(1, 'M').format('DD+MMM+YYYY'),
		rute: 'OW',
		dep_radio: '1Fare6',
		action: 'price',
		user: 'mitrabook',
		priceScraper: false
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
	var urlAirbinder = 'http://128.199.251.75:4/price';
	var urlPluto = 'http://pluto.dev/0/price/citilink';
	// debug('dt',dt)
	var options = {
		scrape: this.scrape || urlAirbinder,
		dt: dt,
		airline: 'citilink'
	};
	var citilinkPriceScrapers = new CitilinkPriceScrapers(options);
	return citilinkPriceScrapers.run()
		.catch(function(err) {
			debug('citilinkPriceScrapers', err);
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
	var seatRequest = 1; //this.paxNum || 1;
	// debug('_this.cachePrices',JSON.stringify(_this.cachePrices, null, 2));
	// debug('_json.dep_table',_json)
	var format = ['DD MM YYYY', 'DD+MM+YYYY'];
	var format2 = ['DD MM YYYY HH:mm', 'DD+MM+YYYY HH:mm'];var dep_date = _this._dt.dep_date;
	var date = moment(dep_date, format);
	var dayRangeForExpiredCheck = 2;
	var checkDate = moment()
		.add(dayRangeForExpiredCheck, 'day');
	_this.isSameDay = false;
	if (date.isBefore(checkDate, 'day'))
		_this.isSameDay = true;
	_json[0].dep_table = _.mapValues(_json[0].dep_table, function(row) {
		var rute = _.map(_.uniq(row.normal_fare.match(/~([A-Z]){3}~/g)), function(rute) {
				return rute.replace(/\W/g, '');
			})
			.join('');
		
		row.cheapest = {
			class: 'Full',
			available: 0
		};
		var flight = row.flight.substr(0, 2) || '';
		rute = rute.toLowerCase();
		flight = flight.toLowerCase();
		// var aClass = ['Q', 'P', 'O', 'N', 'M', 'L', 'K', 'H', 'G', 'F', 'E', 'D', 'B', 'A'];
		var aClass = row.normal_fare.match(new RegExp('\\( ([A-Za-z]+)/Cls;\r\n([\\s\\S]+?)\\)\r\n\\s+</p><script>(\\d+)', 'g'));
		// debug('aClass',aClass,'row.normal_fare',row.normal_fare,'regex','\\( ([A-Za-z]+)/Cls;\r\n([\\s\\S]+?)\\)\r\n\\s+</p><script>(\\d+)');
		_.forEach(aClass, function(_class) {
			// var matches = row.normal_fare.match(new RegExp('\\( ' + _class + '/Cls;\r\n([\\s\\S]+?)\\)\r\n\\s+</p><script>(\\d+)'))
			var matches = _class.match(new RegExp('\\( ([A-Za-z]+)/Cls;\r\n([\\s\\S]+?)\\)\r\n\\s+</p><script>(\\d+)'));
				// debug('matches',matches)
			if (!matches)
				return true;
			_class = (matches[1] || 'N/A')
				.trim();
			var nominal = +matches[3] / 1000;
			var matchAvailable = +(matches[2] || '0')
				.trim();
			// debug(matchAvailable, nominal);
			var _classNominal = _class.toLowerCase() + nominal;
			// debug('_classNominal',_classNominal)
			if (matchAvailable >= seatRequest) {
				try {
					var depart = moment(dep_date + ' ' + row.times, format2);
					if (_this.isBookable(depart)){
						row.cheapest = _this.cachePrices[rute][flight][_classNominal];
						row.cheapest.class = _class.toLowerCase();
						row.cheapest.available = +matchAvailable;
					}
				} catch (e) {
					debug(e.message, rute, flight, _classNominal);
					_this.cachePrices[rute] = _this.cachePrices[rute] || {};
					_this.cachePrices[rute][flight] = _this.cachePrices[rute][flight] || {};
				}
				return false;
			}
		});
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

function getCalendarPrice(json) {
	var _this = this;
	var format = ['DD MM YYYY', 'DD+MM+YYYY'];
	var format2 = ['DD MM YYYY HH:mm', 'DD+MM+YYYY HH:mm'];
	return new Promise(function(resolve, reject) {
		if (!json[0].dep_table && !json[0].dep_table[0] && !json[0].dep_table[0].dateDepart)
			return resolve();
		var dep_date = _this._dt.dep_date;
		var date = moment(dep_date, format);
		var dayRangeForExpiredCheck = 2;
		var checkDate = moment()
			.add(dayRangeForExpiredCheck, 'day');
		_this.isSameDay = false;
		if (date.isBefore(checkDate, 'day'))
			_this.isSameDay = true;
		var cheapests = [];
		_.each(json[0].dep_table, function(flight) {
			// debug('depart %s', dep_date + ' ' + flight.times);
			var depart = moment(dep_date + ' ' + flight.times, format2);
			if (_this.isBookable(depart)){
				try{
					if (flight.cheapest){
						cheapests.push(flight.cheapest);
					}
				}catch(e){
					debug('flight.cheapest',flight.cheapest);
				}
			}
		});
		debug('before filter %d', _.size(json[0].dep_table));
		debug('after filter %d', cheapests.length);
		var cheapestFlight = _.min(cheapests, function(cheapest, i) {
			debug('cheapests: %j', cheapest.adult);
			return cheapest.adult;
		});
		return resolve(cheapestFlight);
	});
}

var CitilinkPrototype = {
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
var Citilink = Base.extend(CitilinkPrototype);
module.exports = Citilink;
