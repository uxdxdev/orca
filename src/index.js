#!/usr/bin/env node

const snoowrap = require('snoowrap');
const fs = require("fs");
const { program } = require('commander');
const chalk = require('chalk');

require('dotenv').config()

program
    .name("orca")
    .usage("--user-agent=<string> --client-id=<id> --client-secret=<secret> --refresh-token=<token> --output-dir=output/")
    .helpOption('-h, --help', 'Display setup steps and options')
    .description(`Download your Reddit upvotes, saves, and submissions.

Setup steps:
- Open https://www.reddit.com/prefs/apps/
- Click ${chalk.bold('Create another app')} button
- Pick a name, e.g. ${chalk.bold('Orca app')}
- Select ${chalk.bold('web app')} as the application type
- Set ${chalk.bold('redirect url')} to https://not-an-aardvark.github.io/reddit-oauth-helper/
- Click ${chalk.bold('Create app')} button
- Copy your ${chalk.magenta('client id')}, e.g.

    Orca
    web app
    ${chalk.magenta('Ano2QfJc_BZrVg')} (client id)
    
- Copy your ${chalk.cyan('client secret')}, e.g.

    secret ${chalk.cyan('vaSdsP6352j2nklizCB5Qfdsa')}

- Open https://not-an-aardvark.github.io/reddit-oauth-helper/
- Input your ${chalk.bold('client id')} and ${chalk.bold('client secret')}
- Select ${chalk.bold('Permanent?')}
- Select scopes
    - history
    - identity
    - read
- Click ${chalk.bold('Generate tokens')} button
- Copy your ${chalk.blue('refresh token')}, e.g.

    Refresh token: ${chalk.blue('70162531-R3rT0inhKaoVi1X6mNd2Ei-7BFQ4hA')}

- Run Orca

    orca --user-agent=${chalk.red('Orca app')} \\
    --client-id=${chalk.magenta('Ano2QfJc_BZrVg')} \\
    --client-secret=${chalk.cyan('vaSdsP6352j2nklizCB5Qfdsa')} \\
    --refresh-token=${chalk.blue('70162531-R3rT0inhKaoVi1X6mNd2Ei-7BFQ4hA')} \\
    --output-dir=${chalk.yellow('output/')}

`)
    .requiredOption('--user-agent <string>', 'User agent string to use in requests to the Reddit API. e.g. Orca app')
    .requiredOption('--client-id <id>', 'Reddit application client Id')
    .requiredOption('--client-secret <secret>', 'Reddit application client secret')
    .requiredOption('--refresh-token <token>', 'Refresh token generated from https://not-an-aardvark.github.io/reddit-oauth-helper/')
    .requiredOption('--output-dir <directory>', 'Output directory for data .zip file')

program.parse(process.argv);

const r = new snoowrap({
    userAgent: program.userAgent,
    clientId: program.clientId,
    clientSecret: program.clientSecret,
    refreshToken: program.refreshToken
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

const main = async () => {
    const savedContent = await r.getMe().getSavedContent()
    const upvotedContent = await r.getMe().getUpvotedContent()
    const submissionsContent = await r.getMe().getSubmissions()

    // saved content
    let savedContentData = ''
    savedContent.forEach(item => {
        savedContentData += 'https://www.reddit.com' + item.permalink + '\n'
    })

    let rootOutputDirectory = program.outputDir;


    let directory = rootOutputDirectory + '/saved/'
    let filename = 'reddit_saved_permalinks.txt';
    writeDataToTxtFile(directory, filename, savedContentData);

    // upvoted content
    let upvotedContentData = ''
    upvotedContent.forEach(item => {
        upvotedContentData += 'https://www.reddit.com' + item.permalink + '\n'
    })

    directory = rootOutputDirectory + '/upvoted/'
    filename = 'reddit_upvoted_permalinks.txt';
    writeDataToTxtFile(directory, filename, upvotedContentData);


    // submissions
    let submissionsContentData = '';
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

    directory = rootOutputDirectory + '/submissions/'
    filename = 'reddit_submissions.txt';
    writeDataToTxtFile(directory, filename, submissionsContentData);
}

main();