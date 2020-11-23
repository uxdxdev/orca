#!/usr/bin/env node

const snoowrap = require('snoowrap');
const fs = require("fs");
const { program } = require('commander');
const chalk = require('chalk');
const boxen = require('boxen');
const ora = require('ora');

const clientId = 'FlF8aE_FAKE_gpYa_LNw'
const clientSecret = 'z1KNAUb_c0MF7_FAKE_hGyR8lfHCQjnzJtGw'
const accessToken = '70162531-eWBggyup_FAKE_Usdf1cz7u-G9pM_dhrVf3g'
const heading = boxen(`${chalk.magentaBright('Orca')} - ${chalk.bold('Download your Reddit data.')}`, { padding: 1, margin: 1, borderStyle: 'round' })

program
    .name("orca")
    .usage("--access-token=<token>")
    .helpOption('-h, --help', 'Display setup steps and options')
    .description(`${heading}
Setup steps:
- Open https://www.reddit.com/prefs/apps/
- Click ${chalk.bold('Create app')} button
- Pick a name, e.g. ${chalk.bold('Orca web app')}
- Select ${chalk.bold('web app')} as the application type
- Set ${chalk.bold('redirect url')} to https://not-an-aardvark.github.io/reddit-oauth-helper/
- Click ${chalk.bold('Create app')} button
- Copy your ${chalk.magenta('client id')}, e.g.

    Orca
    web app
    ${chalk.magenta(clientId)} (client id)
    
- Copy your ${chalk.cyan('client secret')}, e.g.

    secret ${chalk.cyan(clientSecret)}

- Open https://not-an-aardvark.github.io/reddit-oauth-helper/
- Input your ${chalk.bold('client id')} and ${chalk.bold('client secret')} at the top of the page
- Select scopes
    - history
    - identity
    - read
- Click ${chalk.bold('Generate tokens')} button and then click ${chalk.bold('Allow')}
- Copy your ${chalk.blue('access token')} from the bottom of the page, e.g.

    Access token: ${chalk.blue(accessToken)}

- Run Orca

npx @mortond/orca --access-token=${chalk.blue(accessToken)}
`)
    .option('--data <string>', 'Data to download in a comma separated string e.g. upvoted,saved', 'upvoted,saved,submissions,comments')
    .option('--output-dir <directory>', 'Output directory for data files', 'orca-output')
    .option('--format <string>', 'Format of the downloaded data e.g. csv, text, json', 'csv')
    .option('--only-latest', 'Only download the latest data. See orca.config.json')
    .option('--config <string>', 'Path to Orca configuration file', './orca.config.json')
    .option('--client-id <id>', 'Reddit application client Id. See https://www.reddit.com/prefs/apps/')
    .option('--client-secret <secret>', 'Reddit application client secret. See https://www.reddit.com/prefs/apps/')
    .option('--access-token <token>', 'Access token generated using https://not-an-aardvark.github.io/reddit-oauth-helper/. This token type is only valid for a short time')
    .option('--refresh-token <token>', 'Refresh token generated using https://not-an-aardvark.github.io/reddit-oauth-helper/. Use this for longer running jobs e.g. cron')

program.parse(process.argv);

const r = new snoowrap({
    userAgent: 'Orca app',
    clientId: program.clientId,
    clientSecret: program.clientSecret,
    accessToken: program.accessToken,
    refreshToken: program.refreshToken
});

// queue requests if rate limit is hit
r.config({ continueAfterRatelimitError: true });

const writeDataToFile = async ({ rootOutputDirectory, dataType, filename, data, format }) => {
    const fileExtension = '.' + format
    const directory = rootOutputDirectory + '/' + dataType + '/'
    const spinner = ora(`Writing data to ${chalk.magentaBright(`${directory + filename + fileExtension}`)}`).start();

    if (!data) {
        spinner.fail(`Cannot write invalid ${chalk.magentaBright(`${directory + filename + fileExtension}`)} data`)
        return;
    }

    fs.mkdir(directory, { recursive: true }, (err) => {
        if (err) {
            spinner.fail(`Writing data to ${chalk.magentaBright(`${directory + filename + fileExtension}`)}`)
            throw err;
        }

        fs.writeFile(directory + filename + fileExtension, data, err => {
            if (err) {
                spinner.fail()
                throw err;
            }
            spinner.succeed()
        });
    });
}

const getOptions = ({ dataType, dataIdPrefix, config, onlyLatest }) => {
    let options = {}
    let data = config.data;

    // get the latest entry for this data type
    if (onlyLatest) {
        const latestEntry = data[dataType].latest
        if (latestEntry) {
            options.before = `${dataIdPrefix}${latestEntry}`
        }
    }
    return options
}

const getSpinner = (dataType) => {
    const spinner = ora(`Fetching ${chalk.magentaBright(dataType)} content`)
    return {
        start: () => spinner.start(),
        fail: (error) => spinner.fail(`Failed to fetch ${chalk.magentaBright(dataType)} content. ${error}`),
        succeed: () => spinner.succeed()
    }

}
const getSavedContent = async ({ config, onlyLatest }) => {
    const dataType = 'saved'

    const options = getOptions({ dataType, dataIdPrefix: 't3_', config, onlyLatest })

    const spinner = getSpinner(dataType)
    spinner.start();

    let data = await r.getMe().getSavedContent(options)
        .then(async listing => {
            if (!onlyLatest) return await listing.fetchAll()
            return listing
        })
        .catch(error => error.statusCode)


    if (!Array.isArray(data)) return spinner.fail(data)

    spinner.succeed();

    return data.map(item => {
        return {
            id: item.id,
            type: dataType,
            link: 'https://www.reddit.com' + item.permalink,
        }
    })
}

const getUpvotedContent = async ({ config, onlyLatest }) => {
    const dataType = 'upvoted'

    const options = getOptions({ dataType, dataIdPrefix: 't3_', config, onlyLatest })

    const spinner = getSpinner(dataType)
    spinner.start();

    let data = await r.getMe().getUpvotedContent(options)
        .then(async listing => {
            if (!onlyLatest) return await listing.fetchAll()
            return listing
        })
        .catch(error => error.statusCode)

    if (!Array.isArray(data)) return spinner.fail(data)

    spinner.succeed()

    return data.map(item => {
        return {
            id: item.id,
            type: dataType,
            link: 'https://www.reddit.com' + item.permalink,
        }
    })
}

const getSubmissionsContent = async ({ config, onlyLatest }) => {
    const dataType = 'submissions'

    const options = getOptions({ dataType, dataIdPrefix: 't3_', config, onlyLatest })

    const spinner = getSpinner(dataType)
    spinner.start();

    let data = await r.getMe().getSubmissions(options)
        .then(async listing => {
            if (!onlyLatest) return await listing.fetchAll()
            return listing
        })
        .catch(error => error.statusCode)


    if (!Array.isArray(data)) return spinner.fail(data)

    spinner.succeed();

    const result = []
    for (const submission of data) {
        let submissionsContentData = ''
        if (submission.comments) {
            const comments = await submission.comments.fetchAll().catch(() => console.log(`Error fetching all ${dataType} comments`))
            comments.forEach(comment => {
                submissionsContentData += ' > ' + comment.body.replace(/\n/g, '')
            })
        }
        result.push({
            id: submission.id,
            type: dataType,
            title: submission.title,
            body: submission.selftext === '' ? submission.url : submission.selftext,
            comments: submissionsContentData,
        })
    }

    return result;
}

const getCommentsContent = async ({ config, onlyLatest }) => {
    const dataType = 'comments'

    const options = getOptions({ dataType, dataIdPrefix: 't1_', config, onlyLatest })

    const spinner = getSpinner(dataType)
    spinner.start();

    let data = await r.getMe().getComments(options)
        .then(async listing => {
            if (!onlyLatest) return await listing.fetchAll()
            return listing
        })
        .catch(error => error.statusCode)

    if (!Array.isArray(data)) return spinner.fail(data)

    spinner.succeed();

    return data.map(item => {
        return {
            id: item.id,
            type: dataType,
            title: item.link_title,
            body: item.body.replace(/\n/gm, ''),
            link: 'https://www.reddit.com' + item.permalink,
        }
    })
}

const formatCsv = (data) => {
    if (!data || !data.length) return []

    const array = [Object.keys(data[0])].concat(data)
    return array.map(item => {
        return Object.values(item).map(entry => entry.replace(/\n|\r|,/gm, ' ')).toString()
    }).join('\n')
}

const formatTxt = (data) => {
    if (!data || !data.length) return []

    let result = ''
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            result += `${key}: ${item[key].replace(/\n|\r/gm, ' ')}\n`
        })

        result += `---` + `\n`
    })
    return result
}

const formatJson = (data) => {
    if (!data || !data.length) return []

    return JSON.stringify(data)
}

const loadConfigFile = ({ configFilePath }) => {

    // if the config file does not exist create it
    if (!fs.existsSync(configFilePath)) {
        const config = {
            data: {
                saved: {
                    latest: ''
                },
                submissions: {
                    latest: ''
                },
                comments: {
                    latest: ''
                },
                upvoted: {
                    latest: ''
                }
            }
        }
        saveConfigFile({ configFilePath, config })
    }

    const config = fs.readFileSync(configFilePath, { encoding: 'utf-8' }, (err, data) => {
        if (err) {
            console.log('reading config file error')
        } else {
            return data;
        }
    })
    return JSON.parse(config)
}

const saveConfigFile = ({ configFilePath, config }) => {
    fs.writeFileSync(configFilePath, JSON.stringify(config))
}

const saveLatestEntry = data => {
    if (!data || !data.length) return []

    // --config
    const configFilePath = program.config;
    const config = loadConfigFile({ configFilePath });

    const latestId = data[0].id
    const dataType = data[0].type

    // save the latest entry of the downloaded data
    config.data[dataType].latest = latestId

    saveConfigFile({ configFilePath, config })

    return data;
}

const main = () => {

    console.log(heading)

    // --output-dir
    let rootOutputDirectory = program.outputDir;

    // --format
    let formatter;
    let format = program.format.split(',')[0].replace(/'.'/g, '');
    if (format === 'txt') {
        formatter = formatTxt
    } else if (format === 'json') {
        formatter = formatJson
    } else {
        formatter = formatCsv

        // if the user provides an incorrect format string e.g. --format=jsozzz
        // then the formatter will default to csv and reset the format string
        // for the data writer.
        format = 'csv'
    }

    // --data
    const dataToDownload = program.data.split(',');

    // --config
    const configFilePath = program.config
    const config = loadConfigFile({ configFilePath })

    // --onlyLatest
    let onlyLatest = program.onlyLatest

    const promises = []
    const dataTypeDownloaderMap = {
        saved: getSavedContent,
        upvoted: getUpvotedContent,
        submissions: getSubmissionsContent,
        comments: getCommentsContent
    }
    dataToDownload.forEach(dataType => {
        const downloader = dataTypeDownloaderMap[dataType]
        const promise = downloader({ config, onlyLatest })
            .then(saveLatestEntry)
            .then(formatter)
            .then(data => {
                const filename = `reddit_${dataType}`;
                return writeDataToFile({ rootOutputDirectory, dataType, filename, data, format });
            }).catch(error => console.log(error))
        promises.push(promise)
    })

    Promise.all(promises)
}

main();