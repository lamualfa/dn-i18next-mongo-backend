import { MongoClient, Collection, assertEquals } from './deps.ts'
import { Backend } from './mod.ts'
import { getOneLevel, setOneLevel } from './lib/props.ts'

// Global variable

const DB_HOST = '127.0.0.1'
const DB_PORT = 27017
const DB_NAME = 'test-i18n'
const DB_COL = 'i18n-data'

const LANG_FIELD_NAME = 'lng'
const NS_FIELD_NAME = 'ns'
const DATA_FIELD_NAME = 'data'
const BACKEND_BASE_OPTS = {
  langFieldName: LANG_FIELD_NAME,
  nsFieldName: NS_FIELD_NAME,
  dataFieldName: DATA_FIELD_NAME,
}
const BACKEND_STANDARD_OPTS = {
  hosts: [`${DB_HOST}:${DB_PORT}`],
  dbName: DB_NAME,
  colName: DB_COL,
  ...BACKEND_BASE_OPTS
}

const TEST_DATA = [
  {
    [LANG_FIELD_NAME]: 'id',
    [NS_FIELD_NAME]: 'translation',
    [DATA_FIELD_NAME]: {
      title: 'Halo Indonesia'
    }
  },
  {
    [LANG_FIELD_NAME]: 'en',
    [NS_FIELD_NAME]: 'translation',
    [DATA_FIELD_NAME]: {
      title: 'Halo Indonesia'
    }
  },
]

// Helper function

async function prepareDatabase() {
  const client = new MongoClient()
  client.connectWithOptions({
    hosts: [`${DB_HOST}:${DB_PORT}`]
  })

  const collection = client.database(DB_NAME).collection(DB_COL)
  await collection.insertMany(TEST_DATA)
  return collection
}

async function cleanDatabase(collection: Collection) {
  // `mongo@v0.7.0` doesn't support `db.dropDatabase` functions. temporarily replaced by erasing all data in collection.
  await collection.deleteMany({})
}

async function read(backend: Backend) {
  for (let i = 0; i < TEST_DATA.length; i += 1) {
    const doc = TEST_DATA[i]
    const expectedData = doc[DATA_FIELD_NAME]
    const targetData = await new Promise((resolve, reject) => backend.read(doc[LANG_FIELD_NAME], doc[NS_FIELD_NAME], (err, data) => err ? reject(err) : resolve(data)))
    assertEquals(expectedData, targetData, 'Does not return correct translation data.')
  }
}

async function readMultiTest(backend: Backend) {
  const expected = {}
  for (let i = 0; i < TEST_DATA.length; i += 1) {
    const data = TEST_DATA[i]
    const lang = data[LANG_FIELD_NAME];
    const ns = data[NS_FIELD_NAME];

    if (getOneLevel(expected, lang))
      setOneLevel(getOneLevel(expected, lang), ns, data[DATA_FIELD_NAME])
    else
      setOneLevel(expected, lang, {
        [ns]: data[DATA_FIELD_NAME],
      })
  }

  const target = await new Promise((resolve, reject) => backend.readMulti(TEST_DATA.map(doc => doc[LANG_FIELD_NAME]), TEST_DATA.map(doc => doc[NS_FIELD_NAME]), (err, data) => err ? reject(err) : resolve(data)))

  assertEquals(expected, target, 'Does not return correct translation data.')
}

async function createTest(backend: Backend, collection: Collection) {
  const expected = {
    [LANG_FIELD_NAME]: 'de',
    [NS_FIELD_NAME]: 'translation',
    [DATA_FIELD_NAME]: {
      title: 'Hallo Indonesien'
    }
  }

  await new Promise((resolve, reject) => backend.create(expected[LANG_FIELD_NAME], expected[NS_FIELD_NAME], 'title', expected[DATA_FIELD_NAME].title, (err, data) => err ? reject(err) : resolve(data)))


  const findOutput = await collection.findOne({
    [LANG_FIELD_NAME]: expected[LANG_FIELD_NAME],
    [NS_FIELD_NAME]: expected[NS_FIELD_NAME]
  })
  const target = {
    [LANG_FIELD_NAME]: findOutput[LANG_FIELD_NAME],
    [NS_FIELD_NAME]: findOutput[NS_FIELD_NAME],
    [DATA_FIELD_NAME]: findOutput[DATA_FIELD_NAME]
  }

  assertEquals(expected, target, 'Does not write correct translation data.')
}

function wrapTest(testFunction: (collection: Collection) => Promise<void>) {
  return async function () {
    const collection = await prepareDatabase()
    try {
      await testFunction(collection)
    } catch (error) {
      await cleanDatabase(collection)
    }
  }
}

// Test

Deno.test('Read', wrapTest(async function () {
  await read(new Backend(null, BACKEND_STANDARD_OPTS))
}))


Deno.test('Read Multi', wrapTest(async function () {
  await readMultiTest(new Backend(null, BACKEND_STANDARD_OPTS))
}))

Deno.test('Create', wrapTest(async function (collection) {
  await createTest(new Backend(null, BACKEND_STANDARD_OPTS), collection)
}))



Deno.test('Read with custom collection', wrapTest(async function (collection) {
  const backend: Backend = new Backend(null, {
    ...BACKEND_BASE_OPTS,
    collection
  })

  await read(backend)
}))


Deno.test('Read Multi with custom collection', wrapTest(async function (collection) {
  const backend: Backend = new Backend(null, {
    ...BACKEND_BASE_OPTS,
    collection
  })

  await readMultiTest(backend)
}))

Deno.test('Create with custom collection', wrapTest(async function (collection) {
  const backend: Backend = new Backend(null, {
    ...BACKEND_BASE_OPTS,
    collection
  })

  await createTest(backend, collection)
}))