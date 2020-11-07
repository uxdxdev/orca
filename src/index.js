const snoowrap = require('snoowrap');
const fs = require("fs");

require('dotenv').config()

const r = new snoowrap({
    userAgent: process.env.USER_AGENT,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN
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

    let directory = 'output/saved/'
    let filename = 'reddit_saved_permalinks.txt';
    writeDataToTxtFile(directory, filename, savedContentData);

    // upvoted content
    let upvotedContentData = ''
    upvotedContent.forEach(item => {
        upvotedContentData += 'https://www.reddit.com' + item.permalink + '\n'
    })

    directory = 'output/upvoted/'
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

    directory = 'output/submissions/'
    filename = 'reddit_submissions.txt';
    writeDataToTxtFile(directory, filename, submissionsContentData);

}

main();