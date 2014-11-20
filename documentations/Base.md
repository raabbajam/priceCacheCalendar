# Global





* * *

### init(airline, _db) 

Intiailizing

**Parameters**

**airline**: `String`, Airline's name

**_db**: `Object`, Database model



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



* * *










