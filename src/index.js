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
- Click ${chalk.bold('Create another app')} button
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
- Click ${chalk.bold('Generate tokens')} button
- Copy your ${chalk.blue('access token')} from the bottom of the page, e.g.

    Access token: ${chalk.blue(accessToken)}

- Run Orca

npx @mortond/orca --data=${chalk.bold('upvoted,saved,submissions,comments')} \\
--output-dir=${chalk.bold('output/')} \\
--client-id=${chalk.magenta(clientId)} \\
--client-secret=${chalk.cyan(clientSecret)} \\
--access-token=${chalk.blue(accessToken)}
`)
    .option('--data <string>', 'Data to download, e.g. upvoted,saved,submissions,comments', 'upvoted,saved,submissions,comments')
    .option('--output-dir <directory>', 'Output directory for data files (.txt)', 'orca-output')
    .requiredOption('--client-id <id>', 'Reddit application client Id. See https://www.reddit.com/prefs/apps/')
    .requiredOption('--client-secret <secret>', 'Reddit application client secret. See https://www.reddit.com/prefs/apps/')
    .requiredOption('--access-token <token>', 'Access token generated using https://not-an-aardvark.github.io/reddit-oauth-helper/')

program.parse(process.argv);

const r = new snoowrap({
    userAgent: 'Orca app',
    clientId: program.clientId,
    clientSecret: program.clientSecret,
    accessToken: program.accessToken
});

// queue requests if rate limit is hit
r.config({ continueAfterRatelimitError: true });

const writeDataToTxtFile = async (directory, filename, data) => {
    const spinner = ora(`Writing data to ${chalk.magentaBright(`${directory + filename}`)}`).start();
    fs.mkdir(directory, { recursive: true }, (err) => {
        if (err) {
            spinner.fail()
            throw err;
        }

        fs.writeFile(directory + filename, data, err => {
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
    const savedContent = await r.getMe().getSavedContent().fetchAll().catch(() => spinner.fail())
    spinner.succeed();
    let savedContentData = ''
    savedContent.forEach(item => {
        savedContentData += 'https://www.reddit.com' + item.permalink + '\n'
    })
    return savedContentData
}

const getUpvotedContent = async () => {
    const spinner = ora(`Fetching ${chalk.magentaBright('upvoted')} content`).start();
    const upvotedContent = await r.getMe().getUpvotedContent().fetchAll().catch(() => spinner.fail())
    spinner.succeed();
    let upvotedContentData = ''
    upvotedContent.forEach(item => {
        upvotedContentData += 'https://www.reddit.com' + item.permalink + '\n'
    })
    return upvotedContentData
}

const getSubmissionsContent = async () => {
    const spinner = ora(`Fetching ${chalk.magentaBright('submissions')} content`).start();
    const submissionsContent = await r.getMe().getSubmissions().fetchAll().catch(() => spinner.fail())
    spinner.succeed();
    let submissionsContentData = ''
    for (const submission of submissionsContent) {
        submissionsContentData += 'Title: ' + submission.title + '\n'
        submissionsContentData += 'Body: ' + submission.selftext + '\n'
        submissionsContentData += 'Comments:\n'

        // comments
        const comments = await submission.comments.fetchAll()
        comments.forEach(comment => {
            submissionsContentData += '> ' + comment.body.replace(/\n/g, '') + '\n'
        })
        submissionsContentData += '---\n'
    }
    return submissionsContentData
}

const getCommentsContent = async () => {
    const spinner = ora(`Fetching ${chalk.magentaBright('comments')} content`).start();
    const commentsContent = await r.getMe().getComments().fetchAll().catch(() => spinner.fail())
    spinner.succeed();
    let commentsContentData = ''
    for (const comment of commentsContent) {
        commentsContentData += 'Post Title: ' + comment.link_title + '\n'
        commentsContentData += 'Comment: ' + comment.body.replace(/\n/g, '') + '\n'
        commentsContentData += 'Link: https://www.reddit.com' + comment.permalink + '\n'
        commentsContentData += '---\n'
    }
    return commentsContentData
}

const main = () => {

    console.log(heading)

    let rootOutputDirectory = program.outputDir;

    const dataToDownload = program.data.split(',');

    if (dataToDownload.includes('saved')) {
        // saved content
        getSavedContent().then(result => {
            const directory = rootOutputDirectory + '/saved/'
            const filename = 'reddit_saved_permalinks.txt';
            writeDataToTxtFile(directory, filename, result);
        });
    }

    if (dataToDownload.includes('upvoted')) {
        // upvoted content
        getUpvotedContent().then(result => {
            const directory = rootOutputDirectory + '/upvoted/'
            const filename = 'reddit_upvoted_permalinks.txt';
            writeDataToTxtFile(directory, filename, result);
        })
    }

    if (dataToDownload.includes('submissions')) {
        // submissions
        getSubmissionsContent().then(result => {
            const directory = rootOutputDirectory + '/submissions/'
            const filename = 'reddit_submissions.txt';
            writeDataToTxtFile(directory, filename, result);
        })
    }

    if (dataToDownload.includes('comments')) {
        // comments
        getCommentsContent().then(result => {
            const directory = rootOutputDirectory + '/comments/'
            const filename = 'reddit_comments.txt';
            writeDataToTxtFile(directory, filename, result);
        })
    }
}

main();