const Ix = require('ix')
const Axios = require('axios')
const PapaParse = require('papaparse')
const FSExtra = require('fs-extra')

const lists = [
    { type: 'person', year: 0, uri: 'rtb' }  // real-time world billionaires
]

async function request(location) {
    const url = typeof location === 'object' ? location.url : location
    const timeout = 30 * 1000
    const instance = Axios.create({ timeout })
    const response = await instance(location)
    return {
        url,
        data: response.data,
        passthrough: location.passthrough
    }
}

function locate(item) {
    return {
        url: 'http://www.forbes.com/ajax/list/data',
        params: item,
        passthrough: item
    }
}

function parse(response) {
    return response.data.slice(0, 5).map(item => {
        return {
            name: item.name,
            rank: item.rank,
            worth: item.worth
        }
    })
}

function csv() {
    let headerWritten = false
    return function* (record) {
        if (!headerWritten) {
            const header = PapaParse.unparse([Object.keys(record)])
            yield header + '\n'
            headerWritten = true
        }
        const entry = PapaParse.unparse([Object.values(record)])
        yield entry + '\n'
    }
}

async function write(filename) {
    await FSExtra.remove(filename)
    return contents => FSExtra.appendFile(filename, contents)
}

async function run() {
    await Ix.AsyncIterable.from(lists)
        .forEach(async item => {
            Ix.AsyncIterable.from([item])
                .map(locate)
                .map(request)
                .flatMap(parse)
                .flatMap(csv())
                .forEach(await write(`forbes-${item.uri}.csv`))
        })
        .finally(() => console.log('Done!'))
}

run()