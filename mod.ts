import { MongoClient, ClientOptions, Collection } from './deps.ts';

import { sanitizeMongoDbFieldName as sanitizeFieldName } from './lib/sanitizer.ts'
import { getOneLevel, setOneLevel } from './lib/props.ts'

export interface ErrorHandler {
  (err: any): void
}

export interface BackendOptions {
  langFieldName?: string,
  nsFieldName?: string,
  dataFieldName?: string,
  sanitizeFieldName?: boolean,
  dbName?: string,
  colName?: string,
  host?: string,
  port?: number,
  user?: string,
  password?: string,
  collection?: Collection,
  mongodbOpts?: ClientOptions,
  readOnError?: ErrorHandler,
  readMultiOnError?: ErrorHandler,
  createOnError?: ErrorHandler
}


export interface Callback {
  (err?: any, data?: any): void
}

function sanitizeMongodbOpts(opts: BackendOptions) {
  const mongodbOpts: ClientOptions = Object.assign({}, opts.mongodbOpts, {
    hosts: [`${opts.host || 'localhost'}:${opts.port || 27017}`]
  })
  if (opts.user && opts.password) {
    mongodbOpts.username = opts.user
    mongodbOpts.password = opts.password
  }

  return mongodbOpts
}

// https://www.i18next.com/misc/creating-own-plugins#backend
export class Backend {
  langFieldName: string = 'lang'
  nsFieldName: string = 'ns'
  dataFieldName: string = 'data'

  sanitizeFieldName?: boolean = true

  services: any
  client?: MongoClient
  mongodbOpts?: ClientOptions

  readOnError: ErrorHandler = console.error
  readMultiOnError: ErrorHandler = console.error
  createOnError: ErrorHandler = console.error

  collection!: Collection

  // https://www.i18next.com/misc/creating-own-plugins#make-sure-to-set-the-plugin-type
  static type: string = 'Backend'

  constructor(services: any, opts: BackendOptions) {
    this.init(services, opts);
  }

  sanitizeOpts(opts: BackendOptions) {
    this.langFieldName = opts.langFieldName || 'lang'
    this.nsFieldName = opts.nsFieldName || 'ns'
    this.dataFieldName = opts.dataFieldName || 'data'
    this.readOnError = opts.readOnError || console.error
    this.readMultiOnError = opts.readMultiOnError || console.error
    this.createOnError = opts.createOnError || console.error

    if (opts.sanitizeFieldName) {
      this.langFieldName = sanitizeFieldName(
        this.langFieldName,
      );
      this.nsFieldName = sanitizeFieldName(
        this.nsFieldName,
      );
      this.dataFieldName = sanitizeFieldName(
        this.dataFieldName,
      );
    }
  }

  // i18next required methods

  init(services: any, opts: BackendOptions) {
    this.services = services
    this.sanitizeOpts(opts)

    if (opts.collection) {
      this.collection = opts.collection
      return
    }

    if (!opts.dbName) throw new TypeError("The `dbName` argument is needed if you don't pass the `collection` argument.");

    this.client = new MongoClient()
    this.client.connectWithOptions(sanitizeMongodbOpts(opts))
    this.collection = this.client.database(opts.dbName).collection(opts.colName || 'i18n')
  }

  read(lang: string, ns: string, cb?: Callback) {
    if (!cb) return;

    const query = {}
    setOneLevel(query, this.langFieldName, lang)
    setOneLevel(query, this.nsFieldName, ns)

    this.collection.findOne(
      query
    ).then((docs: object) => {
      cb(null, (docs && getOneLevel(docs, this.dataFieldName)) || {});
    }).catch(this.readOnError)
  }

  readMulti(langs: Array<string>, nss: Array<string>, cb?: Callback) {
    if (!cb) return;

    this.collection
      .find({
        [this.langFieldName]: { $in: langs },
        [this.nsFieldName]: { $in: nss },
      }).then(docs => {
        const parsed = {};
        docs.forEach((doc: any) => {
          const lang = doc[this.langFieldName];
          if (!getOneLevel(parsed, lang)) setOneLevel(parsed, lang, {})
          setOneLevel(getOneLevel(parsed, lang), doc[this.nsFieldName], doc[this.dataFieldName])
        })

        cb(null, parsed);
      }).catch(this.readMultiOnError)
  }

  create(langs: string | Array<string>, ns: string, key: string, fallbackVal: any, cb: Callback) {
    if (typeof langs === 'string') langs = [langs]
    Promise.all(
      langs.map((lang: string) => {
        // `mongo@v0.7.0` does not support update with upsert method
        const query = {
          [this.langFieldName]: lang,
          [this.nsFieldName]: ns,
        }

        return this.collection.findOne(query).then(findOutput => {
          if (findOutput)
            return findOutput ? this.collection.updateOne({
              _id: findOutput._id
            }, {
              $set: {
                [`${this.dataFieldName}.${key}`]: fallbackVal,
              }
            }) : this.collection.insertOne({
              ...query,
              [this.dataFieldName]: {
                [key]: fallbackVal
              }
            })
        })
      }
      ),
    ).then(() => cb()).catch(this.createOnError)
  }
}