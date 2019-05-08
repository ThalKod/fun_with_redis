const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");

const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);

client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;


mongoose.Query.prototype.cache = function(options = {}) {
  this.useChache = true; // add usecache to true on current query
  this.hashKey = JSON.stringify(options.key || "default");

  return this;
};

mongoose.Query.prototype.exec = async function() {
  if(!this.useChache){ // if we don't wan to cache it...
   return exec.apply(this, arguments);
  }

  const key = JSON.stringify(Object.assign({}, this.getQuery(), {
    collection: this.mongooseCollection.name,
  }));

  const cahedValue = await client.hget(this.hashKey, key);

  if(cahedValue) {
    console.log("cached Value: ", cahedValue);
    const doc = JSON.parse(cahedValue);

    // if it's an simple documents or an array fo documents
    return Array.isArray(doc)
        ?  doc.map(d => new this.model(d))
        : new this.model(doc);

  }

  const result =  await exec.apply(this, arguments);

  client.hset(this.hashKey,key, JSON.stringify(result), "EX", 10);

  return result;
};


module.exports = {
  clearHash(hashKey){
    client.del(JSON.stringify(hashKey));
  },
};
