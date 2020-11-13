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
    .usage("--data=<string> --output-dir=output/ --client-id=<id> --client-secret=<secret> --access-token=<token>")
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
    .option('--client-id <id>', 'Reddit application client Id. See https://www.reddit.com/prefs/apps/')
    .option('--client-secret <secret>', 'Reddit application client secret. See https://www.reddit.com/prefs/apps/')
    .option('--access-token <token>', 'Access token generated using https://not-an-aardvark.github.io/reddit-oauth-helper/. This token type is only valid for a short time.')
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

const writeDataToFile = async ({ directory, filename, data, format }) => {
    const fileExtension = '.' + format
    const spinner = ora(`Writing data to ${chalk.magentaBright(`${directory + filename + fileExtension}`)}`).start();

    if (!data || !data.length) {
        spinner.fail('No data to write')
        return;
    }

    fs.mkdir(directory, { recursive: true }, (err) => {
        if (err) {
            spinner.fail()
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

const getSavedContent = async () => {
    const spinner = ora(`Fetching ${chalk.magentaBright('saved')} content`).start();
    const savedContent = await r.getMe().getSavedContent().fetchAll().catch(() => [])

    if (!savedContent || !savedContent.length) {
        spinner.fail(`Cannot fetch ${chalk.magentaBright('saved')} data. Try using a new access token.`)
        return;
    }

    spinner.succeed();

    return savedContent.map(item => {
        return {
            id: item.id,
            link: 'https://www.reddit.com' + item.permalink
        }
    })
}

const getUpvotedContent = async () => {
    const spinner = ora(`Fetching ${chalk.magentaBright('upvoted')} content`).start();
    const upvotedContent = await r.getMe().getUpvotedContent().fetchAll().catch(() => [])

    if (!upvotedContent || !upvotedContent.length) {
        spinner.fail(`Cannot fetch ${chalk.magentaBright('upvoted')} data. Try using a new access token.`)
        return;
    }

    spinner.succeed()

    return upvotedContent.map(item => {
        return {
            id: item.id,
            link: 'https://www.reddit.com' + item.permalink
        }
    })
}

const getSubmissionsContent = async () => {
    const spinner = ora(`Fetching ${chalk.magentaBright('submissions')} content`).start();
    const submissionsContent = await r.getMe().getSubmissions().fetchAll().catch(() => [])

    if (!submissionsContent || !submissionsContent.length) {
        spinner.fail(`Cannot fetch ${chalk.magentaBright('submissions')} data. Try using a new access token.`)
        return;
    }

    spinner.succeed();

    const result = []
    for (const submission of submissionsContent) {
        const comments = await submission.comments.fetchAll()
        let submissionsContentData = ''
        comments.forEach(comment => {
            submissionsContentData += ' > ' + comment.body.replace(/\n/g, '')
        })
        result.push({
            id: submission.id,
            title: submission.title,
            body: submission.selftext === '' ? submission.url : submission.selftext,
            comments: submissionsContentData
        })
    }

    return result;
}

const getCommentsContent = async () => {
    const spinner = ora(`Fetching ${chalk.magentaBright('comments')} content`).start();
    const commentsContent = await r.getMe().getComments().fetchAll().catch(() => [])

    if (!commentsContent || !commentsContent.length) {
        spinner.fail(`Cannot fetch ${chalk.magentaBright('comments')} data. Try using a new access token.`)
        return;
    }

    spinner.succeed();

    return commentsContent.map(item => {
        return {
            id: item.id,
            title: item.link_title,
            body: item.body.replace(/\n/gm, ''),
            link: 'https://www.reddit.com' + item.permalink
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
    return JSON.stringify(data)
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

        // if the user provides and incorrect format string e.g. --format=jsozzz
        // then the formatter will default to csv and reset the format string
        // for the data writer.
        format = 'csv'
    }

    // --data
    const dataToDownload = program.data.split(',');

    if (dataToDownload.includes('saved')) {
        // saved content
        getSavedContent().then(formatter).then(data => {
            const directory = rootOutputDirectory + '/saved/'
            const filename = 'reddit_saved_permalinks';
            writeDataToFile({ directory, filename, data, format });
        });
    }

    if (dataToDownload.includes('upvoted')) {
        // upvoted content
        getUpvotedContent().then(formatter).then(data => {
            const directory = rootOutputDirectory + '/upvoted/'
            const filename = 'reddit_upvoted_permalinks';
            writeDataToFile({ directory, filename, data, format });
        })
    }

    if (dataToDownload.includes('submissions')) {
        // submissions
        getSubmissionsContent().then(formatter).then(data => {
            const directory = rootOutputDirectory + '/submissions/'
            const filename = 'reddit_submissions';
            writeDataToFile({ directory, filename, data, format });
        })
    }

    if (dataToDownload.includes('comments')) {
        // comments
        getCommentsContent().then(formatter).then(data => {
            const directory = rootOutputDirectory + '/comments/'
            const filename = 'reddit_comments';
            writeDataToFile({ directory, filename, data, format });
        })
    }
}

main();