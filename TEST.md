# TOC
   - [Base](#base)
     - [getCheapestInRow, getAllCheapest](#base-getcheapestinrow-getallcheapest)
     - [getCachePrices, getAllCachePrices](#base-getcacheprices-getallcacheprices)
     - [generateData](#base-generatedata)
   - [Price Generator for Garuda](#price-generator-for-garuda)
   - [Price Generator for Lion](#price-generator-for-lion)
   - [Price Generator](#price-generator)
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
// console.log(flightClasses);
expect(Object.keys(flightClasses).length).to.gt(0);
next();
```

<a name="base-getcacheprices-getallcacheprices"></a>
## getCachePrices, getAllCachePrices
should get all cache based on cheapest flight data -- found.

```js
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
```

should get all cache based on cheapest flight data -- lost.

```js
base.getAllCachePrices(dataLost)
	.then(function (res) {
		expect(res).to.exist;
		next();
	}, function (err) {
		console.log(err.losts);
		expect(err.losts).to.exists;
		next();
	});
```

<a name="base-generatedata"></a>
## generateData
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
		console.log(res);
		expect(res).to.exist;
	}, done);
```

should scrape data based on not cached file -- array of ids.

```js
child.scrapeAllLostData(losts)
	.then(function (res) {
		console.log(res);
		expect(res).to.exist;
	}, done);
```

<a name="price-generator-for-garuda"></a>
# Price Generator for Garuda
should extend base.

```js
var garuda = new Garuda(mockBody, mockDataGaruda);
expect(garuda.name).to.equal('garuda');
next();
```

should return cache.

```js
var garuda = new Garuda(mockBody, mockDataGaruda);
garuda.getCache()
	.then(function () {
		expect(garuda.cache[mockBody.ori.toLowerCase()+mockBody.dst.toLowerCase()]).to.exist;
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

should loop get all routes.

```js
var garuda = new Garuda(mockBody, mockDataGaruda);
var routes = garuda.getAllRoutes();
// console.log(routes);
expect(routes.length).gt(0);
next();
```

should get all routes cache.

```js
var garuda = new Garuda(mockBody, mockDataGaruda);
var routes = garuda.getAllRoutes();
garuda.getAllCaches(routes)
	.then(function () {
		// console.log(garuda.cache);
		expect(garuda.cache).not.eq({});
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

should merge all cache.

```js
var garuda = new Garuda(mockBody, mockDataGaruda);
var routes = garuda.getAllRoutes();
garuda.getAllCaches(routes)
	.then(garuda.mergeCache.bind(garuda))
	.then(function (res) {
		// console.log(JSON.stringify(garuda._scrape, null, 2));
		console.log(JSON.stringify(res, null, 2));
		console.log(garuda.cache);
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

should compare with db and insert to db if cheaper, for all lowest price.

```js
var garuda = new Garuda(mockBody, mockDataGaruda);
var routes = garuda.getAllRoutes();
garuda.getAllCaches(routes)
	.then(garuda.mergeCache.bind(garuda))
	.then(garuda.insertAllLowest.bind(garuda))
	.then(function (res) {
		// console.log(res);
		fs.writeFileSync('./ga2.html', JSON.stringify(res, null, 2));
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

<a name="price-generator-for-lion"></a>
# Price Generator for Lion
should extend base.

```js
var lion = new Lion(mockBody, mockDataLion);
expect(lion.name).to.equal('lion');
next();
```

should return cache.

```js
var lion = new Lion(mockBody, mockDataLion);
lion.getCache()
	.then(function () {
		expect(lion.cache[mockBody.ori.toLowerCase()+mockBody.dst.toLowerCase()]).to.exist;
		console.log(lion.cache);
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

should loop get all routes.

```js
var lion = new Lion(mockBody, mockDataLion);
var routes = lion.getAllRoutes();
console.log(routes);
expect(routes.length).gt(0);
next();
```

should get all routes cache.

```js
var lion = new Lion(mockBody, mockDataLion);
var routes = lion.getAllRoutes();
lion.getAllCaches(routes)
	.then(function () {
		console.log(lion.cache);
		expect(lion.cache).not.eq({});
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

should merge all cache.

```js
var lion = new Lion(mockBody, mockDataLion);
var routes = lion.getAllRoutes();
lion.getAllCaches(routes)
	.then(lion.mergeCache.bind(lion))
	.then(function (res) {
		// console.log(JSON.stringify(lion._scrape, null, 2));
		console.log(JSON.stringify(res, null, 2));
		console.log(lion.cache);
		next();
	})
	.catch(function (err) {
		next(err);
	});
```

should compare with db and insert to db if cheaper, for all lowest price.

```js
var lion = new Lion(mockBody, mockDataLion);
var routes = lion.getAllRoutes();
lion.getAllCaches(routes)
	.then(lion.mergeCache.bind(lion))
	.then(lion.insertAllLowest.bind(lion))
	.then(function (res) {
		fs.writeFileSync('./li2.html', lion._scrape);
		next();
	})
	.catch(function (err) {
		next(err);
	});
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

