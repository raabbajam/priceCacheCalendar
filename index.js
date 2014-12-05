var garuda = require('./modules/garuda');
var lion = require('./modules/lion');
var citilink = require('./modules/citilink');
var sriwijaya = require('./modules/sriwijaya');
var airasia = require('./modules/airasia');
// var express = require('./modules/express');
var airlines = {
	garuda: garuda,
	lion: lion,
	citilink: citilink,
	sriwijaya: sriwijaya,
	airasia: airasia,
	// express: express,
}
/**
 * Main function that returning function on init
 * @param  {String} airline Airline name
 * @return {Object}         Object of airline priceCacheCalendar
 */
function priceCacheCalendar(airline) {
	return airlines[airline];
};
module.exports = priceCacheCalendar;
