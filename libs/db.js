var ElasticSearchClient = require('elasticsearchclient');
var db = new ElasticSearchClient({
    host: 'folbek.me',
    port: 9200
});
module.exports = db;