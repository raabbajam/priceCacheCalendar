var Base    = require('../Base');
var moment = require('moment');
var debug       = require('debug')('raabbajam:priceCacheCalendar:sriwijaya');
var _ = require('lodash');
var db = require('../libs/db');
var priceScrapers = require('priceScraper');
var SriwijayaPriceScrapers = priceScrapers.sriwijaya;
var cheerio = require('cheerio');
function init (dt, scrape, args) {
	this._super('sriwijaya', args);
	for(var prop in dt){
		dt[prop] = dt[prop].toLowerCase()
	}
	this._dt = dt;
	this._scrape = scrape;
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
						span.append('<span class="rp">rpciti'+cachePrice+'rpciti</span>');
				});
				lowestPriceRows.push(lowestPrices[currentRoute]);
			});
			// if there is more than one flight in on one row
			if (row.length > 1 && lowestPriceRows.length > 1) {
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
	var rutes = _.values(row.depart);
	rutes.push(_.values(row.arrive).pop());
	rutes = rutes.map(function (rute) {return rute.substr(0,3); })
	// debug('rutes',rutes);
	var flight = _.values(row.code_flight)[0].replace(/\s/g , '+');
	var out = {
		ori: rutes.shift(),
		dst: rutes.pop(),
		flight: flight,
	};
	rutes.forEach(function (rute, i) {
		out['transit' + (i + 1)] = rute;
	})
	var aClass = ['O', 'U', 'X', 'E', 'G', 'V', 'T', 'Q', 'N', 'M', 'L', 'K', 'H', 'B', 'W', 'S', 'Y', 'I', 'D', 'C'];
	_.forEach(aClass, function (_class) {
		var matchAvailable;
		if(row[_class][0].indexOf('disabled') === -1 && (matchAvailable = +row[_class][0].match(/>\((\d)\)</)[1]) > 0) {
			out.class = _class;
			return false;
		}
	})
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
function generateData (id) {
	var _id = id.split('_');
	// var rutes = _id[3];
	var cek_instant_id = _id[3] + '_' + _id[4];
	cek_instant_id = cek_instant_id.toUpperCase();
	var data = {
		ori           : _id[0].toUpperCase(),
		dst           : _id[1].toUpperCase(),
		airline       : _id[2],
		flightCode    : _id[3],
		classCode     : _id[4],
		cek_instant   : 1,
		cek_instant_id: cek_instant_id,
		dep_radio     : cek_instant_id,
		dep_date      : this._dt.dep_date,
		rute          : 'OW',
		action        : 'price',
		user          : 'DEPAG0101',
		priceScraper  : false
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
	var urlAirbinder = 'http://128.199.251.75:9019/price';
	var urlPluto = 'http://pluto.dev/0/price/sriwijaya';
	var options = {
		scrape: urlAirbinder,
		dt: dt,
		airline: 'sriwijaya'
	};
    var sriwijayaPriceScrapers = new SriwijayaPriceScrapers(options);
    return sriwijayaPriceScrapers.run().catch(function (err) {debug('sriwijayaPriceScrapers',err);});
}
/**
 * Merge json data with cheapest data from db
 * @param  {Object} json JSON formatted of scraped data
 * @return {Object}      JSON formatted of scraped data already merged with cache data
 */
function mergeCachePrices (json) {
	var _json = _.cloneDeep(json);
	var _this = this;
	debug('_this.cachePrices',JSON.stringify(_this.cachePrices, null, 2));
	// debug('_json.dep_table',_json)
	_json[0].dep_table = _.mapValues(_json[0].dep_table, function (row) {
		// debug('row',row)
		var rutes = _.values(row.depart);
		rutes.push(_.values(row.arrive).pop());
		rutes = rutes.map(function (rute) {return rute.substr(0,3); });
		var rute = rutes.join('').toLowerCase();
		debug('rute',rute);
		var flight = _.values(row.code_flight)[0].toLowerCase().replace(/\s/g , '+');;
		var aClass = ['O', 'U', 'X', 'E', 'G', 'V', 'T', 'Q', 'N', 'M', 'L', 'K', 'H', 'B', 'W', 'S', 'Y', 'I', 'D', 'C'];
		_.forEach(aClass, function (_class) {
			var matchAvailable;
			if(row[_class][0].indexOf('disabled') === -1 && (matchAvailable = +row[_class][0].match(/>\((\d)\)</)[1]) > 0) {
				try {
					row.cheapest = _this.cachePrices[rute][flight][_class.toLowerCase()];
				} catch (e) {debug(e);}
				if (!!row.cheapest) {
					row.cheapest.class = _class.toLowerCase();
					row.cheapest.available = matchAvailable;
				} else {
					row.cheapest = {class: 'Full', available: 0 };
				}
				return false;
			}
		});
		// debug('mergeCachePrices row', row)
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
	if (!!_json.ret_table && !!_json.ret_table[0])
		rows = rows.concat(_.values(_json.ret_table));
	return rows;
}
var SriwijayaPrototype = {
	init            : init,
	getAllRoutes    : getAllRoutes,
	mergeCache      : mergeCache,
	getCheapestInRow: getCheapestInRow,
	generateData    : generateData,
	scrapeLostData  : scrapeLostData,
	mergeCachePrices: mergeCachePrices,
	prepareRows     : prepareRows,
};
var Sriwijaya = Base.extend(SriwijayaPrototype);
module.exports = Sriwijaya;