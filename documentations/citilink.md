# Global





* * *

### getCheapestInRow(row) 

return an array of object with ori, dst, class and flight property

**Parameters**

**row**: `Object`, Row object

**Returns**: `Array`, An array of object with ori, dst, class and flight property


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


### mergeCachePrices(json) 

Merge json data with cheapest data from db

**Parameters**

**json**: `Object`, JSON formatted of scraped data

**Returns**: `Object`, JSON formatted of scraped data already merged with cache data


### prepareRows(json) 

Preparing rows to be looped on process

**Parameters**

**json**: `Object`, JSON formatted data from scraping

**Returns**: `Object`, Array of rows to be looped for getAkkCheaoest function



* * *










