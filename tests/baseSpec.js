var expect = require('chai').expect;
var moment = require('moment');
var _ = require('lodash');
var Base = require('../Base');
var priceScrapers = require('priceScraper');
var GarudaPriceScrapers = priceScrapers.garuda;
describe('Base', function () {
	describe('getCheapestInRow, getAllCheapest', function () {
		{//init
			var childProperty = {
				getCheapestInRow: function (rowAll) {
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
						outs.push(out);
					})
					return outs;
				}
			}
			var Child = Base.extend(childProperty);
			var row = [{"flightCode":"GA 202","origin":"CGK","destination":"JOG","depart":"05:25","arrive":"06:40","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":2882610},{"class":"D","available":"2","price":0},{"class":"Y","available":"9","price":1229300},{"class":"B","available":"9","price":0},{"class":"M","available":"9","price":0},{"class":"K","available":"9","price":1130310},{"class":"N","available":"9","price":0},{"class":"G","available":"L","price":0}]}];
			var rows = [[{"flightCode":"GA 303","origin":"SUB","destination":"CGK","depart":"05:25","arrive":"07:00","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200}]}],[{"flightCode":"GA 305","origin":"SUB","destination":"CGK","depart":"06:15","arrive":"07:50","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200}]}],[{"flightCode":"GA 307","origin":"SUB","destination":"CGK","depart":"07:50","arrive":"09:25","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200}]}],[{"flightCode":"GA 449","origin":"SUB","destination":"CGK","depart":"08:25","arrive":"10:00","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"4","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0}]}],[{"flightCode":"GA 309","origin":"SUB","destination":"CGK","depart":"08:50","arrive":"10:25","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200},{"class":"S","available":"4","price":0},{"class":"H","available":"4","price":698010}]}],[{"flightCode":"GA 311","origin":"SUB","destination":"CGK","depart":"10:10","arrive":"11:45","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"L","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200}]}],[{"flightCode":"GA 313","origin":"SUB","destination":"CGK","depart":"11:10","arrive":"12:45","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200},{"class":"S","available":"9","price":0},{"class":"H","available":"9","price":698010}]}],[{"flightCode":"GA 315","origin":"SUB","destination":"CGK","depart":"12:30","arrive":"14:05","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200}]}],[{"flightCode":"GA 317","origin":"SUB","destination":"CGK","depart":"13:30","arrive":"15:05","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0}]}],[{"flightCode":"GA 319","origin":"SUB","destination":"CGK","depart":"14:50","arrive":"16:25","seats":[{"class":"J","available":"9","price":0},{"class":"C","available":"9","price":3967200},{"class":"D","available":"2","price":3771410},{"class":"Y","available":"9","price":1542800},{"class":"B","available":"9","price":1505410},{"class":"M","available":"9","price":1468010},{"class":"K","available":"9","price":1430610},{"class":"N","available":"9","price":0},{"class":"Q","available":"9","price":1248010},{"class":"G","available":"L","price":0},{"class":"T","available":"9","price":1109410},{"class":"V","available":"9","price":975200}]}]];
			var child = new Child();
		}
		it('should return an array of object with ori, dst, class and flight property', function (next) {
			var cheapest = child.getCheapestInRow(row);
			expect(cheapest.length).to.eq(1);
			expect(cheapest[0].class).to.eq("N");
			next();
		});
		it('should return an array cheapest class', function (next) {
			var flightClasses = child.getAllCheapest(rows);
			// console.log(flightClasses);
			expect(Object.keys(flightClasses).length).to.gt(0);
			next();
		});
	});
	describe('getCachePrices, getAllCachePrices', function() {
		this.timeout(15000);
		var dataFound = { subcgk: { ga: [ 'v', 'h' ] } };
		var dataLost = { subcgk: { ga: [ 'c' ] } };
		var base = new Base('garuda');
		it('should get all cache based on cheapest flight data -- found', function (next) {
			base.getAllCachePrices(dataFound)
				.then(function (res) {
					// console.log(JSON.stringify(res, null, 2));
					expect(res).to.exist;
					// console.log('base.cachePrices', base.cachePrices);
					next();
				}, function (err) {
					console.log(err.losts);
					expect(err.losts).to.exists;
					next(err);
				});
		});
		it('should get all cache based on cheapest flight data -- lost', function (next) {
			base.getAllCachePrices(dataLost)
				.then(function (res) {
					expect(res).to.exist;
					next();
				}, function (err) {
					console.log(err.losts);
					expect(err.losts).to.exists;
					next();
				});
		});
	});
	describe('generateData', function() {
		this.timeout(60000 * 2);
		{//init
			var Child = Base.extend({
				generateData: function (id) {
					var _airline = this.airline;
					return {
						ori: id.substr(0,3),
						dst: id.substr(3,3),
						airline: _airline,
						action: 'price',
						flightCode: 'ga',
						classCode: id.substr(-1,1),
						dep_radio: id.substr(-1,1) + '1',
						dep_date: moment().add(1, 'M').format('DD+MM+YYYY'),
						user: 'IANTONI.JKTGI229T'
					}
				},
				scrapeLostData: function (id) {
					var dt = this.generateData(id);
			        var urlAirbinder = 'http://128.199.251.75:9098/price';
			        var urlPluto = 'http://pluto.dev/0/price/garuda';
			        var options = {
			          scrape: urlAirbinder,
			          dt: dt,
			          airline: 'garuda',
			        };
			        var garudaPriceScrapers = new GarudaPriceScrapers(options);
			        return garudaPriceScrapers.run()
				}
			})
			var losts = [ 'subcgkgarudagav', 'subcgkgarudagaq', 'subcgkgarudagah' ];
			var id = 'subcgkgarudagah';
			var child = new Child('garuda');
		}
		it('should generate data to scrape', function (done) {
			var data = child.generateData(id);
			expect(data.ori).to.exist;
			done();
		});
		it('should scrape data based on not cached file -- one id', function (done) {
			child.scrapeLostData(id)
				.then(function (res) {
					console.log(res);
					expect(res).to.exist;
				}, done);
		})
		it('should scrape data based on not cached file -- array of ids', function (done) {
			child.scrapeAllLostData(losts)
				.then(function (res) {
					console.log(res);
					expect(res).to.exist;
				}, done);
		})
	});
	/*describe('mergeCachePrices', function() {
		var cachePrices = {"subcgk": {"ga": {"v": {"adult": 975203, "child": 975203, "infant": 102903, "basic": 882003 } }, "id": {"y": {"adult": 1418704, "child": 1418704, "infant": 157004, "basic": 1326704 } } } }
		var Child = Base.extend({
			mergeCachePrices: function (json) {
				var mergedJson = ;
				var depFlights = json.departure;
				depFlights.map
				var ret = json.return;
			}
		})
		var child = new Child('garuda', {cachePrices: cachePrices});
		var json =  fs.readFileSync('./gacp.json', 'utf8');
		it('should merge json data with cheapest', function (done) {
			var mergedJson = child.mergeCachePrices(json);
			expect(mergeJson).to.exist;
			fs.writeFileSync('./gacp2.json', JSON.stringify(mergedJson,null, 4));
			done();
		});
	});*/
});