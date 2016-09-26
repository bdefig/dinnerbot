'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === '***REMOVED***') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            // sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
            sendRandomRestaurant(sender, text)
        }
    }
    res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN
const yelpClientID = process.env.YELP_CLIENT_ID
const yelpClientSecret = process.env.YELP_CLIENT_SECRET

// function sendWelcomeMessage(sender) {
//     messageData = {
//         text : "Hello, first message"
//     }
//     request({
// 		url:  "https://graph.facebook.com/v2.6/me/thread_settings",
// 		qs: { access_token: token }, 
// 		json: { "setting_type":"call_to_actions",
// 	      "thread_state":"new_thread",
// 	      "call_to_actions":[{"message":{"text":"Hello there!"}}]
// 	    }, function(){
// 	//call back
// 		}
// 	})
// }

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendRandomRestaurant(sender, city) {
	let yelpToken = ''
	let bearerText = ''
	request({
		url: 'https://api.yelp.com/oauth2/token',
		method: 'POST',
		form: {
			grant_type: 'client_credentials',
			client_id: yelpClientID,
			client_secret: yelpClientSecret
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error requesting access token from Yelp: ', error)
		} else if (response.body.error) {
			console.log('Error receiving access token from Yelp: ', response.body.error)
		} else {
			// yelpToken = JSON.stringify(response.body).substring(0, 300)
			// let thisBody = response.body
			// yelpToken = thisBody.access_token
			// yelpToken = JSON.stringify(response).substring(0, 300)
			yelpToken = JSON.parse(body).access_token
			bearerText = 'Bearer ' + yelpToken
			// sendTextMessage(sender, 'Yelp token received')
			// sendTextMessage(sender, JSON.stringify(response).substring(0, 300))
			// sendTextMessage(sender, yelpToken)
			// sendTextMessage(sender, bearerText)
			// sendTextMessage(sender, yelpToken)
		}
	request({
		url: 'https://api.yelp.com/v3/businesses/search',
		// qs: {access_token:yelpToken},
		// access_token: yelpToken,
		headers: {'Authorization': bearerText},
		// Authorization: bearerText,
		method: 'GET',
		json: {
			// access_token: yelpToken,
			'location': city,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending to Yelp: ', error)
		} else if (response.body.error) {
			console.log('Error received from Yelp: ', response.body.error)
		} else {
			text = response.businesses[0].name
			sendTextMessage(sender, text)
		}
	})
	})
	// request({
	// 	url: 'https://api.yelp.com/v3/businesses/search',
	// 	// qs: {access_token:yelpToken},
	// 	// access_token: yelpToken,
	// 	headers: {'Authorization': bearerText},
	// 	// Authorization: bearerText,
	// 	method: 'GET',
	// 	json: {
	// 		// access_token: yelpToken,
	// 		'location': city,
	// 	}
	// }, function(error, response, body) {
	// 	if (error) {
	// 		console.log('Error sending to Yelp: ', error)
	// 	} else if (response.body.error) {
	// 		console.log('Error received from Yelp: ', response.body.error)
	// 	} else {
	// 		text = response.businesses[0].name
	// 		sendTextMessage(sender, text)
	// 	}
	// })
}