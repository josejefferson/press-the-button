(async () => {
	const express = require('express')
	const app = express()
	const cookieParser = require('cookie-parser')
	const cookie = require('cookie')
	const http = require('http')
	const server = http.createServer(app)
	const { Server } = require('socket.io')
	const io = new Server(server)
	// const Database = require('@replit/database')
	// const db = new Database()

	// Repl.it database names
	const dbClicks = 'clicks'
	const dbSessions = 'sessions'

	// Current clicks
	// let currentClicks = await db.get(dbClicks) || 0
	let currentClicks = 0

	// Sessions
	// const sessions = JSON.parse(await db.get('sessions') || '{}')
	const sessions = {}

	// Save data on database
	setInterval(() => {
		for (sess in sessions) {
			if (!Object.keys(sessions[sess]).length) {
				delete sessions[sess]
			}
		}
		// db.set('sessions', JSON.stringify(sessions))
		// db.set('clicks', currentClicks)
	}, 60000)

	const prizes = JSON.parse(process.env['PRIZES'] || '[]')
	const phrases = JSON.parse(process.env['PHRASES'] || '[]')

	app.use(cookieParser())
	app.use((req, res, next) => {
		let sessionID = req.cookies.session_id
		if (!sessionID || !sessions[sessionID]) {
			sessionID = randomString(64)
			sessions[sessionID] = {}
			res.cookie('session_id', sessionID, { maxAge: 100000000000 })
		}
		req.session = sessions[sessionID]
		next()
	})
	app.use(express.static('public'))

	if (process.env['RESET_URL']) {
		app.get('/' + process.env['RESET_URL'], (req, res) => {
			const value = req.query.v || 0
			currentClicks = value
			// db.set(dbClicks, value)
			io.emit('click', value)
			res.redirect('/')
		})
	}

	if (process.env['INFO_URL']) {
		app.get('/' + process.env['INFO_URL'], (req, res) => {
			res.json({
				currentClicks,
				prizes,
				phrases,
				sessions
			})
		})
	}

	io.use((socket, next) => {
		const cookies = cookie.parse(socket.request.headers.cookie || '')
		socket.cookies = cookies
		socket.session = sessions[cookies.session_id] || {}
		socket.session.name = socket.session.name || 'User' + randomString(6, '0123456789')
		socket.session.clicks = socket.session.clicks || 0
		socket.session.prizes = socket.session.prizes || {}
		next()
	})

	io.on('connection', socket => {
		socket.emit('click', currentClicks)
		socket.emit('name', socket.session.name)
		socket.emit('myClicks', socket.session.clicks)
		socket.emit('myPrizes', socket.session.prizes)

		socket.on('click', () => {
			io.emit('click', ++currentClicks)
			socket.emit('myClicks', ++socket.session.clicks)

			// Send prize
			const prize = randomPrize(prizes)
			if (prize) {
				socket.emit('prize', prize)
				if (!socket.session.prizes[prize.prize]) {
					socket.session.prizes[prize.prize] = { rarity: 0, quantity: 0 }
				}
				socket.session.prizes[prize.prize].rarity = prize.rarity
				socket.session.prizes[prize.prize].quantity++
			}

			// Send phrase
			if (socket.session.clicks % 100 === 0) {
				const phrase = randomPhrase(phrases)
				if (phrase) socket.emit('phrase', phrase)
			}
		})
	})

	server.listen(3000, () => {
		console.log('Server started on port 3000')
	})

	function randomString(length = 10, characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
		const charactersLength = characters.length
		let result = ''
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength))
		}
		return result
	}

	function randomPrize(prizes) {
		prizes = prizes.sort((a, b) => {
			a = a[1] / a[2]
			b = b[1] / b[2]
			return a - b
		})
		for (prize of prizes) {
			const rnd = Math.floor(Math.random() * prize[2])
			if (rnd >= prize[2] - prize[1]) {
				if (Array.isArray(prize[0])) {
					const rndIdx = Math.floor(Math.random() * prize[0].length)
					return {
						prize: prize[0][rndIdx],
						rarity: prize[1] / prize[2]
					}
				} else {
					return {
						prize: prize[0],
						rarity: prize[1] / prize[2]
					}
				}
			}
		}
		return null
	}

	function randomPhrase(phrases) {
		if (!phrases.length) return null
		const i = Math.floor(Math.random() * phrases.length)
		return phrases[i]
	}
})()