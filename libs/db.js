var ElasticSearchClient = require('elasticsearchclient');
var config = {
    host: 'folbek.me',
    port: 9200
};
if (process.env.CONFIG === 'local')
    config.host = 'localhost';
if (!!process.env.SCRAPE_HOST)
    config.host = process.env.SCRAPE_HOST;
var db = new ElasticSearchClient(config);
// console.log('process.env.CONFIG %s', process.env.CONFIG);
module.exports = db;
