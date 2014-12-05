var Base                  = require('../Base');
var moment                = require('moment');
var debug                 = require('debug')('raabbajam:priceCacheCalendar:airasia');
var _                     = require('lodash');
var db                    = require('../libs/db');
var priceScrapers         = require('priceScraper');
var AirasiaPriceScrapers = priceScrapers.airasia;
var cheerio               = require('cheerio');
function init (dt, scrape, args) {
	this._super('airasia', dt, scrape, args);
	// this.parallel = true;
};
function getAllRoutes () {
	var _this  = this;
	var routes = [];
	var json   = _this._scrape[0];
	var rows = [].concat(_.values(json.dep_table), _.values(json.ret_table));
	rows.forEach(function(row) {
		var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
		var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
		if (!departCity && !arriveCity )
			return true;
		var currentRoute = departCity + arriveCity;
		currentRoute = currentRoute.toLowerCase();
		if (routes.indexOf(currentRoute) === -1){
			routes.push(currentRoute)
		}
	})
	return routes;
};
function mergeCache (){
	var _this        = this;
	var _cache       = _this.cache;
	var _class = 'lo';
	var json   = _this._scrape[0];
	var lowestPrices = {};
	var realRoute = _this._dt.ori.toLowerCase() + _this._dt.dst.toLowerCase();
	var rows = [].concat(_.values(json.dep_table), _.values(json.ret_table));
	function looper(dir) {
		var rows = _.values(json[dir + '_table']);
		rows.forEach(function(row) {
			var lowestPriceRows = [];
			var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
			var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
			if (!departCity && !arriveCity )
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
			if(!lowestPrices[currentRoute] || (!!cachePrice && cachePrice < lowestPrices[currentRoute]))
				lowestPrices[currentRoute] = cachePrice;
			var nominal = (row.lowFare.match(/price"><span>([\s\S]+)IDR/) || [])[1];
			row.lowFare = row.lowFare.replace(/price"><span>([\s\S]+)IDR/, 'price"><span>' + 100000 + ' IDR')
			lowestPriceRows.push(lowestPrices[currentRoute]);
		});
		return rows;
	}
	json.dep_table = looper('dep');
	if (!!json.ret_table)
		json.ret_table = looper('ret');
	_this._scrape[0] = json;
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
	var _class = 'lo';
	var seatRequest = this.paxNum || 1;
	if (!row.lowFare)
		return outs;
	var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
	var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
	if (!departCity && !arriveCity )
		return true;
	var currentRoute = departCity + arriveCity;
	var nominal = (row.lowFare.match(/price"><span>([\s\S]+)IDR/) || [])[1];
	nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
	var flightCode = (row.lowFare.match(/\|([A-Z]{2})/) || [])[1];
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
		dep_date      : this._dt.dep_date.replace(/\s/g, '+'),
		// dep_date      : moment().add(1, 'M').format('DD+MMM+YYYY'),
		rute: 'OW',
		dep_radio  : '1_1',
		action        : 'price',
		user          : 'apwqz',
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
function scrapeLostData (id) {
	debug('scrapeLostData',id);
	var dt = this.generateData(id);
	var urlAirbinder = 'http://128.199.251.75:99/price';
	var urlPluto = 'http://folbek.me:3000/0/price/airasia';
	// debug('dt',dt)
	var options = {
		scrape : this.scrape || urlAirbinder,
		dt: dt,
		airline: 'airasia'
	};
    var airasiaPriceScrapers = new AirasiaPriceScrapers(options);
    return airasiaPriceScrapers.run().catch(function (err) {debug('airasiaPriceScrapers',err);});
}
/**
 * Merge json data with cheapest data from db
 * @param  {Object} json JSON formatted of scraped data
 * @return {Object}      JSON formatted of scraped data already merged with cache data
 */
function mergeCachePrices (json) {
	var _json = _.cloneDeep(json);
	var _this = this;
	var seatRequest = this.paxNum || 1;
	var _class = 'lo';
	// debug('_this.cachePrices',JSON.stringify(_this.cachePrices, null, 2));
	// debug('_json.dep_table',_json)
	_json[0].dep_table = _.mapValues(_json[0].dep_table, function (row) {
		var departCity = (row.dateDepart.match(/\(([A-Z]{3})\)/) || [])[1];
		var arriveCity = (row.dateArrive.match(/\(([A-Z]{3})\)/) || [])[1];
		// debug('departCity', departCity, 'arriveCity', arriveCity );
		if (!departCity && !arriveCity )
			return row;
		var currentRoute = departCity + arriveCity;
		currentRoute = currentRoute.toLowerCase();
		// debug('_this.cachePrices[currentRoute]', _this.cachePrices[currentRoute])
		if (!_this.cachePrices[currentRoute])
			return row;
		var nominal = (row.lowFare.match(/price"><span>([\s\S]+)IDR/) || [])[1];
		nominal = Math.round(+nominal.replace(/\D/g, '') / 1000);
		var flightCode = (row.lowFare.match(/\|([A-Z]{2})/) || [])[1];
		flightCode = flightCode.toLowerCase();
		var classCode = _class.toLowerCase() + nominal;
		try{row.cheapest = _this.cachePrices[currentRoute][flightCode][classCode]; }
		catch (e){
			debug(e.message, currentRoute, flightCode, classCode);
			_this.cachePrices[currentRoute] = _this.cachePrices[currentRoute] || {};
			_this.cachePrices[currentRoute][flightCode] = _this.cachePrices[currentRoute][flightCode] || {};
		}
		if (!!row.cheapest) {
			row.cheapest.class = classCode;
			row.cheapest.available = 'N/A';
		} else {
			row.cheapest = {
				class: 'Full',
				available: 0
			}
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
function prepareRows (json) {
	var _json = _.cloneDeep(json[0]);
	var rows = [];
	rows = rows.concat(_.values(_json.dep_table));
	// debug('rows',_json.departure.flights);
	if (!!_json.ret_table && !!_json.ret_table[0])
		rows = rows.concat(_.values(_json.ret_table));
	return rows;
}
var AirasiaPrototype = {
	init            : init,
	getAllRoutes    : getAllRoutes,
	mergeCache      : mergeCache,
	getCheapestInRow: getCheapestInRow,
	generateData    : generateData,
	scrapeLostData  : scrapeLostData,
	mergeCachePrices: mergeCachePrices,
	prepareRows     : prepareRows,
};
var Airasia = Base.extend(AirasiaPrototype);
module.exports = Airasia;
