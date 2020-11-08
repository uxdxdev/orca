#!/usr/bin/env node

const snoowrap = require('snoowrap');
const fs = require("fs");
const { program } = require('commander');
const chalk = require('chalk');
const boxen = require('boxen');

const clientId = 'Ano5_FAKE_BZrVg'
const clientSecret = 'vfAs98fP_FAKE_lizCB5Qfdsa'
const accessToken = '70162531-R3rT0i_FAKE_Vi1X6mNd2Ei-72dFs4hA'

program
    .name("orca")
    .usage("--data=<string> --client-id=<id> --client-secret=<secret> --access-token=<token> --output-dir=output/")
    .helpOption('-h, --help', 'Display setup steps and options')
    .description(`${boxen(`${chalk.magentaBright('Orca')} - ${chalk.bold('Download your Reddit data.')}`, { padding: 1, margin: 1, borderStyle: 'round' })}
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

orca --data=${chalk.bold('upvoted,saved,submissions,comments')} \\
--output-dir=${chalk.bold('output/')} \\
--client-id=${chalk.magenta(clientId)} \\
--client-secret=${chalk.cyan(clientSecret)} \\
--access-token=${chalk.blue(accessToken)}
`)
    .option('--data <string>', 'Data to download, e.g. upvoted,saved,submissions,comments', 'upvoted,saved,submissions,comments')
    .option('--output-dir <directory>', 'Output directory for data files (.txt)', 'orca-output')
    .requiredOption('--client-id <id>', 'Reddit application client Id')
    .requiredOption('--client-secret <secret>', 'Reddit application client secret')
    .requiredOption('--access-token <token>', 'Access token generated from https://not-an-aardvark.github.io/reddit-oauth-helper/')

program.parse(process.argv);

const r = new snoowrap({
    userAgent: 'Orca app',
    clientId: program.clientId,
    clientSecret: program.clientSecret,
    accessToken: program.accessToken
});

const writeDataToTxtFile = async (directory, filename, data) => {
    fs.mkdir(directory, { recursive: true }, (err) => {
        if (err) throw err;

        fs.writeFile(directory + filename, data, err => {
            if (err) throw err;
            console.log(`Content written to file ${filename}`);
        });
    });
}

const getSavedContent = async () => {
    const savedContent = await r.getMe().getSavedContent()
    let savedContentData = ''
    savedContent.forEach(item => {
        savedContentData += 'https://www.reddit.com' + item.permalink + '\n'
    })
    return savedContentData
}

const getUpvotedContent = async () => {
    const upvotedContent = await r.getMe().getUpvotedContent()
    let upvotedContentData = ''
    upvotedContent.forEach(item => {
        upvotedContentData += 'https://www.reddit.com' + item.permalink + '\n'
    })
    return upvotedContentData
}

const getSubmissionsContent = async () => {
    const submissionsContent = await r.getMe().getSubmissions()
    let submissionsContentData = ''
    for (const submission of submissionsContent) {
        submissionsContentData += 'Title: ' + submission.title + '\n'
        submissionsContentData += 'Body: ' + submission.selftext + '\n'
        submissionsContentData += 'Comments:\n'

        // comments
        const comments = await submission.comments.fetchAll();
        comments.forEach(comment => {
            submissionsContentData += '> ' + comment.body.replace(/\n/g, '') + '\n'
        })
        submissionsContentData += '---\n'
    }
    return submissionsContentData
}

const getCommentsContent = async () => {
    const commentsContent = await r.getMe().getComments()
    let commentsContentData = ''
    for (const comment of commentsContent) {
        commentsContentData += 'Post Title: ' + comment.link_title + '\n'
        commentsContentData += 'Comment: ' + comment.body.replace(/\n/g, '') + '\n'
        commentsContentData += 'Link: https://www.reddit.com' + comment.permalink + '\n'
        commentsContentData += '---\n'
    }
    return commentsContentData
}

const main = async () => {
    let rootOutputDirectory = program.outputDir;

    const dataToDownload = program.data.split(',');

    if (dataToDownload.includes('saved')) {
        // saved content
        let savedContentData = await getSavedContent();
        let directory = rootOutputDirectory + '/saved/'
        let filename = 'reddit_saved_permalinks.txt';
        writeDataToTxtFile(directory, filename, savedContentData);
    }

    if (dataToDownload.includes('upvoted')) {
        // upvoted content
        let upvotedContentData = await getUpvotedContent();
        directory = rootOutputDirectory + '/upvoted/'
        filename = 'reddit_upvoted_permalinks.txt';
        writeDataToTxtFile(directory, filename, upvotedContentData);
    }

    if (dataToDownload.includes('submissions')) {
        // submissions
        let submissionsContentData = await getSubmissionsContent();
        directory = rootOutputDirectory + '/submissions/'
        filename = 'reddit_submissions.txt';
        writeDataToTxtFile(directory, filename, submissionsContentData);
    }

    if (dataToDownload.includes('comments')) {
        // comments
        let commentsContentData = await getCommentsContent();
        directory = rootOutputDirectory + '/comments/'
        filename = 'reddit_comments.txt';
        writeDataToTxtFile(directory, filename, commentsContentData);
    }
}

main();