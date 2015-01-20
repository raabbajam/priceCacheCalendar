# TOC
   - [Base](#base)
     - [getCheapestInRow, getAllCheapest](#base-getcheapestinrow-getallcheapest)
     - [getCachePrices, getAllCachePrices](#base-getcacheprices-getallcacheprices)
     - [generateData, scrapeLostData, scrapeAllLostData](#base-generatedata-scrapelostdata-scrapealllostdata)
     - [mergeCachePrices](#base-mergecacheprices)
     - [prepareRows](#base-preparerows)
   - [Cache prices for Citilink](#cache-prices-for-citilink)
     - [merge](#cache-prices-for-citilink-merge)
   - [Cache prices for Garuda](#cache-prices-for-garuda)
     - [merge](#cache-prices-for-garuda-merge)
   - [Cache prices for Lion](#cache-prices-for-lion)
     - [merge](#cache-prices-for-lion-merge)
   - [Price Generator](#price-generator)
   - [Cache prices for Sriwijaya](#cache-prices-for-sriwijaya)
     - [merge](#cache-prices-for-sriwijaya-merge)
<a name=""></a>
 
<a name="base"></a>
# Base
<a name="base-getcheapestinrow-getallcheapest"></a>
## getCheapestInRow, getAllCheapest
should return an array of object with ori, dst, class and flight property.

```js
var cheapest = child.getCheapestInRow(row);
expect(cheapest.length).to.eq(1);
expect(cheapest[0].class).to.eq("N");
next();
```

should return an array cheapest class.

```js
var flightClasses = child.getAllCheapest(rows);
debug(flightClasses);
expect(Object.keys(flightClasses).length).to.gt(0);
next();
```

<a name="base-getcacheprices-getallcacheprices"></a>
## getCachePrices, getAllCachePrices
should get all cache based on cheapest flight data -- found.

```js
base.getAllCachePrices(dataFound)
	.then(function (res) {
		// debug(JSON.stringify(res, null, 2));
		expect(res).to.exists;
		// debug('base.cachePrices', base.cachePrices);
		next();
	}, function (err) {
		// debug(err.losts);
		expect(err.losts).to.exist;
		next(err);
	});
```

should get all cache based on cheapest flight data -- lost.

```js
base.getAllCachePrices(dataLost)
	.then(function (res) {
		expect(res).to.exist;
		next();
	}, function (err) {
		// debug(err.losts);
		expect(err.losts).to.exists;
		next();
	});
```

<a name="base-generatedata-scrapelostdata-scrapealllostdata"></a>
## generateData, scrapeLostData, scrapeAllLostData
should generate data to scrape.

```js
var data = child.generateData(id);
expect(data.ori).to.exist;
done();
```

should scrape data based on not cached file -- one id.

```js
child.scrapeLostData(id)
	.then(function (res) {
		// debug(res);
		expect(res).to.exist;
		done();
	}, done);
```

should scrape data based on not cached file -- array of ids.

```js
child.scrapeAllLostData(losts)
	.then(function (res) {
		// debug(res);
		expect(res).to.exist;
		done();
	}, done);
```

<a name="base-mergecacheprices"></a>
## mergeCachePrices
should merge json data with cheapest.

```js
var mergedJson = child.mergeCachePrices(json);
expect(mergedJson).to.exist;
fs.writeFileSync('./bacp2.json', JSON.stringify(mergedJson,null, 4));
done();
```

<a name="base-preparerows"></a>
## prepareRows
should error on calling function that doesn't implemented.

```js
var base = new Base();
expect(base.prepareRows).to.throw(/prepareRows/);
done();
```

<a name="cache-prices-for-citilink"></a>
# Cache prices for Citilink
<a name="cache-prices-for-citilink-merge"></a>
## merge
should get all cheapest seat per row, get prices data from db or scrape if necessary and return it after merged.

```js
var json = JSON.parse(fs.readFileSync('./cicp.json', 'utf8'));
var citilink = new Citilink(mockBody, mockDataCitilink);
citilink.merge(json)
	.then(function (res) {
		// debug(res);
		fs.writeFileSync('./cicp2.json', JSON.stringify(res,null, 4));
		done();
	}, done);
```

<a name="cache-prices-for-garuda"></a>
# Cache prices for Garuda
<a name="cache-prices-for-garuda-merge"></a>
## merge
should get all cheapest seat per row, get prices data from db or scrape if necessary and return it after merged.

```js
var json = JSON.parse(fs.readFileSync('./gacp.json', 'utf8'));
var garuda = new Garuda(mockBody, mockDataGaruda);
garuda.merge(json)
	.then(function (res) {
		// debug(res);
		fs.writeFileSync('./gacp2.json', JSON.stringify(res,null, 4));
		done();
	}, done);
```

<a name="cache-prices-for-lion"></a>
# Cache prices for Lion
<a name="cache-prices-for-lion-merge"></a>
## merge
should get all cheapest seat per row, get prices data from db or scrape if necessary and return it after merged.

```js
var json = JSON.parse(fs.readFileSync('./licp.json', 'utf8'));
var lion = new Lion(mockBody, mockDataLion);
lion.merge(json)
	.then(function (res) {
		// debug(res);
		fs.writeFileSync('./licp2.json', JSON.stringify(res,null, 4));
		done();
	}, done);
```

<a name="price-generator"></a>
# Price Generator
#Lion. It should return scrape data with cache, get all lowest price, compare with db, and insert if necessary.

```js
var lion = new Lion(mockBody, mockDataLion);
lion.run()
	.then(function (res) {
		// console.log(lion.scrape);
		fs.writeFileSync('./li2.html', lion._scrape);
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

#Garuda. It should return scrape data with cache, get all lowest price, compare with db, and insert if necessary.

```js
var garuda = new Garuda(mockBody, mockDataGaruda);
garuda.run()
	.then(function (res) {
		// console.log('res',res);
		fs.writeFileSync('./li2.html', garuda._scrape);
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

<a name="cache-prices-for-sriwijaya"></a>
# Cache prices for Sriwijaya
<a name="cache-prices-for-sriwijaya-merge"></a>
## merge
should get all cheapest seat per row, get prices data from db or scrape if necessary and return it after merged.

```js
var json = JSON.parse(fs.readFileSync('./srcp.json', 'utf8'));
var sriwijaya = new Sriwijaya(mockBody, mockDataSriwijaya);
sriwijaya.merge(json)
	.then(function (res) {
		// debug(res);
		fs.writeFileSync('./srcp2.json', JSON.stringify(res,null, 4));
		done();
	}, done);
```

