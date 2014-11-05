var Base = require('./Base');
var cheerio = require('cheerio');
function init (dt, scrape) {
	this._super('lion');
	for(var prop in dt){
		dt[prop] = dt[prop].toLowerCase()
	}
	this._dt = dt;
	this._scrape = scrape;
};
function getAllRoutes () {
	var _this = this;
	var routes = [];
	var $ = cheerio.load(_this._scrape);
	var rms = $('td[id^=RM]').html();
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
	var _this = this;
	var _cache = _this.cache;
	var lowestPrices = {};
	var $ = cheerio.load(_this._scrape);
	var rms = $('td[id^=RM]').html();
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
				if (!_this.cache[currentRoute])
					return true;
				var flightCode = $(tr).find('td').eq(0).text().trim().substr(0,2).toLowerCase();
				// get all radio
				$('td[id] input[type=radio][id]', tr).each(function(i, radio){
					var span = $(radio).parent();
					var available = $('label', span).text();
					var classCode = span.attr('title').substr(0,1).toLowerCase();
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
			});
			rowId++;
			row = getRow(rowId);
		} while (row.length);
	};
	looper(0);
	looper(1);
	this._scrape ='<body>' + $('body').html() + '</body>';
	return lowestPrices; 
};
var LionPrototype = {
	init: init,
	getAllRoutes: getAllRoutes,
	mergeCache: mergeCache
};
var Lion = Base.extend(LionPrototype);
module.exports = Lion;