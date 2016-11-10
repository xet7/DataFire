let datafire = require('../index');
let mongodb = require('mongodb');

let QUERY_PARAM = {
  name: 'query',
  description: 'A MongoDB query',
  type: 'object',
}
let PROJECTION_PARAM = {
  name: 'projection',
  description: 'A MongoDB projection',
  type: 'object',
}

let SPEC = {
  info: {
    title: "MongoDB",
    description: "Access to MongoDB"
  },
  securityDefinitions: {
    mongo_url: {
      type: "string",
      name: "url"
    }
  },
  operations: {
    insert: {
      description: "Insert a document",
      parameters: [{
        name: 'document',
        type: 'object',
        description: 'The document to insert',
      }],
      response: {
        schema: {
          properties: {
            ok: {type: 'integer'},
            n: {type: 'integer'},
          }
        }
      }
    },
    find: {
      description: "Retrieve an array of documents",
      parameters: [
        QUERY_PARAM,
        PROJECTION_PARAM,
      ],
      response: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
          }
        }
      }
    },
    findOne: {
      description: "Retrieve a single document",
      parameters: [
        QUERY_PARAM,
        PROJECTION_PARAM,
      ],
      response: {
        schema: {
          type: 'object'
        }
      }
    }
  }
}

class MongoDBOperation extends datafire.Operation {
  constructor(name, collection, integration, run) {
    super(name, integration);
    this.runQuery = run;
    this.collection = collection;
  }

  call(args, callback) {
    if (!this.integration.account) throw new Error("Must supply an account for MongoDB");
    let collection = this.integration.database.collection(this.collection);
    this.runQuery(collection, args, callback);
  }
}

class MongoDBIntegration extends datafire.Integration {
  constructor(mockClient) {
    super('mongodb', SPEC);
    this.client = mockClient || mongodb.MongoClient;
  }

  // Override
  initialize(cb) {
    if (!this.account) return cb();
    this.client.connect(this.account.url, (err, db) => {
      if (err) return cb(err);
      this.database = db;
      cb();
    })
  }

  // Override
  destroy(cb) {
    if (this.database) this.database.close();
    cb();
  }

  find(collection) {
    return new MongoDBOperation('find', collection, this, (collection, args, cb) => {
      collection.find(args.query, args.projection, (err, docs) => {
        if (err) return cb(err);
        docs.toArray(cb);
      });
    });
  }

  findOne(collection) {
    return new MongoDBOperation('findOne', collection, this, (collection, args, cb) => {
      collection.findOne(args.query || {}, args.projection || {}, cb);
    });
  }

  insert(collection) {
    return new MongoDBOperation('insert', collection, this, (collection, args, cb) => {
      collection.insert(args.document || args.documents, (err, result) => {
        if (err) return cb(err);
        cb(null, result.result);
      });
    });
  }
}

module.exports = MongoDBIntegration;