var Base              = require('../Base');
var moment            = require('moment');
var debug             = require('debug')('raabbajam:priceCacheCalendar:lion');
var _                 = require('lodash');
var db                = require('../libs/db');
var priceScrapers     = require('priceScraper');
var LionPriceScrapers = priceScrapers.lion;
var cheerio           = require('cheerio');
function init (dt, scrape, args) {
	this._super('lion', dt, scrape, args);
};
function getAllRoutes () {
	var _this  = this;
	var routes = [];
	var $      = cheerio.load(_this._scrape);
	var rms    = $('td[id^=RM]').html();
	if (!rms)
		return false;
	function looper (dir) {
		function getRow (i) {
			return $('tr[id^=RM' + dir + '_C' + i +']');
		};
		var rowId = 0;
		var row = getRow(rowId);
		if (!row)
			return false;
		do {
			row.each(function (i, tr) {
				var rm = $('td[id^=RM]', tr).html();
				if (!rm)
					return true;
				var currentRoute = rm.match(/[A-Z]{6}/)[0].toLowerCase();
				if (routes.indexOf(currentRoute) === -1){
					routes.push(currentRoute)
				}
			});
			rowId++;
			row = getRow(rowId);
		} while (row.length);
	};
	looper(0);
	looper(1);
	return routes;
};
function mergeCache (){
	var _this        = this;
	var _cache       = _this.cache;
	var lowestPrices = {};
	var $            = cheerio.load(_this._scrape);
	var rms          = $('td[id^=RM]').html();
	if (!rms)
		return false;
	function looper (dir) {
		function getRow (i) {
			return $('tr[id^=RM' + dir + '_C' + i +']');
		};
		var realRoute = _this._dt.ori.toLowerCase() + _this._dt.dst.toLowerCase();
		var rowId     = 0;
		var row       = getRow(rowId);
		if (!row)
			return false;
		do {
			var lowestPriceRows = [];
			row.each(function (i, tr) {
				var rm = $('td[id^=RM]', tr).html();
				if (!rm)
					return true;
				var currentRoute = rm.match(/[A-Z]{6}/)[0].toLowerCase();
				if (!_this.cache[currentRoute])
					return true;
				var flightCode = $(tr).find('td').eq(0).text().trim().substr(0,2).toLowerCase();
				// get all radio
				$('td[id] input[type=radio][id]', tr).each(function(i, radio){
					var span       = $(radio).parent();
					var available  = $('label', span).text();
					var classCode  = span.attr('title').substr(0,1).toLowerCase();
					var cachePrice = (_cache[currentRoute] &&
								_cache[currentRoute][flightCode] &&
								_cache[currentRoute][flightCode][classCode]) || 0;
					cachePrice = Math.round(cachePrice / 10) * 10;
					// update lowest price
					// if seat still available
					// and,
					// 	either lowest price for this route still 0
					//  	or
					//  	seat price cheaper than lowest price
					//  	but not zero
					if(!!available //seat still available
						&& (!lowestPrices[currentRoute] //lowest still 0
						|| (lowestPrices[currentRoute] > cachePrice && !!cachePrice))) //seat price cheaper but not zero
						lowestPrices[currentRoute] = cachePrice;
					// if in 'span' there is no '.rp' class and cachePrice is not zero
					if(!!cachePrice && !$('.rp', span).length)
						span.append('<span class="rp">rplion'+cachePrice+'rplion</span>');
				});
				lowestPriceRows.push(lowestPrices[currentRoute]);
			});
			// if there is more than one flight in on one row
			if (row.length > 1 && lowestPriceRows.length > 1 && _.every(lowestPriceRows)) {
				var lowestPriceRow = lowestPriceRows.reduce(function(price, num){return num + price}, 0)
				if (!lowestPrices[realRoute] || lowestPriceRow < lowestPrices[realRoute]) {
					lowestPrices[realRoute] = lowestPriceRow;
					// console.log(lowestPrices[realRoute], lowestPriceRow);
				}
			}
			rowId++;
			row = getRow(rowId);
		} while (row.length);
	};
	looper(0);
	looper(1);
	this._scrape ='<body>' + $('body').html() + '</body>';
	return lowestPrices;
};
/**
 * return an array of object with ori, dst, class and flight property
 * @param  {Object} row Row object
 * @return {Array}     An array of object with ori, dst, class and flight property
 */
function getCheapestInRow (row) {
	// debug('rowAll',row );
	var outs = [];
	// _.each(rowAll,function (row, key) {
		// debug('getCheapestInRow row', row)
		var rute = row.hidden.match(/[A-Z]{6}/)[0] || '';
		var flight = row.aircraft.match(/images\/Logos\/(\w+)/)[1] || '';
		var out = {
			ori: rute.substr(0, 3),
			dst: rute.substr(3, 3),
			// flight: row.flightCode
			flight: flight,
		};
		var aClass = Object.keys(row).filter(function(b){return b.length === 1})
		_.forEachRight(aClass, function (_class) {
			var matchAvailable = row[_class].match(/(\d)+<\/label>/);
			if (!!row[_class] && row[_class].indexOf('disabled') === -1 && !!matchAvailable && matchAvailable.length > 1){
				if (+matchAvailable[1] > 0) {
					out.class = _class;
					return false;
				}
			}
		})
		// debug(out);
		if (!!out.class)
			outs.push(out);
	// });
	return outs;
}
/**
 * Generate data to scrape from id
 * @param  {String} id String id from database
 * @return {Object}    Object data for scrape
 */
function generateData (id) {
	var _id = id.split('_');
	var cek_instant_id = _id[3] + '_' + _id[4];
	cek_instant_id = cek_instant_id.toUpperCase();
	var data = {
		ori           : _id[0],
		dst           : _id[1],
		airline       : _id[2],
		flightCode    : _id[3],
		classCode     : _id[4],
		cek_instant   : 1,
		cek_instant_id: cek_instant_id,
		dep_date      : this._dt.dep_date,
		// dep_date      : moment().add(1, 'M').format('DD+MMM+YYYY'),
		rute: 'OW',
		dep_radio     : 'XX_XX_XX_XX',
		action        : 'price',
		user          : 'ndebomitra',
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
function scrapeLostData (id) {
	debug('scrapeLostData',id);
	var dt = this.generateData(id);
	var urlAirbinder = 'http://128.199.251.75:2/price';
	var urlPluto = 'http://pluto.dev/0/price/lion';
	var options = {
		scrape: urlAirbinder,
		dt: dt,
		airline: 'lion'
	};
    var lionPriceScrapers = new LionPriceScrapers(options);
    return lionPriceScrapers.run().catch(function (err) {debug('lionPriceScrapers',err);});
}
/**
 * Merge json data with cheapest data from db
 * @param  {Object} json JSON formatted of scraped data
 * @return {Object}      JSON formatted of scraped data already merged with cache data
 */
function mergeCachePrices (json) {
	var _json = _.cloneDeep(json);
	var _this = this;
	debug('_this.cachePrices',JSON.stringify(_this.cachePrices));
	_json[0].dep_table = _.mapValues(_json[0].dep_table, function (row) {
		var rute = row.hidden.match(/[A-Z]{6}/)[0] || '';
		var flight = row.aircraft.match(/images\/Logos\/(\w+)/)[1] || '';
		rute = rute.toLowerCase();
		flight = flight.toLowerCase();
		var aClass = Object.keys(row).filter(function(b){return b.length === 1})
		_.forEachRight(aClass, function (_class) {
			var matchAvailable = row[_class].match(/(\d)+<\/label>/);
			if (!!row[_class] && row[_class].indexOf('disabled') === -1 && !!matchAvailable && matchAvailable.length > 1){
				if (+matchAvailable[1] > 0) {
					try{row.cheapest = _this.cachePrices[rute][flight][_class.toLowerCase()]; }
					catch(e){
						debug(e.message, rute, flight, _class);
						_this.cachePrices[rute] = _this.cachePrices[rute] || {};
						_this.cachePrices[rute][flight] = _this.cachePrices[rute][flight] || {};
					}
					if (!!row.cheapest) {
						row.cheapest.class = _class.toLowerCase();
						row.cheapest.available = +matchAvailable[1];
					} else {
						row.cheapest = {
							class: 'Full',
							available: 0
						}
					}
					return false;
				}
			}
		});
		return row;
	});
	// debug(_json.dep_table);
	// var ret = _json.return;
	return _json;
}
/**
 * Preparing rows to be looped on process
 * @param  {Object} json JSON formatted data from scraping
 * @return {Object}      Array of rows to be looped for getAkkCheaoest function
 */
function prepareRows (json) {
	var _json = _.cloneDeep(json[0]);
	var rows = [];
	rows = rows.concat(_.values(_json.dep_table));
	// debug('rows',_json.departure.flights);
	if (!!_json.ret_table[0])
		rows = rows.concat(_.values(_json.ret_table));
	return rows;
}
var LionPrototype = {
	init            : init,
	getAllRoutes    : getAllRoutes,
	mergeCache      : mergeCache,
	getCheapestInRow: getCheapestInRow,
	generateData    : generateData,
	scrapeLostData  : scrapeLostData,
	mergeCachePrices: mergeCachePrices,
	prepareRows     : prepareRows,
};
var Lion = Base.extend(LionPrototype);
module.exports = Lion;