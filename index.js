var garuda = require('./modules/garuda');
var lion = require('./modules/lion');
var airlines = {
	garuda: garuda,
	lion: lion
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