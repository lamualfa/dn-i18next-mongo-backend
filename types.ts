import { ClientOptions, Collection } from './deps.ts'


export interface EventErrorHandler {
  /**@param {any} err The error during event execution*/
  (err: any): void
}

// Private interface
export interface EventCallback {
  /**
   * @param {any} err The error during event execution
   * @param {any} data Data returned after the event is successfully executed
  */
  (err?: any, data?: any): void
}

export interface BackendOptions {
  /** 
   * Field name for language attribute.
   * - Default: `"lang"`
  */
  langFieldName?: string,
  /** 
   * Field name for namespace attribute.
   * - Default: `"ns"`
   */
  nsFieldName?: string,
  /** 
   * Field name for data attribute.
   * - Default: `"data"`
  */
  dataFieldName?: string,
  /**
   * If true, will remove MongoDB special character (contains ".", or starts with "$"). See: https://jira.mongodb.org/browse/SERVER-3229
   * - Default: `true`
   */
  sanitizeFieldName?: boolean,
  /**Database name for storing i18next data. Required if you do not pass the `collection` option*/
  dbName?: string,
  /**
   * Collection name for storing i18next data
   * - Default: `"i18n"`
   */
  colName?: string,
  /**
   * MongoDB host
   * - Default: `"127.0.0.1"`
   */
  host?: string,
  /**
   * MongoDB port
   * - Default: `27017`
   */
  port?: number,
  /**MongoDB username (if exist)*/
  user?: string,
  /**MongoDB password (if exist)*/
  password?: string,
  /**Use your custom collection. If you already have a special connection, use an existing connection instead of making a new connection.*/
  collection?: Collection,
  /**
   * MongoDB connection options.
   * - See: https://doc.deno.land/https/deno.land/x/mongo/mod.ts#ClientOptions*
   */
  mongodbOpts?: ClientOptions,
  /**
   * Error handler for `read` event.
   * - See: https://www.i18next.com/misc/creating-own-plugins#backend
   * - Default: `console.error`
   */
  readOnError?: EventErrorHandler,
  /**
  * Error handler for `readMulti` event.
  * - See: https://www.i18next.com/misc/creating-own-plugins#backend
  * - Default: `console.error`
  */
  readMultiOnError?: EventErrorHandler,
  /**
  * Error handler for `create` event.
  * - See: https://www.i18next.com/misc/creating-own-plugins#backend
  * - Default: `console.error`
  */
  createOnError?: EventErrorHandler
}