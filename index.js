var garuda = require('./garuda');
var lion = require('./lion');
var airlines = {
	garuda: garuda,
	lion: lion
}
function priceCacheCalendar(airline) {
	return airlines[airline];
};
module.exports = priceCacheCalendar;