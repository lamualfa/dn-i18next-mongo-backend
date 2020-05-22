import { MongoClient, ClientOptions, Collection } from './deps.ts';

import { sanitizeMongoDbFieldName } from './lib/sanitizer.ts'
import { getOneLevel, setOneLevel } from './lib/props.ts'

interface ErrorHandler {
  (err: any): void
}

interface BackendOptions {
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


interface Callback {
  (err?: any, data?: any): void
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

  // i18next required methods

  init(services: any, opts: BackendOptions) {
    this.services = services

    if (opts.langFieldName) this.langFieldName = opts.langFieldName
    if (opts.nsFieldName) this.nsFieldName = opts.nsFieldName
    if (opts.dataFieldName) this.dataFieldName = opts.dataFieldName

    if (opts.readOnError) this.readOnError = opts.readOnError
    if (opts.readMultiOnError) this.readMultiOnError = opts.readMultiOnError
    if (opts.createOnError) this.createOnError = opts.createOnError

    if (opts.collection) {
      this.collection = opts.collection
    } else {
      if (!opts.dbName) throw new TypeError("The `dbName` argument is needed if you don't pass the `collection` argument.");

      const host: string = opts.host || 'localhost'
      const port: number = opts.port || 27017
      const dbName: string = opts.dbName
      const colName: string = opts.colName || 'i18n'

      const mongodbOpts: ClientOptions = Object.assign({}, opts.mongodbOpts, {
        hosts: [`${host}:${port}`]
      })

      if (opts.user && opts.password) {
        mongodbOpts.username = opts.user
        mongodbOpts.password = opts.password
      }

      this.client = new MongoClient()

      this.client.connectWithOptions(mongodbOpts)
      const db = this.client.database(dbName)
      this.collection = db.collection(colName)
    }

    if (opts.sanitizeFieldName) {
      this.langFieldName = sanitizeMongoDbFieldName(
        this.langFieldName,
      );
      this.nsFieldName = sanitizeMongoDbFieldName(
        this.nsFieldName,
      );
      this.dataFieldName = sanitizeMongoDbFieldName(
        this.dataFieldName,
      );
    }
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

        for (let i = 0; i < docs.length; i += 1) {
          const doc = docs[i];
          const lang = doc[this.langFieldName];
          const ns = doc[this.nsFieldName];
          const data = doc[this.dataFieldName];

          if (!getOneLevel(parsed, lang)) setOneLevel(parsed, lang, {})
          setOneLevel(getOneLevel(parsed, lang), ns, data)
        }

        cb(null, parsed);
      }).catch(this.readMultiOnError)
  }

  create(langs: string | Array<string>, ns: string, key: string, fallbackVal: any, cb: Callback) {
    if (typeof langs === 'string') langs = [langs]

    const col = this.collection
    Promise.all(
      langs.map((lang: string) =>
        (async () => {
          // `mongo@v0.7.0` does not support update with upsert method
          const query = {
            [this.langFieldName]: lang,
            [this.nsFieldName]: ns,
          }

          const findOutput = await col.findOne(query)
          if (findOutput) {
            await col.updateOne({
              _id: findOutput._id
            }, {
              $set: {
                [`${this.dataFieldName}.${key}`]: fallbackVal,
              }
            })
          } else {
            await col.insertOne({
              ...query,
              [this.dataFieldName]: {
                [key]: fallbackVal
              }
            })
          }

        })()
      ),
    ).then(() => cb()).catch(this.createOnError)
  }
}