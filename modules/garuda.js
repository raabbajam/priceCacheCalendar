var Base = require('../Base');

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
	// console.log(this._scrape);
	// console.log(ret);
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
					// console.log(lowestPrices[realRoute], lowestPriceRow);
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
var GarudaPrototype = {
	init        : init,
	getAllRoutes: getAllRoutes,
	mergeCache  : mergeCache
};
var Garuda = Base.extend(GarudaPrototype);
module.exports = Garuda;