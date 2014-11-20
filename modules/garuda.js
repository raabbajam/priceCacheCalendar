var Base = require('../Base');
var moment = require('moment');
var debug = require('debug')('raabbajam:priceCacheCalendar:garuda');
var _ = require('lodash');
var db = require('../libs/db');
var priceScrapers = require('priceScraper');
var GarudaPriceScrapers = priceScrapers.garuda;
function init (dt, scrape) {
	this._super('garuda');
	this._dt = dt;
	this._dt.ori = this._dt.ori.toLowerCase();
	this._dt.dst = this._dt.dst.toLowerCase();
	this._scrape = scrape;
};
function getAllRoutes () {
	var _this = this;
	var dep = this._scrape.departure;
	var ret = this._scrape.return;
	// debug(this._scrape);
	// debug(ret);
	var routes = [];
	function looper (route) {
		var rows = route.flights;
		rows.forEach(function (row) {
			row.forEach(function (flight) {
				var ori = flight.origin.toLowerCase();
				var dst = flight.destination.toLowerCase();
				var currentRoute = ori + dst;
				if (routes.indexOf(currentRoute) === -1){
					routes.push(currentRoute)
				}
			});
		});
	}
	looper(dep);
	if(ret)
		looper(ret);
	return routes;
};
function mergeCache (){
	var _this = this;
	var _cache = _this.cache;
	var dep = _this._scrape.departure;
	var ret = _this._scrape.return;
	var lowestPrices = {};
	function looper (route, _this) {
		var realRoute = _this._dt.ori.toLowerCase() + _this._dt.dst.toLowerCase()
		var rows = route.flights;
		route.flights = rows.map(function (row) {
			var lowestPriceRows = [];
			var _row = row.map(function (flight) {
				var lowestPriceFlight = 0;
				var ori = flight.origin.toLowerCase();
				var dst = flight.destination.toLowerCase();
				var currentRoute = ori + dst;
				// not cache
				if (!_this.cache[currentRoute])
					return flight;
				var flightCode = 'ga';
				flight.seats = flight.seats.map(function (seat) {
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
					if(!!seat.available //seat still available
						&& (!lowestPrices[currentRoute] //lowest still 0
						 || (lowestPrices[currentRoute] > seat.price && !!seat.price))){ //seat price cheaper but not zero
						lowestPrices[currentRoute] = seat.price;
					}
					return seat;
				});
				lowestPriceRows.push(lowestPrices[currentRoute]);
				return flight;
			});
			// if there is more than one flight in on one row
			if (row.length > 1 && lowestPriceRows.length > 1) {
				var lowestPriceRow = lowestPriceRows.reduce(function(price, num){return num + price}, 0)
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
	if(ret)
		_this._scrape.return = looper(ret, _this);
	return lowestPrices;
};
/**
 * return an array of object with ori, dst, class and flight property
 * @param  {Object} row Row object
 * @return {Array}     An array of object with ori, dst, class and flight property
 */
function getCheapestInRow (rowAll) {
	// debug('rowAll',rowAll );
	var outs = [];
	rowAll.forEach(function (row) {
		var out = {
			ori: row.origin,
			dst: row.destination,
			// flight: row.flightCode
			flight: 'ga'
		}
		var seats = row.seats;
		for (var i = seats.length - 1; i >= 0; i--) {
			if (seats[i].available !== "L" && +seats[i].available > 0) {
				out.class = seats[i].class;
				break;
			}
		};
		// debug(out);
		outs.push(out);
	})
	return outs;
}
/**
 * Generate data to scrape from id
 * @param  {String} id String id from database
 * @return {Object}    Object data for scrape
 */
function generateData (id) {
	var _airline = this.airline;
	return {
		ori       : id.substr(0,3),
		dst       : id.substr(3,3),
		airline   : _airline,
		action    : 'price',
		flightCode: 'ga',
		classCode : id.substr(-1,1),
		dep_radio : id.substr(-1,1) + '1',
		dep_date  : moment().add(1, 'M').format('DD+MM+YYYY'),
		user      : 'IANTONI.JKTGI229T'
	}
}
/**
 * Scrape lost data
 * @param  {String} id Data generated id to scrape
 * @return {Object}    Return cache data after scrape it
 */
function scrapeLostData (id) {
	debug('scrapeLostData',id);
	var dt = this.generateData(id);
    var urlAirbinder = 'http://128.199.251.75:9098/price';
    var urlPluto = 'http://pluto.dev/0/price/garuda';
    var options = {
      scrape: urlAirbinder,
      dt: dt,
      airline: this.airline,
    };
    var garudaPriceScrapers = new GarudaPriceScrapers(options);
    return garudaPriceScrapers.run().catch(function (err) {debug('garudaPriceScrapers',err);});
}
/**
 * Merge json data with cheapest data from db
 * @param  {Object} json JSON formatted of scraped data
 * @return {Object}      JSON formatted of scraped data already merged with cache data
 */
function mergeCachePrices (json) {
	var _json = _.cloneDeep(json);
	var depFlights = _json.departure.flights;
	var _this = this;
	debug('_this.cachePrices',_this.cachePrices);
	_json.departure.flights = _json.departure.flights.map(function (rowAll) {
		return rowAll.map(function (row) {
			var rute = row.origin + row.destination;
			var flight = 'ga';
			rute = rute.toLowerCase();
			var cheapestSeat = _.findLast(row.seats, function (seat) {
				return seat.available !== "L" && seat.available > 0;
			})
			var cheapestClass = cheapestSeat.class.toLowerCase();
			row.cheapest = _this.cachePrices[rute].ga[cheapestClass];
			if (row.cheapest){
				row.cheapest.class = cheapestSeat.class;
				row.cheapest.available = cheapestSeat.available;
			}
			return row;
		})
	})
	// debug(_json.departure.flights);
	// var ret = _json.return;
	return _json;
}
/**
 * Preparing rows to be looped on process
 * @param  {Object} json JSON formatted data from scraping
 * @return {Object}      Array of rows to be looped for getAkkCheaoest function
 */
function prepareRows (json) {
	var _json = _.cloneDeep(json);
	var rows = [];
	rows = rows.concat(_json.departure.flights);
	// debug('rows',_json.departure.flights);
	if (!!_json.return)
		rows = rows.concat(_json.return.flights);
	return rows;
}
var GarudaPrototype = {
	init            : init,
	getAllRoutes    : getAllRoutes,
	mergeCache      : mergeCache,
	getCheapestInRow: getCheapestInRow,
	generateData    : generateData,
	scrapeLostData  : scrapeLostData,
	mergeCachePrices: mergeCachePrices,
	prepareRows     : prepareRows,
};
var Garuda = Base.extend(GarudaPrototype);
module.exports = Garuda;