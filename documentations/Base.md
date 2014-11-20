# Global





* * *

### init(airline, _db) 

Intiailizing

**Parameters**

**airline**: `String`, Airline's name

**_db**: `Object`, Database model



### setOptions() 

setting options, using one arguments: an object with key-value pair,
or two arguments, with the first as key and second as value



### setOption() 

alias for setOptions



### getAllRoutes() 

Loop the scrape data and get all routes

**Returns**: `Array`, Array of string paired routes of origin and destination


### getCache(ori, dst) 

Get all cache price data of specified origin and destination

**Parameters**

**ori**: `String`, Origin route

**dst**: `String`, Destination route

**Returns**: `Object`, Data cache price


### getAllCaches(routes) 

Get all cache from an array of routes

**Parameters**

**routes**: `Array`, Routes of origin and destination cities

**Returns**: `Object`, Data cache price


### insertAllLowest(res) 

Inserting data cache price from an array of results

**Parameters**

**res**: `Object`, Array of object containing data of lowest price available



### insertLowest(data) 

Inserting data cache price to db

**Parameters**

**data**: `Object`, Cache price data from scrape



### run() 

Getting all routes by looping scrape data, and getting all cache specified by all routes
merge data cache with scrape data, getting lowest price from disting routes, compare it with
saved data in db and replace it if necessary

**Returns**: `String`, Scrape data that already looped and merged with cache data, and checking for
cheapest available seat price in beetwen


### getCheapestInRow(row) 

return an array of object with ori, dst, class and flight property

**Parameters**

**row**: `Object`, Row object

**Returns**: `Array`, An array of object with ori, dst, class and flight property


### getAllCheapest(rows) 

return an array cheapest class

**Parameters**

**rows**: `Array`, Array of row

**Returns**: `Object`, return an array cheapest class, by rute by flight


### generateId(data) 

internal function used when saving data to db

**Parameters**

**data**: `Object`, Save to db

**Returns**: `string`, id for db


### getCachePrices() 

Get cache data from db

**Returns**: `Object`, Data price for current dt


### getAllCachePrices(data) 

getting all cache based on cheapest flight data

**Parameters**

**data**: `Object`, Cheapest flight data

**Returns**: `Object`, Promise with losts and founds


### generateData(id) 

Generate data to scrape from id

**Parameters**

**id**: `String`, String id from database

**Returns**: `Object`, Object data for scrape


### scrapeLostData(id) 

Scrape lost data

**Parameters**

**id**: `String`, Data generated id to scrape

**Returns**: `Object`, Return cache data after scrape it


### scrapeAllLostData(data) 

Scrape all losts data

**Parameters**

**data**: `Array`, Array of ids

**Returns**: `Object`, Return last data, after this finish all cache are scraped


### docsToCachePrices(docs) 

Saving cached docs from db to global object cachePrices

**Parameters**

**docs**: `Object`, Data from database

**Returns**: `Object`, Global object cachePrices



* * *










