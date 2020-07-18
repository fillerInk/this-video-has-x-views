const fs = require('fs');
const readline = require('readline')
const { google } = require('googleapis')

const { App } = require("deta");


const express = require('express');


const app = App(express());

require('dotenv').config()

var OAuth2 = google.auth.OAuth2;

var SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtube_nodejs.json';




function start() {
    console.log('inside the start function')
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the YouTube API.
        authorize(JSON.parse(content), updateTitle);
    });
}

function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
    });
}

function updateTitle(auth) {
    var youtube = google.youtube('v3');
    youtube.videos.list({
        auth: auth,
        id: process.env.video_id,
        part: 'snippet,statistics',
    }, function (err, result) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else {
            const video = result.data.items[0]
            console.log(video)

            const { viewCount } = video.statistics
            console.log(viewCount)

            const newTitle = `This video is having ${viewCount} views!`
            //console.log(newTitle)

            video.snippet.title = newTitle

            youtube.videos.update(
                {
                    auth: auth,
                    part: "snippet",
                    resource: {
                        id: process.env.video_id,
                        snippet: {
                            "title": newTitle,
                            "categoryId": "27"
                        }
                    }
                },
                (err, response) => {
                    //console.log(response);
                    if (err) {
                        console.log(`There was an error updating ${err}`)
                        return
                    }
                    if (response.data.items) {
                        console.log("Done")
                    }
                }
            )
        }
    })
}


app.get('/', (req, res) => {
    res.send('Starting..');
});

// app.lib.cron(event => {
//     console.log('Started from cloned repo')
//     start()
//     console.log('completed')
// });

start()

const PORT=3000
if(!process.env.DETA_RUNTIME){
    app.listen(PORT,()=>{
        console.log('Listening to local port')
    })
}
// export 'app'
module.exports = app