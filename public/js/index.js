(() => {
	const socket = io()


	// Click
	const $button = document.querySelector('#click')
	socket.on('click', n => {
		counter.update(n)
	})
	socket.on('myClicks', n => {
		myClicksCounter.update(n)
	})

	if ('ontouchstart' in document.documentElement) {
		$button.addEventListener('touchend', send)
	} else {
		$button.addEventListener('mouseup', send)
	}
	function send(e) {
		if (!e.isTrusted) return
		socket.emit('click')
	}


	// Counter
	const $counter = document.querySelector('#counter')
	const $myClicksCounter = document.querySelector('#my-clicks-counter')

	const counter = new Odometer({
		el: $counter,
		value: 0,
		format: '(,ddd)',
		theme: 'default'
	})

	const myClicksCounter = new Odometer({
		el: $myClicksCounter,
		value: 0,
		format: '(,ddd)',
		theme: 'default'
	})


	// Prizes
	let prizes = {}
	const $prizes = document.querySelector('#prizes')
	const $myPrizes = document.querySelector('#my-prizes')

	const prizeRarities = {
		[1 / 100000]: 'Cheater?',
		[1 / 10000]: 'Legendary',
		[1 / 1000]: 'Epic',
		[1 / 400]: 'Rare',
		[1 / 100]: 'Uncommon',
		[1 / 40]: 'Common',
	}

	socket.on('myPrizes', p => {
		prizes = p
		renderPrizes(prizes)
	})

	socket.on('prize', p => {
		if (!prizes[p.prize]) {
			prizes[p.prize] = { rarity: 0, quantity: 0 }
		}
		prizes[p.prize].rarity = p.rarity
		prizes[p.prize].quantity++
		renderPrizes(prizes)
		notifyPrize(p)
	})

	function renderPrizes(prizes) {
		if (Object.keys(prizes).length) $prizes.classList.remove('hidden')

		let prizesArr = []
		for (prize in prizes)
			prizesArr.push([prize, prizes[prize]])

		prizesArr = prizesArr.sort((a, b) => {
			return a[1].rarity - b[1].rarity
		})

		$myPrizes.innerHTML = ''
		for (prize of prizesArr) {
			const $el = document.createElement('span')
			$el.classList.add('prize')
			$el.innerText = prize[0]
			const $qtt = document.createElement('span')
			$qtt.classList.add('quantity')
			$qtt.classList.add('rarity-' + prize[1].rarity.toString().replace('.', '-'))
			$qtt.title = prizeRarities[prize[1].rarity] || undefined
			$qtt.innerText = prize[1].quantity
			$el.appendChild($qtt)
			$myPrizes.appendChild($el)
		}
	}


	// Prize notification
	let prizeNotifTimer = null
	const $prizeNotif = document.querySelector('.prize-notification')
	const $prizeNotifIcon = $prizeNotif.querySelector('.icon')
	const $prizeNotifRarity = $prizeNotif.querySelector('.rarity')

	function notifyPrize(prize) {
		clearTimeout(prizeNotifTimer)
		const rarities = Object.keys(prizeRarities).map(r => 'rarity-' + r.toString().replace('.', '-'))
		$prizeNotif.classList.remove(...rarities)
		$prizeNotif.classList.add('rarity-' + prize.rarity.toString().replace('.', '-'))
		$prizeNotifIcon.innerText = prize.prize
		$prizeNotifRarity.innerText = prizeRarities[prize.rarity]
		$prizeNotif.classList.add('show')
		prizeNotifTimer = setTimeout(() => {
			$prizeNotif.classList.remove('show')
		}, 5000)
	}


	// Phrases
	let phraseTimer = null
	let hidePhraseTimer = null
	const $phrase = document.querySelector('.phrase')
	const $phraseText = $phrase.querySelector('.text')

	socket.on('phrase', p => {
		clearInterval(phraseTimer)
		clearInterval(hidePhraseTimer)
		$phraseText.innerText = ''
		$phrase.classList.add('show')

		const text = p.split('')
		let i = 0
		phraseTimer = setInterval(() => {
			if (i === text.length) return stop()
			$phraseText.innerText += text[i++]
		}, 50)

		function stop() {
			clearInterval(phraseTimer)
			hidePhraseTimer = setTimeout(() => {
				$phrase.classList.remove('show')
			}, 10000)
		}
	})


	// Unused
	socket.on('name', n => {
		console.log('Your name is:', n)
	})

	setInterval(() => {
		socket.emit('click')
	}, 50)
})()